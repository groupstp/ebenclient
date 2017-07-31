class MapEvent{
	constructor(map){
		this.map = map;
		this.name = '';
		this.context = {};
	}
}

class ObjectSelectionEvent extends MapEvent{
	constructor(map){
		super();
		this.name = 'objectSelected';
		let 
			objectID = this.map.getSelectedObjects()[0],
			objectType = this.map.staticObjects[objectID].getClassName(),
			center = this.map.staticObjects[objectID].getCenter(),
			props = JSON.parse(JSON.stringify(this.this.map.staticObjects[objectID].props)),
			objectsCount = 1,
			message = 'Some object was selected';

		this.context = {
			message: message,
			objectsCount: objectsCount,
			objectInfo: {
				objectID: objectID,
				objectType: objectType,
				center: center,
				props: props,
			}
		}		
	}
}

class CursorMoveEvent extends MapEvent{
	constructor(map){
		super();
		this.name = 'cursorMoved';
		this.context.coords = this.map.getCursorLocation();
	}
}