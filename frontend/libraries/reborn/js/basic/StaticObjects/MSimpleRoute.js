/*
	Маршрут, соединяющий контрольные точки прямыми линиями.
	Создание: поточечно, развертывание;	
	Можно растягивать, выделять, удалять, скрывать.
	Приклеивается к объектам;
*/
window.MSimpleRoute = class MSimpleRoute extends MLinearObject{
	constructor(data, map){
		super(data, map);
		this.subscribe();
	}

	/*createArea(coords){
		var self = this;
		this.Area = this.map.createPolyline(coords, this, StaticMap.getStyleForObject(this));
		if (this.isComplete()){
			this.Area.show();
		}
		this.Area.addListener('click', function(context){
			context.objectID = self.objectID;
			self.fire('mapClick', context);
		});		
	}*/

	subscribe(){
		super.subscribe();
		var self = this;
		this.map.addListener('zoom', function(context){
			if (context.zoom >= 14 && self.arrows.length){				
					self.showArrows();				
			} else {
				self.hideArrows();
			}
		});
	}
}