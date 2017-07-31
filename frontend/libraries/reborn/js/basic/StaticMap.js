/*
	Абстрактный класс, отвечающий за статическую карту
*/
window.StaticMap = class StaticMap extends SmartObject{	

	constructor(container){
		super();		
		// платформа, на которой реализована карта
		this.platform = 'Dummy';		
		// если есть контейнер, цепляем его DOM-элемент
		if (document){
			this.container = document.getElementById(container);
		} else this.container = null;
		// ID выделенных объектов
		this.selectedStaticObjects = [];
		this.selectedDynamicObjects = [];
		// хэш для статических объектов (геозоны, дороги и т.д.)
		this.staticObjects = {};
		// хэш для динамически отслеживаемых объектов
		this.dynamicObjects = {};
		// хэш для примитивных объектов (полигоны, линии, маркеры)
		this.primitives = {};
		// переменная для генерации ID новых примитивов		
		this.primitivesCounter = 0;		
		// центр карты по умолчанию
		this.defaultCenter = [66.78889,93.77528];		
		// зум по умолчанию
		this.defaultZoom = 3;
		this.tilesUrl = 'http://Dummymaphasnotiles';
		// положение курсора
		this.cursorLocation = [null, null];
		// радиус обозреваемой области
		this.areaRadius = null;
		// центр обозреваемой области
		this.areaCenter = null;
		this.calculator = GeoZoneManager.getCalculator();
		this.subscribe();
	}

	/*
		Статический метод, возвращающий коллекцию стилей объектов
	*/
	static getStyleCollection(){
		return {
			markers: {
				defaultMarker: {icon: 'fa fa-map-marker', className: 'gzmBaloon', pattern: 'baloon', color: '#FF5252'},				
				defaultStretcher: {icon: 'fa fa-circle', className: 'gzmStretcher', pattern: 'symmetric', color: '#2196F3'},
				directionArrow: {icon: 'fa fa-arrow-right', className: 'gzmArrow', pattern: 'arrow'}
			},
			ghostArea: {
				solid:       {color: '#B71C1C', opacity: 0.3, borderWeight: 0}, 
				transparent: {color: '#000000', opacity: 0, borderWeight: 0}
			},
			markedArea : {
				line:   {color: '#8A2BE2', weight: 4, opacity: 0, dashArray: null},
				marker: {icon: 'fa fa-map-marker', className: 'gzmBaloon', pattern: 'baloon', color: '#8A2BE2'},
			},
			popups:{
				popupOffsets: {
					smallOffset: {offset: {x: 0, y: -5}},
					bigOffset: {offset: {x: 0, y: -30}}
				}
			},
			routes: {
				factRoute: {
					common:   {color: '#B71C1C', weight: 4, opacity: 0, dashArray: null},
					selected: {color: '#F44336', weight: 4, opacity: 0, dashArray: null}
				},
				plannedRoute: {color: '#008000', weight: 4, opacity: 0, dashArray: null}
			},
			road: {color: '#FFFF00', weight: 4, opacity: 0, dashArray: null},
			geoZone: {
				defaultGeoZone: {
					common:   {color: '#EF5350', opacity: 0.5, borderWeight: 0},
					selected: {color: '#D32F2F', opacity: 0.5, borderWeight: 0}
					/*
					common:   {color: '#2196F3', opacity: 0.5, borderWeight: 0},
					selected: {color: '#3949AB', opacity: 0.5, borderWeight: 0}
					*/
				},
				weight:
					[
						{common: {color: '#EF5350', opacity: 0.5, borderWeight: 0}, selected: {color: '#D32F2F', opacity: 0.5, borderWeight: 0}}, // 0 красная
						{common: {color: '#42A5F5', opacity: 0.5, borderWeight: 0}, selected: {color: '#1976D2', opacity: 0.5, borderWeight: 0}}, // 1 синяя
						{common: {color: '#FFA726', opacity: 0.5, borderWeight: 0}, selected: {color: '#F57C00', opacity: 0.5, borderWeight: 0}}, // 2 оранжевая
						{common: {color: '#AB47BC', opacity: 0.5, borderWeight: 0}, selected: {color: '#7B1FA2', opacity: 0.5, borderWeight: 0}}, // 3 фиолетовая

						{common: {color: '#2196F3', opacity: 0.5, borderWeight: 0}, selected: {color: '#3949AB', opacity: 0.5, borderWeight: 0}}, // 4
						{common: {color: '#2196F3', opacity: 0.5, borderWeight: 0}, selected: {color: '#3949AB', opacity: 0.5, borderWeight: 0}}, // 5
						{common: {color: '#2196F3', opacity: 0.5, borderWeight: 0}, selected: {color: '#3949AB', opacity: 0.5, borderWeight: 0}} // 6
					]				
			},
			region: {
				defaultRegion: {color: '#616161', opacity: 0.1, borderWeight: 1, borderColor: '#000000'}
			},
			capitalPlaneObject: {
				common:   {color: '#616161', opacity: 0.8, borderWeight: 1, borderColor: '#FFFFFF'},
				selected: {color: '#212121', opacity: 0.8, borderWeight: 1, borderColor: '#FFFFFF'}
			},
			circle: {
				default: {
					common:   {color: '#2196F3', opacity: 0.5, borderWeight: 0, borderColor: '#000000', dashArray: '5, 10'},
					selected: {color: '#3949AB', opacity: 0.5, borderWeight: 0, borderColor: '#000000', dashArray: '5, 10'}
				},
				interactive: {
					common:   {color: '#2196F3', opacity: 0.5, borderWeight: 1, borderColor: '#000000', dashArray: '5, 10'},
					selected: {color: '#3949AB', opacity: 0.5, borderWeight: 5, borderColor: '#B71C1C',  dashArray: null}
				}
			},
			/*
			picketStyle: {fillColor: 'yellow', fillOpacity: 0.8, color: 'black', weight: 1, strokeOpacity: 1},			
			chosenPicketStyle: {fillColor: 'orange', fillOpacity: 0.8, color: 'black', weight: 1, strokeOpacity: 1},
			*/
			picket: {
				common:   {color: '#FFFF00', opacity: 0.8, borderWeight: 1, borderColor: '#000000'},
				selected: {color: '#FFA500', opacity: 0.8, borderWeight: 1, borderColor: '#000000'}
			},
			defaultBorder: {color: '#B71C1C', weight: 5, opacity: 0, dashArray: null},
			dottedBorder:  {color: '#B71C1C', weight: 5, opacity: 0, dashArray: '5, 10'},
			label: {
				align: {
					hor: {
						left: 0, 
						center: 1, 
						right: 2
					},
					vert: {
						top: 0, 
						middle: 1, 
						bottom: 2
					}					
				},				
				picketLabel: {},
				geoZoneLabel: {},
				defaultLabel: {}
			},
			dynamicObjects: {
				default: {
					common: {
						marker: {icon: 'fa fa-circle fa-3x', className: 'gzmDynamic', pattern: 'dynamic', color: '#000000'},
						label: {text: 'color: #000000; font-size: 14px; font-weight: normal;', align: [1,0]},
					},
					selected: {
						marker: {icon: 'fa fa-circle fa-3x', className: 'gzmDynamic', pattern: 'dynamic', color: '#FF0000'},
						label: {text: 'color: #000000; font-size: 14px; font-weight: bold;', align: [1,0]}
					}

				},
				truck: {
					common: {
						marker: {icon: 'fa fa-truck fa-3x', className: 'gzmDynamic', pattern: 'dynamic', color: '#000000'},
						label: {text: 'color: #000000; font-size: 14px; font-weight: normal;', align: [1,0]},
					},
					selected: {
						marker: {icon: 'fa fa-truck fa-3x', className: 'gzmDynamic', pattern: 'dynamic', color: '#FF0000'},
						label: {text: 'color: #000000; font-size: 14px; font-weight: bold;', align: [1,0]}
					}

				}
			}
		}
	}

	static getStyleForObject(obj){
		var 
			style = {},
			collection = StaticMap.getStyleCollection();
		switch (obj.getClassName()) {
			case 'MGeoZone':
				let 
					weight = obj.weight <= 6 ? obj.weight : 6,
					selector = obj.isSelected ? 'selected' : 'common';					
				style = collection.geoZone.weight[weight][selector];				
				break;
			case 'MCircleGeoZone':
				if (obj.isSelected)					
					style = collection.circle.interactive.selected				
				else			
					style = collection.circle.interactive.common				
				break;
			case 'MCircleObject':
				if (obj.isSelected)					
					style = collection.circle.default.selected				
				else			
					style = collection.circle.default.common				
				break;
			case 'MRegion':
				style = collection.region.defaultRegion;
				break;
			case 'MCapitalPlaneObject':
				if (obj.isSelected) 
					style = collection.capitalPlaneObject.selected
				else
					style = collection.capitalPlaneObject.common;
				break;
			case 'MPicket':
				if (obj.isSelected) 
					style = collection.picket.selected
				else
					style = collection.picket.common;
				break;
			case 'MFactRoute':
				if (obj.isSelected)
					style = collection.routes.factRoute.selected
				else 
					style = collection.routes.factRoute.common;
					
				break;
			case 'MPlannedRoute':
				style = collection.routes.plannedRoute;
				break;
			case 'MRoad':
				style = collection.road;
				break;
			case 'DynamicObject':
				if (obj.isSelected)
					style = collection.dynamicObjects.default.selected
				else
					style = collection.dynamicObjects.default.common;
				break;
			case 'DTruck':
				if (obj.isSelected)
					style = collection.dynamicObjects.truck.selected
				else
					style = collection.dynamicObjects.truck.common
		}		
		return style;
	}

	setCursorStyle(style){}

	/*
		Возвращает зум
	*/
	getZoom(){
		return null;
	}

	getAreaRadius(){
		return this.areaRadius;
	}

	getAreaCenter(){
		return this.areaCenter;
	}

	calcAreaRadius(){}

	calcAreaCenter(){}

	getCursorLocation(){
		// возвращаем криповую копию массива, чтобы его нельзя было изменить
		return [this.cursorLocation[0], this.cursorLocation[1]];
	}
	

	
	addComplexObject(className, data){
		var newObj = null;
		var self = this;

		if (className !== 'MGroup'){
			newObj = eval('new M'+className+'(data, this)');
		} else {
			let deployData = JSON.parse(JSON.stringify(data));
			deployData.children = [];
			for (var i = 0; i < data.children.length; i++){
				deployData.children.push(this.staticObjects[data.children[i]]);
			}
			newObj = new MGroup(deployData, this);
		}
		// добавляем объекту обработчик клика (передаёт событие наверх, в ГЗМ)
		newObj.addListener('mapClick', function(context){
			self.fire('mapClick', context);
		});
		// добавляем линейному объекту обработчик нанесения разметки
		if (newObj.getArchetype() === 'Line'){
			// установка одного маркера
			newObj.addListener('markPlaced', function(context){
				self.fire('markPlaced', context);
			});
			// установка разметки
			newObj.addListener('markupComplete', function(context){				
				self.fire('markupComplete', context);
			});
		}
		this.staticObjects[data.objectID] = newObj;
		return newObj;
	}

	/*
		Стирает объект с карты
	*/
	eraseStaticObject(ID){
		var ids = this.staticObjects[ID].grabIDs();
		for (var i = 0; i < ids.length; i++){			
			this.removePrimitive(this.primitives[ids[i]]);
		}
		this.staticObjects[ID].fire('delete', {objectID: ID});
		this.staticObjects[ID] = null;
		let index = this.selectedStaticObjects.indexOf(ID);
		if (index >= 0){
			this.selectedStaticObjects.splice(index, 1);
		}		
	}

	eraseDynamicObject(uuid){		
		var ids = this.dynamicObjects[uuid].grabIDs();		
		for (var i = 0; i < ids.length; i++){
			this.removePrimitive(this.primitives[ids[i]]);
		}
		this.dynamicObjects[uuid] = null;
		let index = this.selectedDynamicObjects.indexOf(uuid);
		if (index >= 0){
			this.selectedDynamicObjects.splice(index, 1);
		}
	}

	disbandGroup(objectID){
		this.staticObjects[objectID].disband();
		this.staticObjects[objectID] = null;
	}

	hideStaticObject(id){
		if (this.staticObjects[id].isVisible) this.staticObjects[id].hide();
	}

	showStaticObject(id){
		if (!this.staticObjects[id].isVisible) this.staticObjects[id].show();
	}

	// фокус на объект
	// выбирает объект, развыбирая и замораживая предыдущий выделенный
	// перемещает камеру на объект, зумирует карту под него
	focus(objectID){
		let 
			isStatic = this.staticObjects[objectID],
			isDynamic = this.dynamicObjects[objectID];			
		if (isStatic){
			let b = this.staticObjects[objectID].getBounds();
			this.fitTo(b);
		} else this.setView(this.dynamicObjects[objectID].position);		
		this.selectObject(objectID, false);
	}

	// переход к объекту и зум карты под него
	goToObject(objectID){		
		this.fitTo(this.staticObjects[objectID].getBounds());
	}

	// проверяет, помещается ли объект в обозреваемую область карты
	hasFullVisionOn(location){
		/*
			Найти расстояние между центрами
			Оно должно быть <= разнице между радиусом карты и радиусом объекта
		*/
		/*let d = this.calculator.getDistance(location.center, this.areaCenter);		
		return d <= (this.areaRadius - location.actualRadius);*/
		let b = this.getBounds();
		return b.includes(location);

	}

	// проверяет, попадает ли точка в обозреваемую область карты
	hasVisionOn(coords){
		//return (this.calculator.getDistance(coords, this.areaCenter) < this.areaRadius);
		return this.getBounds().contains(coords);
	}

	// развыбирает статический объект
	unselectStaticObject(id){
		// исключаем объект из списка выбранных
		this.selectedStaticObjects.splice(this.selectedStaticObjects.indexOf(id), 1);
		// вызываем метод, изменяющий отображение объекта и кидающий событие о развыбирании
		this.staticObjects[id].unselect();
	}

	// развыбирает динамический объект
	unselectDynamicObject(id){
		// исключаем объект из списка выбранных
		this.selectedDynamicObjects.splice(this.selectedDynamicObjects.indexOf(id), 1);
		// изменяем отображение объекта
		this.dynamicObjects[id].unselect();		
	}
	
	/* Снимает выделение со всех объектов */
	dropSelection(){
		this.dropSelectionStatic();
		this.dropSelectionDynamic();		
	}

	// снимает выделение со статических объектов
	dropSelectionStatic(){
		let s = this.selectedStaticObjects.slice();		
		for (var i = 0; i < s.length; i++){
			this.unselectStaticObject(s[i]);
		}
		s = null;
	}

	// снимает выделение с динамических объектов
	dropSelectionDynamic(){
		let s = this.selectedDynamicObjects.slice();
		for (var i = 0; i < s.length; i++){
			this.unselectDynamicObject(s[i]);
		}
		s = null;
	}

	/*
		Возвращает массив с ID выбранных объектов
	*/
	getSelectedStaticObjects(){
		return this.selectedStaticObjects;
	}

	getLastSelectedObject(){
		return this.selectedStaticObjects[this.selectedStaticObjects.length - 1] || this.selectedDynamicObjects[this.selectedDynamicObjects.length-1] || null;
	}

	/*
		Выбирает объект по id, addict - накопительное выделение
	*/	
	selectObject(objectID, addict){
		let 
			isStatic = this.staticObjects[objectID],
			isDynamic = this.dynamicObjects[objectID],
			objectLink = null;			
		// если выбирается статический объект
		if (isStatic){
				// развыбираем динамические объекты
				this.dropSelectionDynamic()
			// если выделение не накопительное (через ctrl), то сбросить выделение со статических объектов
			if (!addict && this.selectedStaticObjects.length > 0) {
				this.dropSelectionStatic();
			}
			objectLink = this.staticObjects[objectID];
			this.selectedStaticObjects.push(objectID);
		} else if (isDynamic){
			this.dropSelection();
			objectLink = this.dynamicObjects[objectID];
			this.selectedDynamicObjects.push(objectID);
		}
		objectLink.select();	
		// кидаем событие
		var context = {
			message: 'Some object was selected',
			objectInfo: {
				objectID: objectLink.objectID,				
				className: objectLink.getClassName(),
				center: objectLink.getCenter(),
				//props: JSON.parse(JSON.stringify(this.staticObjects[this.getLastSelectedObject()].props))
			},
			objectsCount: isStatic ? this.getSelectedStaticObjects().length : 1
		};
		if (objectLink.uuid) context.uuid = objectLink.uuid
		this.fire('select', context);	
	}

	/*
		Переводит объект в режим растягивания
	*/
	stretchObject(objectID){
		this.staticObjects[objectID].stretch();
	}

	/*
		Обработчик клика по карте по умолчанию (выбирает/развыбирает объекты)
	*/
	defaultClickHandler(context){	
		let
			dynamicObjectClicked = context.uuid,
			staticObjectClicked = context.objectID,			
			objectID = null
		// если клик был по объекту, выбираем его, иначе сбрасываем выделение
		if (staticObjectClicked || dynamicObjectClicked){
			if (staticObjectClicked) {
				if (this.staticObjects[context.objectID].group)
					objectID = this.staticObjects[context.objectID].group.objectID
				else objectID = context.objectID;
			}
			else objectID = context.uuid;
			this.selectObject(objectID, context.ctrlKey);					
		} else this.dropSelection();
	}

	/*
		Стандартные обработчики событий карты
	*/
	subscribe(){
		var self = this;
		this.addListener('mapClick', this.defaultClickHandler);		
	}

	/* 
		Возвращает платформу, на которой реализована карта
	*/
	getPlatform(){
		return this.platform;
	}

	/*
		Загружает тайлы карты
	*/
	loadTiles(){}

	/*
		Конвертирует обобщенный стиль в тот вид, который понятен карте
	*/
	convertStyle(rawStyle){
		return rawStyle;
	}

	/*
		Создаёт средствами карты иконку по описанию из стиля
	*/
	convertIcon(iconStyle){
		return iconStyle
	}

	/*
		Подгоняет зум карты, центрируя её на координатах latlng и задавая радиус охвата в километрах;
		Возможен вызов без параметров, в этом случае центровка карты производится по статическим объектам на ней.
	*/
	setView(latlng, radius){}

	/*
		Подгоняет область обзора карты по имеющимся на ней статическим объектам
	*/
	fitByObjects()	{
		let b = null;
		for (let id in this.staticObjects){			
			if (!b) {				
				b = this.staticObjects[id].getBounds();
			} else {
				b = b.unite(this.staticObjects[id].getBounds());
			}
		}
		if (b){			
			this.fitTo(b);
		}
	}

	// у абстрактной карты нет нативных границ
	checkNativeBounds(obj){return false;}

	/*
		Подгоняет область обзора карты по заданным границам (платформенно-зависимый метод)
	*/
	fitTo(bounds){}

	/*
		Добавляет простую линию. Возвращает ссылку на созданный объект.
	*/
	createLine(from, to, owner, style){}

	/*
		Добавляет сегмент - линию, в свойствах которой прописаны отметки расстояния её начала и конца. Возвращает ссылку на созданный объект.
	*/
	createSegment(from, to, owner, style){}

	/*
	Рисует простую окружность. Возвращает ссылку на созданный объект.
	*/
	createCircle(center, radius, owner, style){}

	/*
	Рисует простой полигон. Возвращает ссылку на созданный объект.
	*/
	createPolygon(coords, owner, style){}

	/*
		Добавляет на карту маркер. Возвращает ссылку на созданный объект.
	*/
	createMarker(point, owner, style){}

	/*
		Добавляет на карту плашку. Возвращает ссылку на созданный объект.
	*/
	createPopup(point, owner, content, style, readOnly){}

	createHashPopup(point, owner, content, style, readOnly){}

	createStretcherPopup(point, owner, content, style, readOnly, index){}

	/*
		Удаляет с карты примитив
	*/
	removePrimitive(obj){
		this.primitives[obj.objectID].hide();
		this.primitives[obj.objectID] = null;
	}

	/*
		Выводит карту из режима редактирования
	*/
	freeze(){
		// убираем обработчики клика по карте, мы больше не получаем данные от кликов
		this.clearListeners('mapClick');
		// ставим дефолтный обработчик
		this.addListener('mapClick', this.defaultClickHandler);
		// замораживаем все выделенные объекты, если они есть
		if (this.selectedStaticObjects.length){
			for (var i = 0; i < this.selectedStaticObjects.length; i++){
				this.staticObjects[this.selectedStaticObjects[i]].freeze();
			}
		}
	}	
}