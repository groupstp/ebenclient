/*
	Полигональный капитальный объект
*/
window.MCapitalPlaneObject = class MCapitalPlaneObject extends MGeoZone{
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
}