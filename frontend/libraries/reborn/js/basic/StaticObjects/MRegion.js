window.MRegion = class MRegion extends MGeoZone{
	constructor(data, map){
		super(data, map);		
	}

	/*
		Создание области объекта
	*/
	createArea(coords){
		this.Area = this.map.createPolygon(coords, this, StaticMap.getStyleForObject(this));
		var self = this;
		if (this.isComplete()){
			this.Area.show();
		}
		this.Area.addListener('click', function(context){
			context.objectID = self.objectID;
			self.fire('mapClick', context);
		});
	}

	subscribe(){}

	/*
		Создание маркеров объекта
	*/
	createMarkers(){}

	/*
		Корректирует позицию центрального маркера региона
	*/
	adjustMarkers(){}

	/*
		Создание границы с номером index
	*/
	createBorder(index){}

	/*
		Создание (пересоздание) границ объекта
	*/
	createBorders(){}

	/*
		Полная перерисовка границ объекта
	*/
	redrawBorders(){}

	/*
		Удаление границ объекта
	*/
	destroyBorders(){}

	/*
		Возвращает true, если объект имеет кликабельные границы
	*/
	hasBorders(){
		return false;
	}

	hasMarkers(){
		return false;
	}

	hasStretchers(){
		return false;
	}
}