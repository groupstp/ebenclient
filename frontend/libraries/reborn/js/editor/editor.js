/*
	Класс, ответственный за редактирование
*/
window.Editor = class Editor extends SmartObject{
	constructor(){
		super();
		var self = this;		
		// id собираемого в данный момент объекта
		this.inAssemble = null;
		this.pendingObject = null;
		// хэш, хранящий id и класс собираемого в данный момент объекта
		this.newObject = null;
		// ссылка на объект ГЗМ
		this.master = null;
		// статусы редактора
		this.statuses = {
			idle: 0,
			waitForFirst: 1,
			waitForNext: 2,
			waitForInit: 3,
			handlers: {
				0: null,
				1: null,
				2: null,
				3: this.getInitNode,
			},
			switchers: {
				0: this.setIndle,
				1: this.waitForFirst,
				2: this.waitForNext,
				3: this.waitForInit
			}
		}		
		this.status = this.statuses.idle;
		// история изменений
		this.history = new History();
		this.history.addListener('logChange', function(context){
			self.master.fire('logChange', context);
		})
	}

	// откат предыдущего действия
	undo(){
		this.history.undo();
	}

	// повтор отменённого действия
	redo(){
		this.history.redo();
	}

	getStatus(){
		return this.status;
	}

	// переключает редактор и карту в новый статус
	switchStatus(status){
		this.status = status;
		var self = this;
		// достаём подготовительную функцию для нового статуса и вызываем её		
		if (this.statuses.switchers[status]) this.statuses.switchers[status].call(this);		
		// сбрасываем обработчики клика у карты и заменяем на обработчик, прикрепленный к статусу
		// если его нет, используем обработчик по умолчанию
		this.master.map.clearListeners('mapClick');
		if (this.statuses.handlers[status]){
			var handler = this.statuses.handlers[status];
			this.master.map.addListener('mapClick', function(context){
				handler.call(self, context);
			});
		} else {
			this.master.map.addListener('mapClick', function(context){
				this.defaultClickHandler(context);
			});
		}		
	}

	// возвращает список всех несохранённых изменений
	// в виде хэша
	// новые, изменённые, удаленные объекты
	// в новые объекты попадают только те, у которых: нет uuid && (нет родителя || родитель имеет uuid || родитель имеет isDummy = true)
	getChanges(){
		let changes = {new: [], modified: [], removed: []};
		let noParent, confirmedParent, dummyParent;
		for (let objectID in this.master.staticObjects){
			noParent = !this.master.staticObjects[objectID].parent;
			confirmedParent = !noParent && this.master.staticObjects[objectID].parent.uuid;
			dummyParent = !noParent && this.master.staticObjects[objectID].parent.isDummy;
			if (!this.master.staticObjects[objectID].uuid && ( noParent || confirmedParent || dummyParent )){
				changes.new.push(this.master.staticObjects[objectID].getConvertedData());
			} else if (this.master.staticObjects[objectID].isModified){
				changes.modified.push(this.master.staticObjects[objectID].getConvertedData());
			}
		}
		for (let objectID in this.master.confirmedObjects){
			if (!this.master.staticObjects[objectID]){
				changes.removed.push(this.master.confirmedObjects[objectID]);
			}
		}		
		return changes;
	}

	// применяет изменения после записи в БД
	commitChanges(ids){
		// если переданы ID объектов из БД, то записываем их в объекты
		if (ids){
			for (let objectID in ids){
				this.master.setUUID(objectID, ids[objectID]);				
			}
		}
		// после сохранения изменённых объектов больше нет
		for (let objectID in this.master.staticObjects){
			this.master.staticObjects[objectID].isModified = false;
		}
	}

	/*
		Методы, воздействующие на объекты. ID объекта в них не передаётся, т.к. метод считывает ID выбранного объекта с карты во избежание недоразумений.
	*/

	// удаление выделенного объекта
	deleteObject(){
		var self = this;
		var selected = this.master.map.getSelectedStaticObjects();		
		let cmd = new MacroCommand(this.master);
		for (let i in selected){			
			cmd.addCommand(new DeleteCommand(self.master, self.master.staticObjects[selected[i]].getConvertedData()));			
		}		
		cmd.execute();
		this.history.write(cmd);		
	}

	markObject(){
		let s = this.master.map.getSelectedStaticObjects(), objectID = null;
		if (s.length === 1){
			objectID = s[0];
			if (this.master.map.staticObjects[objectID].startMarking)
				this.master.map.staticObjects[objectID].startMarking();
		}
	}

	unmarkObject(){
		let s = this.master.map.getSelectedStaticObjects(), objectID = null;
		if (s.length === 1){
			objectID = s[0];
			if (this.master.map.staticObjects[objectID].stopMarking)
				this.master.map.staticObjects[objectID].stopMarking();
		}
	}

	splitObject(){
		const picketLength = 100, picketWidth = 40;
		/*
			Получаем ссылку на выбранный объект, проверяем можно ли его разбить
			для этого он должен иметь нанесённую пользователем разметку
		*/
		let 
			s = this.master.map.getSelectedStaticObjects(), 
			segments = [], 
			calc = GeoZoneManager.getCalculator(), 
			ll= null,
			obj = null,
			d = 0,
			picketNodes = null;
		if (s.length === 1){
			obj = this.master.map.staticObjects[s[0]];
			if (obj.marks && obj.marks.markers.length === 2){
				// формируем структуру данных, описывающую сегменты размеченной области
				for (let i = 0; i < obj.markedArea.segments.length; i++){
					ll = obj.markedArea.segments[i].getLatLngs();
					segments.push({
						index: /*i*/ obj.markedArea.segments[i].index, // индексация идет с 0, т.к. в markedArea индексы сдвинуты
						startsAt: obj.markedArea.segments[i].startsAt,
						endsAt: obj.markedArea.segments[i].endsAt,
						start: calc.fromLatLngToXY(ll[0]),
						end: calc.fromLatLngToXY(ll[1]),
						angle: calc.getAngle(ll[0], ll[1])
					});
				}				
				d = obj.marks.markers[0].distance;
				let macros = new MacroCommand();
				// если мы имеем дело с временным ЛО (напр. с треком), то вместо пикетов рисуем ГЗ
				let className = this.master.staticObjects[obj.objectID].isDummy ? 'GeoZone' : 'Picket';
				// сегменты записаны
				// рисуем пикеты в цикле, d = <расстояние с которого началась разметка>
				while (d < obj.markedArea.length ){
					picketNodes = Picket.calculate(segments, d, Math.min(picketLength, obj.markedArea.length - d), picketWidth);					
					let objData = {className: className, objectID: this.master.getNewID(), nodes: picketNodes, props: {}};
					let cmd = new QuickCreateCommand(this.master, objData, false, false);
					macros.addCommand(cmd);					
					d += picketLength;					
				}
				macros.execute();
				this.history.write(macros);
				if (obj.isMarking) obj.stopMarking();
			}
		}
	}

	// перевод выделенного объекта в режим растягивания 
	stretchObject(){		
		// считываем ID выделенного объекта
		var ID = this.master.map.getSelectedStaticObjects();		
		if (ID.length === 1){
			ID = ID[0];			
			// переводим представление объекта в режим растягивания
			this.master.map.stretchObject(ID);			
		}
			
	}

	// замораживание выделенного объекта, вывод из режима растягивания
	freeze(){
		// выводим карту из режима растягивания объекта
		this.master.map.freeze();		
	}	

	// разбивка выделенного пикета
	splitPicket(divisions){}

	// объединение выделенных пикетов
	unitePickets(){}

	// растягивание выделенного пикета вдоль
	stretchAlong(back, forth){}

	// объединение выделенных объектов в группу
	groupObjects(){
		let s = this.master.map.getSelectedStaticObjects(), objData = null, cmd = null;
		if (s.length > 1){
			objData = {className: 'Group', objectID: this.master.getNewID(), props: {}, children: s};
			cmd = new GroupCommand(this.master, objData);
			cmd.execute();
			this.history.write(cmd);
		}
	}

	// расформирование выделенной группы объектов
	ungroupObjects(){
		// считываем выделенные объекты, если это группа, то расформировываем её
		let s = this.master.map.getSelectedStaticObjects(), cmd = null;		
		if (s.length === 1 && this.master.map.staticObjects[s[0]].getClassName() === 'MGroup'){
			cmd = new UngroupCommand(this.master, this.master.staticObjects[s[0]].getConvertedData());
			cmd.execute();
			this.history.write(cmd);
		}
	}

	/*
		Возвращает true, если возможно быстрое создание заготовки для объектов className
	*/
	quickCreateEnabled(className){		
		let supported = ['GeoZone', 'PointObject', 'CapitalPlaneObject', 'CapitalPointObject', 'CircleGeoZone'];
		return (supported.indexOf(className) >= 0);
	}
	/*
		Переводим редактор в режим поточечного создания нового статического объекта
	*/
	startNewStaticObject(className){
		// пытаемся "освободить" карту: остановить текущее редактирование, развыделить объекты и т.д.
		// если получилось - всё ок, идём дальше, если нет - кидаем ошибку (incompleteError, например)
		// генерируем ID нового объекта и запоминаем его класс
		this.newObject = {objectID: this.master.getNewID(), className: className};
		// переключаем статус редактора и карты, переводя их в режим ожидания новой точки
		if (this.getStatus() !== this.statuses.waitForFirst){
			this.switchStatus(this.statuses.waitForFirst);
		}		
	}

	getFirstNode(context){
		/*
			проверяем возможность добавить первую точку в это место
			ыщ-ыщ-ыщ
			вложенность не реализована, поэтому пока не работает
		*/
		// создаём сырой объект
		var imprint = {className: this.newObject.className, objectID: this.newObject.objectID, nodes: [context.coords], props: {}};
		// создаём команду для создания объекта
		// выполняем команду
		// записываем её в историю
	}

	getNextNode(context){
		/*
			проверяем возможность добавить очередную точку в это место
			ыщ-ыщ-ыщ
			вложенность не реализована, поэтому пока не работает			
		*/
		// создаём команду
		// выполняем
		// пишем в историю
	}

	getInitNode(context){
		let 
			parentObjectID = context.objectID,
			newObjectCoords = [],
			ok = true,
			objData = null;
		// в зависимости от класса собираемого объекта генерируем координаты для заготовки
		switch (this.pendingObject.className){
			case 'GeoZone':
					newObjectCoords = GeoZone.calculate(context.coords, GeoZone.getDefaultDimension());
					objData = {className: 'GeoZone', objectID: this.pendingObject.objectID, nodes: newObjectCoords, props: {}};
					if (parentObjectID) objData.parentObjectID = parentObjectID;
			case 'CapitalPointObject':				
				break;
			case 'PointObject':
			case 'CapitalPointObject':
				break;
			case 'CircleGeoZone':
				objData = {
					className: 'CircleGeoZone', 
					objectID: this.pendingObject.objectID, 
					center: context.coords, 
					radius: CircleObject.getDefaultRadius(),
					props: {}
				};			
				break;
		}
		if (ok){			
			let cmd = new QuickCreateCommand(this.master, objData);
			cmd.execute();
			this.history.write(cmd);
		}		
	}

	/*
		Функция, обрабатывающая клик по карте для получения координат точки, добавляемой в геообъект
	*/
	getNewPoint(context){
		let 
			noObject = !this.inAssemble,
			noPoint = !context.coords;		
		// выходим из функции, если 
		// в данный момент не идет создание объекта,
		// в событии не переданы координаты		
		if (noObject || noPoint) return;
		// если клик был по объекту, а не по свободному участку
		// проверяем, предполагают ли типы кликнутого и создаваемого объекта вложение второго в первый
		if (context.objectID && this.canInclude(context.objectID, this.inAssemble)){
			// если у объекта уже есть другой родитель, кидаем ошибку и выходим из функции
			if (this.master.staticObjects[this.inAssemble].parentID && this.staticObjects[this.inAssemble].parentID != context.objectID) {
				this.master.throwError('alreadyHasParent', {});
				return;
			}
			// если у нового объекта нет родителя, пристегиваем его к кликнутому объекту
			if (!this.master.staticObjects[this.inAssemble].parentID) {
				//this.staticObjects[context.objectID].addChild(this.staticObjects[this.inAssemble]);
				// меняем уровень объекта на карте, если необходимо
			}
		}
		// проверяем создаваемый объект с новой точкой на конфилкты, если нужно (пока неактивно)
		/*
		if (this.staticObjects[this.inAssemble].isConflicting()){
			var newCoords = this.staticObjects[this.inAssemble].concat(context.coords);
			this.checkConflicts(newCoords);
		}
		*/		
		if (this.master.staticObjects[this.inAssemble].getClassName() === 'SimpleRoute' && context.objectID){
			context.coords = this.master.staticObjects[context.objectID].getCenter();
		}
		// если мы до сих пор не вышли из функции, добавляем в объект новую точку и обновляем его представление на карте
		this.master.staticObjects[this.inAssemble].pushPoint(context.coords);		
		//this.master.map.staticObjects[this.inAssemble].pushPoint(context.coords);
	}

	/*
		Переводит редактор в режим быстрого добавления заготовки статического объекта
		className - класс создаваемого объекта (не все классы поддерживаются)		
	*/
	quickCreateStaticObject(className){		
		// если быстрое создание объектов с указанным классом не поддерживается, выходим
		if (!className || !this.quickCreateEnabled(className)) {
			this.master.throwError('Quick create is not supported.', {className: className});
			return;
		}
		// генерируем ID нового объекта и запоминаем его класс
		this.pendingObject = {objectID: this.master.getNewID(), className: className};
		// переводим карту и редактор в соответствующий режим ожидания клика
		if (this.getStatus() !== this.statuses.waitForInit){
			this.switchStatus(this.statuses.waitForInit);
		}		
	}

	/*
		Создает заготовку объекта вокруг полученной в событии точки
	*/
	getInitPoint(context){	
		let 
			noObject = !this.inAssemble,
			noPoint = !context.coords,
			newObjectCoords = [];
		// выходим из функции, если 
		// в данный момент не идет создание объекта,
		// в событии не переданы координаты		
		if (noObject || noPoint) return;
		// в зависимости от класса собираемого объекта генерируем координаты для заготовки
		switch (context.className){
			case 'GeoZone':
					newObjectCoords = GeoZone.calculate(context.coords, GeoZone.getDefaultDimension());
			case 'CapitalPointObject':				
				break;
			case 'PointObject':
			case 'CapitalPointObject':
				break;
			case 'CircleGeoZone':
				break;
		}
		// когда координаты получены:
		// Создать экземпляр объекта на карте
		this.master.map.addComplexObject(context.className, {objectID: this.inAssemble, coords: newObjectCoords});
		// Дать карте команду на выделение и растягивание нового объекта
		this.master.map.selectObject(this.inAssemble);
		this.master.map.stretchObject(this.inAssemble);
	}


	/*	Переходы
			Первая точка
				Всем полигонам крест, стиль на прозрачный
				Карте крест
			Начальная точка
				Всем полигонам крест, стиль на прозрачный
				Карте крест
			Следующая точка
				// у карты обычный курсор, у родительского полигона, если он есть, - крест, у всех остальных обычный

		Обработчики
			Первая точка
				Получили координату, проверили на пригодность, если прокатило, создаём в переменной объект с 1 точкой
				Создаём команду, отдаём ей созданный объект
					Команда выкладывает объект на карту, выделяет и включает растягивание
					Затем команда должна перевести редактор в режим ожидания следующих точек
			Начальная точка
			Следующая точка
				Получили координату, проверили, если прокатило, создаём команду
				Команда переходит к объекту, выделяет, растягивает, пушит точку в объект
				Затем команда чекает статус редактора, если не тот, ставит ожидание следующей точки

		При пуше точек в объект у родительского полигона должен быть курсор-крестик, где осуществлять замену - в переходе редактора в новый режим или в команде растягивания объекта?
		команда растягивания
			не всякое растягивание переключает курсор
			чтобы определить, надо или нет
				входной параметр при вызове (сверка состояния объекта не годится)
		переход в режим
			при переходе должно быть известно, какой объект родительский
				чекнуть, какой выделен, найти парент

	*/

	waitForInit(){
		/*			
			Всем полигонам крест, стиль на прозрачный
			Карте крест			
		*/		
		this.master.map.setCursorStyle('crosshair');
		/*
		this.master.map.staticObjects.forEach(function(elem){
			if (elem.getArchetype() === 'Polygon'){
				elem.setCursorStyle('crosshair');
			}
		});
		*/
	}

	setIndle(){
		this.master.map.setCursorStyle('default');
	}

	waitForFirst(){
		/*			
			Всем полигонам крест, стиль на прозрачный
			Карте крест			
		*/
		this.master.map.setCursorStyle('crosshair');
		/*
		this.master.map.staticObjects.forEach(function(elem){
			if (elem.getArchetype() === 'Polygon'){
				elem.setCursorStyle('crosshair');
			}
		});
		*/
	}

	waitForNext(){
		this.master.map.setCursorStyle('default');
		/*
		this.master.map.staticObjects.forEach(function(elem){
			if (elem.getArchetype() === 'Polygon'){
				elem.setCursorStyle('default');
			}
		});
		*/
	}

	radiusChange(context){		
		var 
			ID = context.objectID,			
			newRadius = context.radius,
			oldRadius = this.master.staticObjects[ID].getRadius();
		// проверка на конфликты - пока отсутствует
		var ok = true;
		if (ok){
			let cmd = new ChangeRadiusCommand(this.master, {oldRadius: oldRadius, newRadius: newRadius, objectID: ID}, this.status);
			cmd.execute();
			this.history.write(cmd);
		} else {
			// если проверка не прошла, то кидаем событие с ошибкой			
			this.fire('incorrectStretch', {});
		}
	}

	moveNodeVisual(context){		
		var 
			ID = context.objectID,
			index = context.index,
			newCoords = context.coords,
			oldCoords = this.master.staticObjects[ID].getLatLngs()[index];
		// проверка на конфликты - пока отсутствует
		var ok = true;
		if (ok){
			let cmd = new StretchCommand(this.master, {nodeIndex: index, newCoords: newCoords, oldCoords: oldCoords, objectID: ID}, this.status);
			cmd.execute();
			this.history.write(cmd);
		} else {
			// если проверка не прошла, то кидаем событие с ошибкой			
			this.fire('incorrectStretch', {});
		}
	}

	/*
		Обработчик директивного перемещения вершины
	*/
	moveNodeDirect(context){
		var 
			ID = context.objectID,
			index = context.index,
			newCoords = context.coords,
			oldCoords = this.master.staticObjects[ID].getLatLngs()[index];
		// проверка на конфликты - пока отсутствует
		var ok = true;
		if (ok){
			let cmd = new StretchCommand(this.master, {nodeIndex: index, newCoords: newCoords, oldCoords: oldCoords, objectID: ID}, this.status);
			cmd.execute();
			this.history.write(cmd);
		} else {
			// если проверка не прошла, то кидаем событие с ошибкой
			this.fire('incorrectStretch', {});
		}
	}

	removeNode(context){
		// проверка - можно ли удалять вершину - пока не работает
		var ok = true;
		if (ok){
			let coords = this.master.staticObjects[context.objectID].getLatLngs()[context.index];
			let cmd = new RemoveNodeCommand(this.master, {objectID: context.objectID, nodeIndex: context.index, coords: coords}, this.getStatus());
			cmd.execute()
			this.history.write(cmd);
		} else {
			this.fire('incorrectNodeRemove', {})
		}
	}

	splitBorderVisual(context){		
		let cmd = new SplitBorderCommand(this.master, {objectID: context.objectID, coords: context.coords, borderIndex: context.borderIndex, nodeIndex: context.nodeIndex}, this.getStatus());
		cmd.execute();
		this.history.write(cmd);		
	}

	transpose(context){
		let ok = true;
		if (ok){
			let cmd = new TransposeCommand(this.master, {objectID: context.objectID, newCenter: context.newCenter, oldCenter: context.oldCenter}, this.getStatus());
			cmd.execute();
			this.history.write(cmd);
		} else {
			// выброс ошибки
			
		}
	}
}