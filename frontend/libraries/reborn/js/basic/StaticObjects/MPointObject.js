/*
	Точечный объект, обозначаемый маркером
*/
window.MPointObject = class MPointObject extends StaticObject{

	constructor(data, map){
		super(data, map);
		this.minimumNodes = 1;
		if (data.coords){
			this.createArea(data.coords);
			this.subscribe();
		} else this.isVisible = false;
	}

	createArea(coords){
		this.Area = this.map.createMarker(coords, this, StaticMap.getStyleCollection().markers.defaultMarker, this.isStretching);
		var self = this;
		if (this.isComplete()){
			this.Area.show();			
		}		
		this.Area.addListener('click', function(context){
			context.objectID = self.objectID;
			self.fire('mapClick', context);
		});
	}

	/*
		В отличии от других типов объектов, добавление точки перезаписывает координаты полностью (точка одна)
	*/	
	pushPoint(coords, index){		
		if (this.isComplete()){
			this.Area.setLatLngs(coords);			
		} else {
			this.createArea(coords);
		}		
	}

	freeze(){		
		this.isStretching = false;
		this.Area.disableDragging();
	}

	getArchetype(){
		return 'Point';
	}

	grabIDs(){
		var result = [];
		result.push(this.Area.objectID);
		if (this.popup) result.push(this.popup.objectID);
		return result;
	}
}