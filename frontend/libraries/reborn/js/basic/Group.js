window.Group = class Group extends GeoObject{

	constructor(data, master){		
		super(data, master);
		// у группы нет координат
		this.latLngs = [];
		this.children = data.children;
		for (var i = 0; i < this.children; i++){
			this.children[i].group = this;
		}
	}

	/*
		Расформировывает группу без удаления чилдренов
	*/
	disband(){
		for (var i = 0; i < this.children.length; i++){
			this.children[i].group = null;
		}
		this.children = [];		
	}

	// будет доработан
	getBounds(){}

	getCenter(){		
		return [];
	}

	isComplete(){
		return true;
	}	

	/*
		У группы нет собственной видимой части, поэтому
			нет координат;
			нельзя добавлять/удалять точки;			
	*/

	getLatLngs(){return this.latLngs;}
	setLatLngs(ll){}
	moveNodeTo(index, coords){}
	removeNode(index){}
	pushPoint(ll){}
	addNode(index, coords){}
}