/*
	Пикет, обозначаемый полигоном; используется для деления дорог на участки
*/
window.MPicket = class MPicket extends MGeoZone{
	constructor(data, map){
		super(data, map);
		this.minimumNodes = 6;
	}
	
	// подписка объекта на события
	subscribe(){}

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
	}

	areaClickHandler(context){		
		context.objectID = this.objectID;		
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

	hasBorders(){
		return false;
	}

	hasMarkers(){
		return false;
	}

	hasStretchers(){
		return false;
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
		// плашка
		if (this.popup) result.push(this.popup.objectID);
		return result;
	}

	/*
		Пикет не редактируется и не создаётся интерактивно, поэтому методы, отвечающие за анимацию редактирования, границы, стретчеры, добавление точек и т.д. выключены
	*/
	createGhostArea(coords){}
	dragStartHandler(context){}
	dragEndHandler(context){}
	dragHandler(context){}
	createMarkers(){}
	adjustMarkers(){}	
	createBorder(index){}	
	createBorders(){}	
	redrawBorders(){}	
	destroyBorders(){}
	destroyBorder(index){}
	refresh(data){}
	stretch(){}
	freeze(){}	
	pushPoint(coords){}	
	splitBorder(index, coords){}
	traspose(newCenter){}
	addNode(index, coords){}
	stretcherDragHandler(context){}
	stretcherDragStartHandler(context){}
	stretcherDragEndHandler(context){}
}