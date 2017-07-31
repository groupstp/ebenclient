/*
	Геозона, обозначаемая полигоном
*/
window.MGeoZone = class MGeoZone extends StaticObject{
	constructor(data, map){
		super(data, map);		
		this.minimumNodes = 3;
		this.weight = 0;
		this.props = data.props || null;
		if (data.nodes){			
			this.createArea(data.nodes);			
		} else this.isVisible = false;
		// если в объекте достаточно точек, создаем маркеры и границы
		if (this.isComplete()){
			this.preparePopup();
			this.createBorders();
			this.createMarkers();
			this.createStretchers();
		}
		this.subscribe();
		this.children = [];		
	}

	// подписка объекта на события
	subscribe(){
		this.addListener('stretcherDrag', function(context){
			this.stretcherDragHandler(context);
		});
		this.addListener('stretcherDragStart', function(context){
			this.stretcherDragStartHandler(context);
		});
		this.addListener('stretcherDragEnd', function(context){
			this.stretcherDragEndHandler(context);
		});
	}

	/*
		Создание области объекта
	*/
	createArea(coords){	
		this.Area = this.map.createPolygon(coords, this, StaticMap.getStyleForObject(this));
		this.popup = null;
		var self = this;
		if (this.isComplete()){
			this.Area.show();			
		}
		this.Area.addListener('click', function(context){			
			self.areaClickHandler(context)
		});
		this.createGhostArea(coords);		
	}

	createGhostArea(coords){
		this.ghostArea = this.map.createPolygon(coords, this, StaticMap.getStyleCollection().ghostArea.transparent);
		this.ghostArea.show();
		var self = this;
		this.ghostArea.addListener('dragstart', function(context) {self.dragStartHandler(context)});
		this.ghostArea.addListener('dragend', function(context) {self.dragEndHandler(context)});
		this.ghostArea.addListener('drag', function(context) {self.dragHandler(context)});
		this.ghostArea.addListener('click', function(context){
			self.areaClickHandler(context);
		});
	}

	dragStartHandler(context){		
		this.hideStretchers();
		this.hideBorders();
		this.hideMarkers();
		this.ghostArea.setStyle(StaticMap.getStyleCollection().ghostArea.solid);
	}

	dragEndHandler(context){
		this.ghostArea.setStyle(StaticMap.getStyleCollection().ghostArea.transparent);
		this.ghostArea.setLatLngs(this.Area.getLatLngs());
		this.showStretchers();
		this.showBorders();
		this.showMarkers();
		this.map.fire('objectDragEnd', {objectID: this.objectID, newCenter: context.center, oldCenter: this.getCenter()});
	}

	dragHandler(context){}

	areaClickHandler(context){		
		context.objectID = this.objectID;
		console.log(this.objectID)		;
		this.fire('mapClick', context);
	}

	// меняет стиль курсора при прохождении через полигон
	// работает только когда полигон закончен (имеет 3 и более точек)
	setCursorStyle(style){
		if (this.isComplete()){
			this.Area.setCursorStyle(style);
		}
	}

	/*
		Создание маркеров объекта
	*/
	createMarkers(){
		// выходим из метода, если объект не завершен
		if (this.isComplete()){
			this.markers = [this.map.createMarker(this.Area.getCenter(), this, StaticMap.getStyleCollection().markers.defaultMarker)];
			var self = this;
			this.markers[0].addListener('click', function (context) {
				self.popup.show();
			});			
		}
	}

	/*
		Корректирует позицию центрального маркера
	*/
	adjustMarkers(){
		if (this.markers.length){
			this.markers[0].setLatLngs(this.ghostArea.getCenter());
		}
	}

	/*
		Создание границы с номером index
	*/
	createBorder(index){
		var
			self = this,
			ll = this.getLatLngs(),
			from = ll[index],
			/*
				Сторона        0 1 2 3
				Конечная точка 1 2 3 0
			*/
			to = ll[(index+1) % ll.length],			
			border = this.map.createLine(from, to, this, StaticMap.getStyleCollection().defaultBorder);			
			border.index = index;
			border.addListener('click', function(context){				
				self.map.fire('splitBorderVisual', {objectID: self.objectID, borderIndex: this.index, nodeIndex: this.index+1, coords: context.coords});				
			});
		return border;
	}

	/*
		Создание (пересоздание) границ объекта
	*/
	createBorders(){
		// если в полигоне не хватает вершин, стороны не создаются
		if (this.isComplete()){
			this.borders = [];
			for (var i=0; i<this.Area.getLatLngs().length; i++){
				this.borders.push(this.createBorder(i));
			}			
		}
	}

	/*
		Полная перерисовка границ объекта
	*/
	redrawBorders(){
		// удаляем стороны
		this.destroyBorders();		
		// если в полигоне не хватает вершин, стороны не создаются
		// создаем их заново
		this.createBorders();		
		// показываем, если надо
		if (this.isSelected && this.isVisible && this.isComplete()){
			this.showBorders();
		}
	}

	/*
		Удаление границ объекта
	*/
	destroyBorders(){
		for (var i=0; i<this.borders.length; i++){
			this.map.removePrimitive(this.borders[i]);
		}
		this.borders = [];
	}

	// удаление 1 границы объекта
	destroyBorder(index){
		// удаляет границу с карты
		this.map.removePrimitive(this.borders[i]);
		// убирает ссылку из массива
		this.borders.splice(index, 1);
		// индекс оставшихся границ не меняется
	}

	/*
		Возвращает true, если объект имеет кликабельные границы
	*/	
	hasBorders(){
		return true;
	}

	hasMarkers(){
		return true;
	}

	hasStretchers(){
		return true;
	}

	/*
		Подготавливает плашку для вывода свойств объекта
	*/
	preparePopup(){
		if (this.props && Object.keys(this.props).length){
			var self = this;
			this.popup = this.map.createHashPopup(this.getCenter(), this, this.props, StaticMap.getStyleCollection().popups.popupOffsets.bigOffset, false);
			this.popup.addListener('fieldsUpdate', function(context){
				for (var i = 0; i < context.data.length; i++){
					self.props[context.data[i].fieldName] = context.data[i].value;
				}				
			});
		}
	}	

	/*
		Обновляет объект по пришедшим данным
	*/
	refresh(data){
		if (this.Area){
			this.Area.setLatLngs(data.coords);
		} else {
			this.createArea(data.coords);
		}
		if (this.isComplete()){
			if (!this.isVisible){
				this.Area.show();
				this.isVisible = true;
			}
			this.redrawBorders();
			// меняем положение маркера, т.к. контур объекта мог измениться
			this.adjustMarkers();
		}
	}

	stretch(){
		super.stretch();
		if (this.ghostArea) {
			this.ghostArea.enableDragging();
		} else {
			this.Area.enableDragging();
		}
	}

	freeze(){
		super.freeze();
		if (this.ghostArea) {
			this.ghostArea.disableDragging();
		} else {
			this.Area.disableDragging();
		}
	}

	/*
		Добавляет объекту точку с координатами coords в позицию index. Если позиция не указана, добавляет в конец.
		Если точка добавляется в середину, то происходит расщепление одной границы на 2;
		При добавлении новой точки добавляется новый стретчер.
	*/
	pushPoint(coords){
		var ll = this.getLatLngs();
		ll.push(coords);
		// если объект не завершен
		if (!this.isComplete()){
			// если область отсутствует, создаем её
			if (!this.Area){
				this.createArea([coords]);
			} else {
				// иначе переписываем координаты
				this.Area.setLatLngs(ll);
				this.ghostArea.setLatLngs(ll);
				// если после добавления очередной точки объект завершился, создаем границы и маркеры и выводим их, если объект выделен
				if (this.isComplete()){
					// показываем сам объект
					this.show();
					// создаем границы и маркеры
					this.createBorders();
					this.createMarkers();
					// если объект выделен в данный момент, показываем границы и маркеры
					if (this.isSelected){
						this.showMarkers();
						this.showBorders();
					}
				}
			}
			// добавляем стретчер и его плашку
			this.addStretcher(ll.length-1, ll.length-1);
			this.addStretcherPopup(ll.length-1, ll.length-1);
		} else {
			// если объект завершен, то разделяем его последнюю границу новой точкой
			this.splitBorder(this.borders.length-1, coords);
		}
	}

	/*
		Расщепление границы с номером index путем добавления точки с к-тами coords
	*/
	splitBorder(index, coords){
		// если границы с таким индексом нет, выходим из метода
		if (!this.borders[index]) return;
		let	pointIndex = index + 1;
		// добавляем точку в позицию		
		this.Area.insertPoint(pointIndex, coords);
		// удалить границу index
		this.map.removePrimitive(this.borders[index]);
		// соединить точки, оставшиеся без границ
		this.borders.splice(index, 1, this.createBorder(index));
		this.borders.splice(index+1, 0, this.createBorder(index+1));
		// сдвигаем индексы идущих следом границ на 1
		for (var i=index+2; i<this.borders.length; i++){
			this.borders[i].index = this.borders[i].index + 1;
		}
		// если объект выделен и видим, то созданные границы показываются
		if (this.isVisible && this.isSelected){
			this.borders[index].show();
			this.borders[index+1].show();
		}
		// добавляем новый стретчер
		this.addStretcher(pointIndex, pointIndex);
		this.addStretcherPopup(pointIndex, pointIndex);		
	}

	/*
		Полный перенос объекта
	*/
	traspose(newCenter){
		const 
			oldCenter = this.getCenter(),
			delta = [newCenter[0] - oldCenter[0], newCenter[1] - oldCenter[1]],
			coords = this.getLatLngs();
		let newCoords = coords.map((latlon) => { return [ latlon[0]+delta[0], latlon[1]+delta[1] ]; });
		this.Area.setLatLngs(newCoords);
		this.ghostArea.setLatLngs(newCoords);
		this.adjustMarkers();
		this.redrawBorders();
		this.createStretchers();
	}

	addNode(index, coords){		
		this.Area.insertPoint(index, coords);
		this.redrawBorders();
		this.createStretchers();
		this.adjustMarkers();		
	}

	// обработчики перетаскивания маркера растягивания
	stretcherDragHandler(context){
		if (this.isComplete()){
			var
				ll = this.getLatLngs();
			// изменяем контур
			ll[context.index] = context.coords;		
			this.ghostArea.setLatLngs(ll);
			var adjucentBorders = this.getAdjacentBorders(context.index);
			// двигаем границы (у следующей меняется начало, у предыдущей - конец)
			if (adjucentBorders.hasOwnProperty('next')){
				let bnext = this.borders[adjucentBorders.next].getLatLngs();
				bnext[0] = context.coords;
				this.borders[adjucentBorders.next].setLatLngs(bnext);
			}
			if (adjucentBorders.hasOwnProperty('prev')){
				let bprev = this.borders[adjucentBorders.prev].getLatLngs();
				bprev[1] = context.coords;
				this.borders[adjucentBorders.prev].setLatLngs(bprev);
			}
			this.adjustMarkers();
		}			
	}

	stretcherDragStartHandler(context){
		if (this.isComplete()){
			var adjucentBorders = this.getAdjacentBorders(context.index);
			if (adjucentBorders.hasOwnProperty('next')){
				this.borders[adjucentBorders.next].setStyle(StaticMap.getStyleCollection().dottedBorder);
			}
			if (adjucentBorders.hasOwnProperty('prev')){
				this.borders[adjucentBorders.prev].setStyle(StaticMap.getStyleCollection().dottedBorder);
			}
			this.ghostArea.setStyle(StaticMap.getStyleCollection().ghostArea.solid);
			//this.ghostArea.show();
		}			
	}

	stretcherDragEndHandler(context){		
		if (this.isComplete()){
			var adjucentBorders = this.getAdjacentBorders(context.index);		
			if (adjucentBorders.hasOwnProperty('next')){
				this.borders[adjucentBorders.next].setStyle(StaticMap.getStyleCollection().defaultBorder);
			}
			if (adjucentBorders.hasOwnProperty('prev')){
				this.borders[adjucentBorders.prev].setStyle(StaticMap.getStyleCollection().defaultBorder);
			}
			this.ghostArea.setStyle(StaticMap.getStyleCollection().ghostArea.transparent);
			//this.ghostArea.hide();
		}			
		context.objectID = this.objectID;
		this.map.fire('moveNodeVisual', context);
	}

	/*
		Перезаписывает координаты объекта
	*/
	setLatLngs(ll){
		if (this.Area){
			this.Area.setLatLngs(ll);
			this.redrawBorders();
			this.createStretchers();			
			this.ghostArea.setLatLngs(this.Area.getLatLngs());
			this.adjustMarkers();
		}
	}

	addChild(geoZone){
		this.children.push(geoZone);
		var self = this;
		// при удалении потомка убираем его из списка чилдренов и чекаем вес, чтобы стиль изменился, если нужно
		this.children[this.children.length-1].addListener('delete', function(context){
			self.excludeChild(context.objectID);
			self.checkWeight();
		});
		// если вес потомка изменился, то мог поменяться и вес родителя, проверяем
		this.children[this.children.length-1].addListener('changeweight', function(context){
			self.checkWeight();
		});
		self.checkWeight();
	}

	excludeChild(objectID){
		let i = 0, done = false
		while (i < this.children.length && !done){
			if (this.children[i].objectID === objectID){
				this.children.splice(i, 1);
				done = true;
			}
			i++;
		}
		
	}

	checkWeight(){
		// пробегаем по чилдренам, считаем вес
		let w = -1;
		for (let i = 0; i < this.children.length; i++){
			w = Math.max(w, this.children[i].weight);
		}
		w += 1;
		// если отличается - меняем, перекрашиваем, поджигаем событие
		if (w !== this.weight){
			this.weight = w;
			this.Area.setStyle(StaticMap.getStyleForObject(this));
			this.fire('changeweight');
		}
	}

	getArchetype(){
		return 'Polygon';
	}

	/*
		Возвращает ID всех примитивов, из которых состоит объект
	*/
	grabIDs(){
		var result = [];
		// ID области
		result.push(this.Area.objectID);
		result.push(this.ghostArea.objectID);
		// стретчеры
		for (var i = 0; i < this.stretchers.length; i++){
			result.push(this.stretchers[i].objectID);
		}
		// плашки стретчеров
		for (var i = 0; i < this.stretchers.length; i++){
			result.push(this.stretcherPopups[i].objectID);
		}
		// границы
		for (var i = 0; i < this.borders.length; i++){
			result.push(this.borders[i].objectID);
		}
		// маркеры
		for (var i = 0; i < this.markers.length; i++){
			result.push(this.markers[i].objectID);
		}
		// плашка
		if (this.popup) result.push(this.popup.objectID);
		return result;
	}
}