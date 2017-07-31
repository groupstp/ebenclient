window.MCircleGeoZone = class MCircleGeoZone extends MCircleObject{

	constructor(data, map){
		super(data, map);		
		this.calc = GeoZoneManager.getCalculator();	
		if (this.radius && this.center){
			this.createStretchers();
		}
		this.subscribe();
	}

	// подписка объекта на события
	subscribe(){
		this.addListener('stretcherDrag', function(context){
			this.stretcherDragHandler(context);
		});
		this.addListener('stretcherDragStart', function(context){
			this.stretcherDragStartHandler(context);
		});
		this.addListener('stretcherDragEnd', function(context){
			this.stretcherDragEndHandler(context);
		});
	}	

	/*
		Создание стретчера (возвращает объект)
	*/	
	createStretcher(index){
		var 
			angle = this.calc.degToRad(index * 90),
			stretcherCoords = this.calc.forwardTask(this.center, angle, this.radius),
			// создаем маркер
			s = this.map.createMarker(stretcherCoords, this, StaticMap.getStyleCollection().markers.defaultStretcher, true),
			// передача контекста через замыкание
			self = this;
		// присваиваем стретчеру индекс, связывающий его с узловой точкой объекта и его границами
		s.index = index;
		// обработчики событий стретчера
		s.addListener('dragstart', function(context){
			context.index = this.index;
			// сгенерировать событие о начале растягивания
			self.fire('stretcherDragStart', context);
		});		
		s.addListener('drag', function(context){
			context.index = this.index;
			self.fire('stretcherDrag', context);
		});		
		s.addListener('dragend', function(context){
			context.index = this.index;
			self.fire('stretcherDragEnd', context);
			
		});
		if (this.isStretching){
			s.show()
		}
		/*s.addListener('click', function(context){
			self.stretcherPopups[this.index].show();
		});*/
		return s;
	}
	//
	// обработчики перетаскивания маркера растягивания
	stretcherDragHandler(context){
		if (this.isComplete()){
			let d = this.calc.getDistance(this.center, context.coords);
			this.ghostArea.setRadius(d);			
		}			
	}

	stretcherDragStartHandler(context){
		if (this.isComplete()){			
			this.ghostArea.setStyle(StaticMap.getStyleCollection().ghostArea.solid);
			for (let i = 0; i < this.stretchers.length; i++){
				if (i !== context.index){
					this.stretchers[i].hide();
				}
			}
		}
	}

	stretcherDragEndHandler(context){
		var r = this.ghostArea.getRadius();
		if (this.isComplete()){			
			this.ghostArea.setRadius(this.radius);
			this.ghostArea.setStyle(StaticMap.getStyleCollection().ghostArea.transparent);
			this.showMarkers();
			this.createStretchers();
		}
		context.objectID = this.objectID;
		context.radius = r; 
		console.log(context)
		this.map.fire('radiusChange', context);		
	}
	//

	/*
		Переводит объект в режим растягивания
	*/
	stretch(){
		super.stretch();
		if (this.ghostArea) {
			this.ghostArea.enableDragging();			
		} else {
			this.Area.enableDragging();
		}
	}

	/*
		Выводит объект из режима растягивания
	*/
	freeze(){
		super.freeze();
		if (this.ghostArea) {
			this.ghostArea.disableDragging();
		} else {
			this.Area.disableDragging();
		}
	}	

	/* Создание маркеров растягивания */
	createStretchers(){
		this.destroyStretchers();
		for (var i = 0; i < 4; i++){
			this.stretchers.push(this.createStretcher(i));
		}
	}

	destroyStretchers(){
		for (var i = 0; i < this.stretchers.length; i++){
			this.map.removePrimitive(this.stretchers[i]);			
		}
		this.stretchers = [];
		this.stretcherPopups = [];
	}

	showStretchers(){
		for (var i = 0; i < this.stretchers.length; i++){
			this.stretchers[i].show();
		}
	}

	hideStretchers(){
		for (var i = 0; i < this.stretchers.length; i++){
			this.stretchers[i].hide();
		}
	}
}