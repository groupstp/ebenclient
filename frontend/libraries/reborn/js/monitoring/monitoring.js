/*
	Класс, отвечающий за отслеживание объектов
*/
window.Monitor = class Monitor extends SmartObject{
	constructor(master){
		super();
		this.master = master;
		this.trackingObjects = {};
	}
	/* 
		Добавляет в мониторинг объект для отслеживания,
		включающий в себя маршрут, подвижный объект для показа перемещений
		data = {			
			uuid: ***,
			track : {
				plan:{
					coords: []
				},
				fact: {
					coords: [],
					stops: []
				}
			},
			position: [lat, lng]
		}
	*/
	addTrackingObject(data){
		// собираем объект из трека и маркера
		// собираем трек из плана и факта
		var track = null, plan = null, fact = null, buf = null, dynamic = null, self = this;
		if (data.track){
			if (data.track.plan){
				buf = data.track.plan;
				buf.objectID = this.master.getNewID();
				this.master.deployObject('PlannedRoute', buf);
				plan = this.master.map.staticObjects[buf.objectID];
			}
			if (data.track.fact){
				buf = data.track.fact;
				buf.objectID = this.master.getNewID();
				this.master.deployObject('FactRoute', buf);
				fact = this.master.map.staticObjects[buf.objectID];
			}			
			if (plan || fact){
				track = new Track(plan, fact);				
			}
		}		
		let 
			position = data.currentPosition || null,
			hint = data.markerHint || null,
			title = data.title || null,
			props = data.props || null;			
		if (data.className){
			switch (data.className){
				case 'Truck':				
					dynamic = new DTruck(data.uuid, this.master.map, position, hint, title, props);					
					break;
			}
		} else {
			dynamic = new DynamicObject(data.uuid, this.master.map, position, hint, title, props);
		}		
		dynamic.addListener('mapClick', function(context){
			self.master.map.fire('mapClick', context);
		});
		this.master.map.dynamicObjects[data.uuid] = dynamic;
		this.trackingObjects[data.uuid] = new TrackingObject(data.uuid, track, dynamic);
		return this.trackingObjects[data.uuid];
	}

	deleteTrackingObject(ID){
		// получаем ID объектов, из которых состоит отслеживаемый объект
		var ids = this.trackingObjects[ID].grabIDs();		
		// обращаемся к ГЗМ и удаляем эти объекты
		this.master.deleteStaticObject(ids.plan);
		this.master.deleteStaticObject(ids.fact);
		this.master.map.eraseDynamicObject(ids.dynamic);
	}

	updateAll(data){
		for (var uuid in data){
			this.trackingObjects[uuid].updatePosition(data[uuid]);
		}
	}

	updateByID(ID, data){

	}
}

/*
	Класс объектов отслеживания
	Включает всё необходимое для ведения онлайн-мониторинга перемещающегося объекта (человека, автомобиля и т.д.)
		Маршрут (плановый и фактический с остановками)
		Подвижный маркер для отображения на карте текущего местоположения объекта
	Что умеет
		Управление треком (показать, спрятать плановый/фактический маршрут или остановки)
		Обновление данных о своём местоположении в реальном времени (обновляется трек и позиция маркера)
		Выделение		
		Убирание с карты	
*/
window.TrackingObject = class TrackingObject extends SmartObject{
	constructor(uuid, track, dynamic){
		super();
		this.uuid = uuid;		
		this.track = track;		
		this.dynamic = dynamic;
	}

	setTrack(track){
		this.track = track;
	}

	updatePosition(coords){
		this.dynamic.moveTo(coords);
	}

	updateTrack(data){}

	update(data){}

	show(){}

	hide(){}

	subscribe(){}

	grabIDs(){
		var result = {fact: null, plan: null, dynamic: null};		
		if (this.track.fact) result.fact = this.track.fact.objectID;
		if (this.track.plan) result.plan = this.track.plan.objectID;
		if (this.dynamic) {
			result.dynamic = this.dynamic.uuid;			
		}
		return result;
	}
}

/*
	Трек - сложный объект, состоящий из 2 (или 1) маршрутов - планового и фактического
*/
window.Track = class Track extends SmartObject{
	constructor(plan, fact){
		super();
		this.plan = plan;
		this.fact = fact;		
	}

	showFact(){
		if (this.fact) this.fact.show();
	}

	showPlan(){
		if (this.plan) this.plan.show();
	}

	showStops(){
		if (this.fact && this.fact.stops){
			this.fact.showStops();
		}
	}

	hideFact(){
		if (this.fact) this.fact.hide();
	}

	hidePlan(){
		if (this.plan) this.plan.hide();
	}

	hideStops(){
		if (this.fact && this.fact.stops){
			this.fact.hideStops();
		}
	}

	show(){
		this.showPlan();
		this.showFact();
		this.showStops();
	}

	hide(){
		this.hidePlan();
		this.hideFact();
		this.hideStops();
	}

	destroy(){

	}
}