window.DynamicObject = class DynamicObject extends SmartObject{
	/*
		Атрибуты
			Текущая позиция
			Хинт
			Подпись
		Части
			Маркер
			Подпись
		Методы
			Показать
			Спрятать
			Переставить		
	*/
	constructor(uuid, map, position, hint, title, props){
		super();
		this.uuid = uuid;
		this.map = map;
		this.position = position;
		this.hint = hint;
		this.title = title;
		this.props = props;
		this.isVisible = true;
		this.isSelected = false;
		this.style = StaticMap.getStyleForObject(this);
		if (this.position){
			this.createMarker();
			this.createLabel();
		} else {
			this.marker = null;
			this.label = null;
			this.isVisible = false;
		}
	}

	getPosition(){
		return this.position;
	}

	getCenter(){
		return this.getPosition();
	}

	// маркер объекта
	createMarker(){
		if (!this.marker){
			var self = this;
			this.marker = this.map.createMarker(this.position, this, this.style.marker, false);
			this.marker.addListener('click', function(context){				
				self.markerClickHandler(context);
			});
			this.marker.show();
		}
	}

	markerClickHandler(context){		
		let c = {coords: context.coords, uuid: this.uuid};
		this.fire('mapClick', c);
	}

	labelClickHandler(){}

	// подпись к маркеру
	createLabel(){
		if (!this.label){
			let aligns = StaticMap.getStyleCollection().label.align;
			this.label = this.map.createLabel(this.position, this, this.title, this.style.label, this.style.label.align);
			this.label.show();
		}
	}

	show(){
		this.isVisible = true;
		this.marker.show();
		this.label.show();
	}

	hide(){
		this.isVisible = false;
		this.marker.hide();
		this.label.hide();
	}

	// перестановка объекта в указанные координаты
	moveTo(coords){
		this.position = coords;
		if (!this.marker && !this.label){
			this.createMarker();
			this.createLabel();
		}
		if (this.isVisible){
			this.marker.setLatLngs(this.position);
			this.label.setLatLngs(this.position);			
		}
	}

	select(){
		this.isSelected = true;
		if (this.isVisible) this.highlightOn();
	}

	unselect(){
		this.isSelected = false;
		if (this.isVisible) this.highlightOff();
	}

	setStyle(style){
		this.style = style;
		// должен поменяться стиль маркера и подписи
	}

	highlightOn(){		
		this.style = StaticMap.getStyleForObject(this);		
		if (this.marker && this.label){
			this.marker.setColor(this.style.marker.color);
			this.label.setStyle(this.style.label);
		}
		
	}

	highlightOff(){		
		this.style = StaticMap.getStyleForObject(this);
		if (this.marker && this.label){
			this.marker.setColor(this.style.marker.color);
			this.label.setStyle(this.style.label);
		}
	}

	grabIDs(){
		return [this.marker.objectID, this.label.objectID];		
	}
}