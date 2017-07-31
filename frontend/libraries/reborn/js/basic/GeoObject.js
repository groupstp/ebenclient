/*
	Абстрактный геообъект
*/
window.GeoObject = class GeoObject extends SmartObject{

	constructor(data, view, master){
		super();
		// ссылка на управляющий объект
		this.master = master;
		// визуальная часть
		this.view = view;
		// внутренний id (readonly)
		Object.defineProperty(this, 'objectID', {value: data.objectID, writable: false});
		// uuid объекта в БД
		this.uuid = data.uuid || null;
		// ID родительского объекта
		this.parentID = data.parentID || null;
		// дочерние объекты
		this.children = [];		
		//this.children = data.children ? JSON.parse(JSON.stringify(data.children)) : [];
		// уровень объекта в иерархии
		this.level = 1;
		// координаты точек, формирующих контур объекта
		this.latLngs = data.nodes || [];
		// свойства объекта (поля и значения)
		this.props = data.props || {};		
		// минимальное кол-во вершин для отображения
		this.minimumNodes = 0;
		// изменён объект или нет
		this.isModified = false;
		// поле, показывающее, что данный объект является временным и его не надо сохранять в базу
		this.isDummy = false;
		// если у объекта есть визуальная часть, то подписываемся на её события
		if (this.view){
			var self = this;
			// развыбирание объекта на карте
			this.view.addListener('unselectView', function(context){
				self.master.fire('staticObjectUnselect', context);
			});
			// скрытие объекта
			this.view.addListener('hideView', function(context){
				self.master.fire('staticObjectHide', context);
			});
		}
	}

	getLatLngs(){
		return this.latLngs;
	}

	setLatLngs(ll){
		this.latLngs = ll;
		this.isModified = true;
		if (this.view) this.view.setLatLngs(ll);
	}

	moveNodeTo(index, coords){
		this.latLngs[index] = coords;
		this.isModified = true;
		if (this.view) this.view.moveNodeTo(index, coords);
	}

	removeNode(index){
		this.latLngs.splice(index, 1);
		this.isModified = true;
		if (this.view) this.view.removeNode(index);		
	}

	pushPoint(ll){
		this.latLngs.push(ll);
		this.isModified = true;
		if (this.view) this.view.pushPoint(ll);	
	}

	addNode(index, coords){
		this.latLngs.splice(index, 0, coords);
		this.isModified = false;
		if (this.view) this.view.addNode(index, coords);	
	}	

	getBounds(){}

	getCenter(){		
		return this.master.map.staticObjects[this.objectID].getCenter();
	}

	isComplete(){
		return (this.getLatLngs().length >= this.minimumNodes);
	}

	getConvertedData(){
		let children = this.children.map(function(item){return item.getConvertedData()});		
		let res = {
			className: this.getClassName(),
			objectID: this.objectID,
			nodes: this.latLngs.slice(),
			uuid: this.uuid,
			parentUUID: this.parent ? this.parent.uuid : null,
			parentObjectID: this.parent ? this.parent.objectID : null,
			children: children,
			groupID: this.group ? this.group.objectID : null,
			isComplete: this.isComplete()
		};
		return res;
	}	
}