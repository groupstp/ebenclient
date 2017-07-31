/*
	Круглая геозона
*/
window.MCircleObject = class MCircleObject extends StaticObject{
	constructor(data, map){
		super(data, map);
		this.minimumNodes = 1;
		this.radius = data.radius;
		this.center = data.center;
		if (this.radius && this.center){
			this.createArea();
			this.preparePopup();			
			this.createMarkers();
			this.createGhostArea();			
		} else this.isVisible = false;		
	}

	setStyle(style){
		if (this.Area){
			this.Area.setStyle(style);
		}
	}

	getLatLngs(){
		var ll = [];		
		if (this.Area){			
			ll.push(this.Area.getCenter());			
		}
		return ll;
	}

	getArchetype(){
		return 'Circle';
	}

	setCenter(newCenter){
		this.Area.setCenter(newCenter);
		this.center = newCenter;
		this.ghostArea.setCenter(newCenter);
		this.adjustMarkers();		
		this.createStretchers();
	}

	transpose(newCenter){
		this.setCenter(newCenter);
	}

	setRadius(newradius){
		this.Area.setRadius(newradius);
		this.radius = newradius;
		this.ghostArea.setRadius(newradius);		
		this.createStretchers();
	}	

	/*
		Переводит объект в режим растягивания
	*/
	stretch(){
		super.stretch();		
	}

	/*
		Выводит объект из режима растягивания
	*/
	freeze(){
		super.freeze();		
	}

	createArea(){
		this.Area = this.map.createCircle(this.center, this.radius, this, StaticMap.getStyleForObject(this));
		//
		this.popup = null;
		var self = this;
		this.Area.show();
		this.Area.addListener('click', function(context){			
			self.areaClickHandler(context);
		});		
	}

	createGhostArea(){
		this.ghostArea = this.map.createCircle(this.center, this.radius, this, StaticMap.getStyleCollection().ghostArea.transparent);
		this.ghostArea.show();
		var self = this;
		this.ghostArea.addListener('dragstart', function(context) {self.dragStartHandler(context)});
		this.ghostArea.addListener('dragend', function(context) {self.dragEndHandler(context)});
		this.ghostArea.addListener('drag', function(context) {self.dragHandler(context)});
		this.ghostArea.addListener('click', function(context){				
			self.areaClickHandler(context);
		});
	}

	/*
		Создание плашки
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
		Создание рамки
	*/
	createBorders(){}

	destroyBorders(){}

	showBorders(){}

	hideBorders(){}

	redrawBorders(){}

	/* Создание маркеров растягивания */
	createStretchers(){}

	destroyStretchers(){}

	showStretchers(){}

	hideStretchers(){}

	/*
		Создание маркеров объекта
	*/
	createMarkers(){
		// выходим из метода, если объект не завершен
		if (this.isComplete()){
			this.markers = [this.map.createMarker(this.Area.getCenter(), this, StaticMap.getStyleCollection().markers.defaultMarker)];
			var self = this;
			this.markers[0].addListener('click', function (context) {
				if (self.popup) self.popup.show();
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

	// клик по области
	areaClickHandler(context){		
		context.objectID = this.objectID;
		this.fire('mapClick', context);
	}

	// начало перетаскивания
	dragStartHandler(context){
		this.hideStretchers();
		this.hideBorders();
		this.hideMarkers();
		this.ghostArea.setStyle(StaticMap.getStyleCollection().ghostArea.solid);		
	}

	// конец перетаскивания
	dragEndHandler(context){
		this.ghostArea.setStyle(StaticMap.getStyleCollection().ghostArea.transparent);
		this.ghostArea.setCenter(this.Area.getCenter());
		this.showStretchers();
		this.showBorders();
		this.showMarkers();
		this.map.fire('objectDragEnd', {objectID: this.objectID, newCenter: context.center, oldCenter: this.getCenter()});
	}

	// перетаскивание
	dragHandler(context){}

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
		/*for (var i = 0; i < this.stretchers.length; i++){
			result.push(this.stretcherPopups[i].objectID);
		}*/
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