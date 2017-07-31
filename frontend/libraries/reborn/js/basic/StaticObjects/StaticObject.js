/*
	Составной объект для рисования на карте
*/
window.StaticObject = class StaticObject extends SmartObject{

	constructor(data, map, style){
		super();
		this.objectID = data.objectID;
		// основная область объекта
		this.Area = null;
		// минимальное количество точек в объекте, начиная с которого он начинает отображаться
		this.minimumNodes = 0;
		// границы
		this.borders = [];
		// маркеры
		this.markers = [];
		// стретчеры (маркеры для растягивания)
		this.stretchers = [];
		// плашки маркеров растягивания для точного задания координат и удаления вершин
		this.stretcherPopups = [];
		// плашка, показывающая свойства
		this.infoPopup = null;
		// плашка для редактирования свойств
		this.inputPopup = null;
		// ссылка на карту
		this.map = map;
		// идентификатор группы, в которую входит объект
		this.group = data.groupID || null;
		// видимость объекта
		this.isVisible = true;
		// выделен ли объект
		this.isSelected = false;
		// растягивается ли объект в данный момент
		this.isStretching = false;
	}

	/*
		Перезаписывает координаты объекта;
		обновляется область, границы, маркеры и стретчеры;
	*/
	setLatLngs(ll){
		// метод не даст вывести объект в нестабильное состояние
		if (ll.length < this.minimumNodes) return;
		var delta = 0;
		if (this.Area){
			this.Area.setLatLngs(ll);
		} else {
			this.createArea(ll);
		}
		if (this.isComplete()){
			if (this.hasBorders()){
				// сверяем количество границ				
				delta = this.borders.length - ll.length-1;
				// недобор
				if (delta < 0){					
					// досоздаём границы
					for (var i = this.borders.length; i < ll.length; i++){
						this.borders.push(this.createBorder(i));
					}
				} else if (delta > 0){ 
				// перебор
					this.borders = this.borders.slice(0, ll.length);
				}
				// как раз
				// перебираем границы и меняем их координаты
				for (var i = 0; i < this.borders.length-1; i++){
					this.borders[i].setLatLngs([ll[i], ll[i+1]]);
				}
			}
			// маркеры
			if (this.hasMarkers()){
				if (this.markers.length){
					this.adjustMarkers();
				} else {
					this.createMarkers();
				}
			}
			// стретчеры
			if (this.hasStretchers()){
				// сверяем количество
				delta = this.stretchers.length - ll.length;
				// недобор или переор
				if (delta < 0){
					for (var i = this.stretchers.length; i < ll.length; i++){
						this.stretchers.push(this.createStretcher(i));
						this.stretcherPopups.push(this.createStretcherPopup(i));
					}					
				} else if (delta > 0){
					this.borders = this.borders.slice(0, ll.length);
				}
				for (var i = 0; i < ll.length; i++){
					this.stretchers[i].setLatLngs(ll[i]);
					this.stretcherPopups[i].setLatLngs(ll[i]);
				}
			}
		}
	}

	/*
		Директивно изменяет положение вершины с номером index, передвигая её в положение coords 
	*/
	moveNodeTo(index, coords){
		this.Area.moveNodeTo(index, coords);
		// двигаем границы, примыкающие к вершине
		if (this.hasBorders() && this.isComplete()){
			var b = this.getAdjacentBorders(index);
			var l = null;
			if (b.next || b.next === 0){
				l = this.borders[b.next].getLatLngs();
				l[0] = coords;
				this.borders[b.next].setLatLngs(l);
			}
			if (b.prev || b.prev === 0){
				l = this.borders[b.prev].getLatLngs();
				l[1] = coords;
				this.borders[b.prev].setLatLngs(l);
			}
		}
		if (this.hasStretchers()){
			if (this.stretchers[index]){
				this.stretchers[index].setLatLngs(coords);
				this.stretcherPopups[index].setLatLngs(coords);
			}
		}
	}

	/*
		Удаляет точку из объекта
	*/
	removeNode(index){
		// убираем из координат объекта точку, переписываем координаты области		
		this.Area.removeNode(index);
		this.ghostArea.setLatLngs(this.Area.getLatLngs());			
		// удаляем стретчер и его плашку
		this.removeStretcher(index);
		this.removeStretcherPopup(index);		
		// поправляем маркеры
		this.adjustMarkers();
		// перерисовываем границы
		this.redrawBorders();
	}

	getLatLngs(){
		var ll = [];		
		if (this.Area){			
			ll = this.Area.getLatLngs();			
		}
		return ll;
	}

	getCenter(){
		var res = null
		if (this.Area){
			res = this.Area.getCenter();
		}
		return res;	
	}

	getBounds(){
		if (this.ghostArea) return this.ghostArea.getBounds()
		else return this.Area.getBounds();
	}

	/*
		Создание маркеры объекта
	*/
	createMarkers(){}

	destroyMarkers(){
		for (var i = 0; i < this.markers.length; i++){
			this.map.removePrimitive(this.markers[i]);
		}
		this.markers = [];
	}

	/*
		Подгоняет маркеры статического объекта в случае, если контур изменился
	*/
	adjustMarkers(){}

	/*
		Показ маркеров объекта
	*/
	showMarkers(){
		for (var i = 0; i < this.markers.length; i++){
			this.markers[i].show();			
		}
	}

	/*
		Скрытие маркеров объекта
	*/
	hideMarkers(){
		for (var i = 0; i < this.markers.length; i++){
			this.markers[i].hide();
		}
	}

	/*
		Создание границ объекта
	*/
	createBorders(){}

	/*
		Удаление границ объекта
	*/
	destroyBorders(){
		for (var i=0; i<this.borders.length; i++){
			this.map.removePrimitive(this.borders[i]);
		}
		this.borders = [];
	}

	/*
		Создание отдельной границы
	*/
	createBorder(i){}	

	/*
		Полная перерисовка границ объекта
	*/
	redrawBorders(){		
		// удаляем стороны
		this.destroyBorders();
		// если в объекте не хватает вершин, стороны не создаются
		// создаем их заново		
		this.createBorders();		
		// показываем, если надо
		if (this.isSelected && this.isVisible && this.isComplete()){			
			this.showBorders();
		}		
	}

	/*
		Показ границ
	*/
	showBorders(){	
		for (var i = 0; i < this.borders.length; i++){

			this.borders[i].show();
		}
	}

	/*
		Скрытие границ
	*/
	hideBorders(){
		for (var i = 0; i < this.borders.length; i++){
			this.borders[i].hide();
		}
	}

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

	// уничтожение всех стретчеров объекта
	destroyStretchers(){
		for (var i = 0; i < this.stretchers.length; i++){
			this.map.removePrimitive(this.stretchers[i]);
			this.map.removePrimitive(this.stretcherPopups[i]);
		}
		this.stretchers = [];
		this.stretcherPopups = [];
	}

	/*
		Пересоздание стретчеров объекта и плашек к ним
	*/
	createStretchers(){
		this.destroyStretchers();
		for (var i = 0; i < this.getLatLngs().length; i++){
			this.stretchers.push(this.createStretcher(i));
			if (this.isStretching){
				this.stretchers[this.stretchers.length-1].show();
			}
			this.stretcherPopups.push(this.createStretcherPopup(i));
		}
	}

	/*
		Создание плашки для стретчера
	*/
	createStretcherPopup(index){
		var
			coords = this.getLatLngs()[index],
			content = {'Координаты': {
				value: coords,
				dataType: 'coordinates',
				commands: ['Ok', 'Удалить']
			}},
			p = this.map.createStretcherPopup(coords, this, content, StaticMap.getStyleCollection().popups.popupOffsets.smallOffset, false, index),
			self = this;
			// обработчики событий перемещения и удаления вершины
			p.addListener('moveNodeDirect', function(context){
				context.objectID = self.objectID;
				context.index = this.index;				
				self.map.fire('moveNodeDirect', context);
			});
			p.addListener('removeNode', function(context){
				context.objectID = self.objectID;
				context.index = this.index;				
				self.map.fire('removeNode', context);
			});
		return p;
	}

	/*
		Создание стретчера (возвращает объект)
	*/	
	createStretcher(index){		
		var 
			// создаем маркер
			s = this.map.createMarker(this.getLatLngs()[index], this, StaticMap.getStyleCollection().markers.defaultStretcher, true),
			// передача контекста через замыкание
			self = this;
		// присваиваем стретчеру индекс, связывающий его с узловой точкой объекта и его границами
		s.index = index;
		s.adjucentBorders = {};
		// обработчики событий стретчера
		// драгстарт - сделать смежные со стретчером стороны пунктирными
		s.addListener('dragstart', function(context){
			context.index = this.index;
			// сгенерировать событие о начале растягивания
			self.fire('stretcherDragStart', context);
		});
		// драг - изменить положение связанной вершины и смежных границ, перезаписать координаты полигона
		s.addListener('drag', function(context){
			context.index = this.index;
			self.fire('stretcherDrag', context);
		});
		// драгэнд - вернуть стили связанных сторон взад, кинуть событие (контур объекта изменился)
		s.addListener('dragend', function(context){
			context.index = this.index;
			self.fire('stretcherDragEnd', context);
			
		});
		s.addListener('click', function(context){
			self.stretcherPopups[this.index].show();
		});
		return s;
	}
	
	/*
		Показ стретчеров
	*/
	showStretchers(){		
		for (var i=0; i<this.stretchers.length; i++){
			this.stretchers[i].show();
		}
	}

	/*
		Скрытие стретчеров
	*/
	hideStretchers(){		
		for (var i = 0; i < this.stretchers.length; i++){
			this.stretchers[i].hide();
		}
	}

	// добавление стретчера с автоматическим сдвигом последующих
	addStretcher(position, node){
		var  s = this.createStretcher(node);		
		this.stretchers.splice(position, 0, s);
		for (var i = position + 1; i < this.stretchers.length; i++){
			this.stretchers[i].index++;
		}
		if (this.isStretching){		
			s.show();
		}		
	}

	// добавление плашки стретчера с автоматическим сдвигом последующих
	addStretcherPopup(position, node){
		var  s = this.createStretcherPopup(node);
		this.stretcherPopups.splice(position, 0, s);
		for (var i = position + 1; i < this.stretcherPopups.length; i++){
			this.stretcherPopups[i].index++;
		}		
	}

	// удаление стретчера с автоматическим сдвигом последующих	
	removeStretcher(index){		
		this.map.removePrimitive(this.stretchers[index]);
		this.stretchers.splice(index, 1);
		for (var i = index; i < this.stretchers.length; i++){
			this.stretchers[i].index--;
		}
	}

	// удаление плашки стретчера с автоматическим сдвигом последующих
	removeStretcherPopup(index){
		this.map.removePrimitive(this.stretcherPopups[index]);
		this.stretcherPopups.splice(index, 1);
		for (var i = index; i < this.stretcherPopups.length; i++){
			this.stretcherPopups[i].index--;
		}
	}

	show(){
		this.isVisible = true;
		this.Area.show();
		if (this.isSelected){
			this.showBorders();
			this.showMarkers();
		}
	}

	// скрытие объекта
	hide(){
		// развыбираем объект
		if (this.isSelected){
			this.unselect();
		}
		this.isVisible = false;
		this.Area.hide();
		this.fire('hideView', {objectID: this.objectID});
	}

	setStyle(style){	
		this.Area.setStyle(style);		
	}

	select(){
		this.isSelected = true;
		if (this.isVisible) this.highlightOn();
	}

	unselect(){		
		this.isSelected = false;
		if (this.isVisible) {
			this.highlightOff();
		}
		if (this.isStretching){
			this.freeze();
		}
		let context = {message: 'Object was unselected', objectID: this.objectID};
		this.fire('unselectView', context);
	}

	highlightOn(){		
		this.showMarkers();
		this.showBorders();		
		this.setStyle(StaticMap.getStyleForObject(this));		
	}

	highlightOff(){		
		this.hideMarkers();
		this.hideBorders();
		this.setStyle(StaticMap.getStyleForObject(this));
	}

	/*
		Добавляет объекту точку с координатами coords в позицию index. Если позиция не указана, добавляет в конец.
	*/
	pushPoint(coords, index){}

	/*
		Добавляет объекту обработчики событий
	*/
	subscribe(){

	}

	/*
		Возвращает true если объект находится в стабильном состоянии и его можно в таком виде сохранить
	*/
	isComplete(){		
		return (this.getLatLngs().length >= this.minimumNodes);
	}

	/*
		Переводит объект в режим растягивания
	*/
	stretch(){
		this.isStretching = true;
		this.showStretchers();		
	}

	/*
		Возвращает индексы границ (prev & next), прилегающих к узловой точке объекта с номером index.
	*/
	getAdjacentBorders(index){
		var result = {};		
		if (this.hasBorders()){
			switch(this.getArchetype()){
				case 'Polygon': 
					result.next = index;
					result.prev = (index + this.borders.length - 1) % this.borders.length;
					break;
				case 'Line':
					if (index > 0) result.prev = index - 1;
					if (index < this.getLatLngs().length-1) result.next = index;
					break;
				case 'Point':
				case 'Circle':
					break;
			}
		}			
		return result;
	}

	getArchetype(){
		return 'None';
	}

	freeze(){
		this.isStretching = false;	
		this.hideStretchers();
	}

	/*
		Возвращает ID всех примитивов, из которых состоит объект
	*/
	grabIDs(){
		return [];
	}
}