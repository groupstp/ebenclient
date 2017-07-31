window.LeafletStaticMap =  class LeafletStaticMap extends StaticMap{
	
	constructor(container){
		super(container);
		// платформа, на которой реализована карта
		this.platform = 'Leaflet';
		// адрес, с которого загружаются тайлы
		this.tilesUrl = 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
		// создаём карту в контейнере		
		this.map = L.map(container, {center: this.defaultCenter, zoom: 3, closePopupOnClick: false});
		// грузим тайлы
		this.loadTiles();
		// изменяем курсор на карте с пальца на стрелку
		this.setCursorStyle('default');		
		// передаём контекст через замыкание и развешиваем события
		var self = this;
		this.map.on('click', function(context){
			self.fire('mapClick', {objectID: null, coords: [context.latlng.lat, context.latlng.lng]});
		});
		this.map.on('zoom', function(context){
			self.calcAreaRadius();
			self.fire('zoom', {zoom: context.target._zoom});
		});
		this.map.on('mousemove', function(context){
			self.cursorLocation = [context.latlng.lat, context.latlng.lng]
			self.fire('mousemove', {message: 'Cursor was moved', cursorLocation: [context.latlng.lat, context.latlng.lng]});
		});
		this.map.on('move', function(context){			
			self.calcAreaRadius();			
			self.calcAreaCenter();
		});
		this.areaRadius = this.calcAreaRadius();
		this.calcAreaCenter();
	}	

	loadTiles(){
		L.tileLayer(this.tilesUrl, {attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'}).addTo(this.map);
	}

	setCursorStyle(style){
		// изменяем курсор на карте
		document.getElementsByClassName('leaflet-container')[0].style.cursor = style;
	}

	/*
		Переводит координаты, переданные в виде массива чисел в вид, понятный карте
	*/
	static fromRawToNative(coords){
		var result = null;
		// если пришел массив координат
		if (typeof coords[0] === 'object'){
			result = [];
			for (var i = 0; i < coords.length; i++){
				result.push(L.latLng(coords[i]));
			}
		// если пришло одно значение
		} else {
			result = L.latLng(coords)
		}
		return result;
	}

	/*
		Переводит координаты, переданные в родном для карты формате в массив с числами
	*/
	static fromNativeToRaw(coords){
		var result = null;
		// если пришел массив координат
		if (coords[0]){
			result = [];
			for (var i = 0; i < coords.length; i++){
				if (coords[i]){
					result.push([coords[i].lat, coords[i].lng]);
				}
			}
		// если пришло одно значение
		} else {
			result = [coords.lat, coords.lng];
		}		
		return result;
	}

	/*
		Конвертирует обобщенный стиль в тот вид, который понятен карте
	*/
	static convertStyle(rawStyle){
		var style = {};
		// прозрачность
		if (rawStyle.hasOwnProperty('opacity')){
			style.fillOpacity = rawStyle.opacity;
		}
		// цвет границ (для плоских фигур, не путать с кликабельными границами, рисующимися при выделении)
		if (rawStyle.hasOwnProperty('borderColor')){
			style.color = rawStyle.borderColor;
		}
		// если цвет заливки не указан отдельно, то Leaflet трактует свойство color как цвет границы
		// поэтому разносим цвет границы и цвет самой фигуры
		if (rawStyle.hasOwnProperty('color')){
			if (rawStyle.hasOwnProperty('borderColor')){
				style.fillColor = rawStyle.color;
			} else {
				style.color = rawStyle.color;
			}
		}
		// толщина линий
		// для плоских фигур приходит свойство borderWeight, для линий - просто weight, но трактуются они одинаково
		if (rawStyle.hasOwnProperty('borderWeight')){
			style.weight = rawStyle.borderWeight;
		}
		if (rawStyle.hasOwnProperty('weight')){
			style.weight = rawStyle.weight;
		}
		// пунктирность линии
		if (rawStyle.hasOwnProperty('dashArray')){
			style.dashArray = rawStyle.dashArray
		}
		//
		if (rawStyle.hasOwnProperty('offset')){
			style.offset = L.point(rawStyle.offset.x, rawStyle.offset.y);
		}
		return style;
	}

	// собирает иконку маркера по пришедшему стилю
	// ID самого маркера нужен для того, чтобы потом можно было подцепиться к иконке через DOM и перекрасить её, если понадобится
	static convertIcon(iconStyle, primitiveID){
		var iconSize, iconAnchor;

		switch (iconStyle.pattern){
			case 'baloon':
				iconSize = [44, 44]; // 44 44
				iconAnchor = [22, 47];// 22 44
				break;
			case 'symmetric':
				iconSize = [20, 20];
				iconAnchor = [10, 10];
				break;
			case 'arrow':
				iconSize = [40, 40];
				iconAnchor = [20, 30];
				break;
			case 'dynamic':
				iconSize = [32, 32];
				iconAnchor = [16, 24];
				break;
		}		
		// добавляем инлайн-стиль
		// он обязательно содержит цвет иконки
		var inlineCSS = 'style="color: '+iconStyle.color;
		// опционально содержит градус поворота
		if (iconStyle.rotate){
			inlineCSS += '; transform: rotate('+iconStyle.rotate+'deg)';
		}
		inlineCSS += ';"'
		// '<i id="'+'icon'+primitiveID+'" class = "'+iconStyle.icon+'" style="color:'+iconStyle.color+';" aria-hidden="false"></i>'
		var html = '<i id="'+'icon'+primitiveID+'" class = "'+iconStyle.icon+'" '+inlineCSS+' aria-hidden="false"></i>';
		
		var icon = L.divIcon({
			html: html,
			className: iconStyle.className,
			iconSize: iconSize,
			iconAnchor: iconAnchor
		});		
		return icon;
	}

	// возвращает TRUE, если аргумент является экземпляром LeafletBounds
	checkNativeBounds(obj){
		return (typeof obj === 'object' && obj instanceof LeafletBounds);
	}

	getBounds(){
		return new LeafletBounds(this.map.getBounds());
	}

	/*
		Возвращает зум
	*/
	getZoom(){		
		return this.map._zoom;
	}	

	calcAreaRadius(){
		var b = this.map.getBounds();	
		this.areaRadius = b._northEast.distanceTo(b._southWest)/2;		
	}

	calcAreaCenter(){		
		this.areaCenter = LeafletStaticMap.fromNativeToRaw(this.map.getBounds().getCenter());		
	}

	formXYtoLatLng(xy){		
		return L.Projection.Mercator.unproject(xy);
	}

	fromLatLngToXY(latlon){
		var source = LeafletStaticMap.fromRawToNative(latlon);
		return L.Projection.Mercator.project(source);		
	}

	createPolygon(coords, owner, style){
		this.primitivesCounter++;
		this.primitives[this.primitivesCounter] = new LeafletPolygon(this.primitivesCounter, this.map, {coords: LeafletStaticMap.fromRawToNative(coords)}, owner, LeafletStaticMap.convertStyle(style));		
		return this.primitives[this.primitivesCounter];
	}

	createCircle(center, radius, owner, style){		
		this.primitivesCounter++;
		var s = LeafletStaticMap.convertStyle(style);		
		this.primitives[this.primitivesCounter] = new LeafletCircle(this.primitivesCounter, this.map, {center: LeafletStaticMap.fromRawToNative(center), radius: radius}, owner, s);
		return this.primitives[this.primitivesCounter];
	}

	createRing(center, radius, owner, style){		
		this.primitivesCounter++;
		var s = LeafletStaticMap.convertStyle(style);		
		this.primitives[this.primitivesCounter] = new LeafletRing(this.primitivesCounter, this.map, {center: LeafletStaticMap.fromRawToNative(center), radius: radius}, owner, s);
		return this.primitives[this.primitivesCounter];
	}

	createLine(from, to, owner, style){
		this.primitivesCounter++;
		var data = {coords: LeafletStaticMap.fromRawToNative([from, to])};
		this.primitives[this.primitivesCounter] = new LeafletLine(this.primitivesCounter, this.map, data, owner, LeafletStaticMap.convertStyle(style));		
		return this.primitives[this.primitivesCounter];
	}

	createPolyline(coords, owner, style){
		this.primitivesCounter++;
		var data = {coords: coords};
		this.primitives[this.primitivesCounter] = new LeafletPolyline
		(this.primitivesCounter, this.map, data, owner, LeafletStaticMap.convertStyle(style));		
		return this.primitives[this.primitivesCounter];
	}

	createSegment(from, to, owner, style){		
		this.primitivesCounter++;
		var data = {coords: LeafletStaticMap.fromRawToNative([from, to])};
		this.primitives[this.primitivesCounter] = new LeafletSegment(this.primitivesCounter, this.map, data, owner, LeafletStaticMap.convertStyle(style));		
		return this.primitives[this.primitivesCounter];
	}

	createPopup(point, owner, content, style, readOnly){
		this.primitivesCounter++;		
		var data = {coords: point, content: content, readOnly: readOnly};
		this.primitives[this.primitivesCounter] = new LeafletPopup(this.primitivesCounter, this.map, data, owner, LeafletStaticMap.convertStyle(style));
		return this.primitives[this.primitivesCounter];	
	}

	createHashPopup(point, owner, content, style, readOnly){
		this.primitivesCounter++;		
		var data = {coords: point, content: content, readOnly: readOnly};
		this.primitives[this.primitivesCounter] = new LeafletHashPopup(this.primitivesCounter, this.map, data, owner, LeafletStaticMap.convertStyle(style));
		return this.primitives[this.primitivesCounter];	
	}

	createStretcherPopup(point, owner, content, style, readOnly, index){
		this.primitivesCounter++;		
		var data = {coords: point, content: content, readOnly: readOnly, index: index};
		this.primitives[this.primitivesCounter] = new LeafletStretcherPopup(this.primitivesCounter, this.map, data, owner, LeafletStaticMap.convertStyle(style));
		return this.primitives[this.primitivesCounter];	
	}

	createMarker(point, owner, style, isDraggable){		
		this.primitivesCounter++;
		this.primitives[this.primitivesCounter] = new LeafletMarker(this.primitivesCounter, this.map, {point: point}, owner, LeafletStaticMap.convertIcon(style, this.primitivesCounter), isDraggable);
		return this.primitives[this.primitivesCounter];
	}

	createMarker1(point, owner, style){
		this.primitivesCounter++;
		this.primitives[this.primitivesCounter] = new LeafletMarker1(this.primitivesCounter, this.map, {point: point}, owner, null);		
		return this.primitives[this.primitivesCounter];
	}

	createLabel(coords, owner, text, style, align){		
		this.primitivesCounter++;
		this.primitives[this.primitivesCounter] = new LeafletLabel(this.primitivesCounter, this.map, {coords: coords, text: text, align: align}, owner, style);
		return this.primitives[this.primitivesCounter];
	}

	/*
		Центровка карты с радиусом обзора (крипота страшная)
	*/
	setView(latlng, radius){
		if (radius){
			var c = L.circle(LeafletStaticMap.fromRawToNative(latlng), radius*1000);
			// ААААА!!
			c.addTo(this.map);
			var b = c.getBounds();			
			this.map.fitBounds(b);
			// ЫЫЫЫЫ!!1
			this.map.removeLayer(c);
			/*this.areaRadius = this.calcAreaRadius();		
			this.areaCenter = this.calcAreaCenter();*/
		} else {
			this.map.setView(latlng);
		}
	}

	fitTo(bounds){
		this.map.fitBounds(bounds.toNative());
	}
}

class LeafletObject extends MapObject{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
		// пока вложенности нет - будет так		
		this.map = layer;
		// потом +/- так
		//this.map = layer.map;
	}

	show(){
		this.isVisible = true;
		this.layer.addLayer(this.view);
	}

	hide(){
		this.isVisible = false;
		this.layer.removeLayer(this.view);
	}

	getLatLngs(){
		return LeafletStaticMap.fromNativeToRaw(this.view.getLatLngs());
	}

	setLatLngs(ll){}

	getCenter(){
		let c = this.view.getBounds().getCenter();
		return [c.lat, c.lng];
	}	

	setStyle(style){
		this.style = style;
		this.view.setStyle(LeafletStaticMap.convertStyle(this.style));
	}

	getStyle(){
		return this.style;
	}

	getColor(){
		return this.view.options.color;
	}

	moveNodeTo(index, coords){}

	getBounds(){
		/*
		let b = this.view.getBounds(),
		d = b._northEast.distanceTo(b._southWest)/2,
		c = b.getCenter();
		var result = {
			center: [c.lat, c.lng],
			radius: d >= 500 ? d : 500,
			actualRadius: d
		};
		return result;
		*/		
		return new LeafletBounds(this.view.getBounds());
	}
}

class LeafletPolygon extends LeafletObject{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
		this.layer = layer;		
		this.view = L.polygon(data.coords, style);
		var self = this;
		// временные координаты, которые используются при обработке перетаскивания
		this.tempDragCoords = null;
		// можно ли таскать полигон мышкой
		this.isDraggable = false;
		// обработчик клика по полигону
		this.view.on('click', function(e){			
			// отключаем распространение события на вышестоящие объекты (иначе одновременно будет срабатывать клик по карте, например)
			L.DomEvent.stopPropagation(e);
			// формируем контекст события, передаваемый наверх
			var context = {
				primitiveID: self.objectID,
				event: 'polygonClick',
				coords: LeafletStaticMap.fromNativeToRaw(e.latlng),
				ctrlKey: e.originalEvent.ctrlKey
			};			
			// активируем событие полигона
			self.fire('click', context);
		});		
	}

	enableDragging(){
		// включаем переменную
		this.isDraggable = true;		
		// зажатие мыши при перетаскивании
		this.view.on('mousedown', this.dragMouseDown, this);			
	}

	disableDragging(){
		// убираем флаг, стираем обработчики
		this.isDraggable = false;
		this.view.off('mousedown');
		this.view.off('mouseup');
	}

	dragHandler(context){		
		// считываем координаты указателя
		const latlng = context.latlng;
		// вычисляем разницу с предыдущей позицией
		const delta = {lat: latlng.lat - this.tempDragCoords.lat, lng: latlng.lng - this.tempDragCoords.lng};
		// считываем текущие координаты объекта и преобразуем их с помощью delta
		let coords = this.view._latlngs[0];
		let newCoords = coords.map((latlon) => {
			const c = {
				lat: latlon.lat + delta.lat,
				lng: latlon.lng + delta.lng
			}
			return c;
		});
		this.tempDragCoords = latlng;
		// перерисовываем объект
		this.view.setLatLngs(newCoords).redraw();
		this.fire('drag', {primitiveID: this.objectID, event: 'polygonDrag', center: this.getCenter()});		
	}

	dragMouseDown(context){
		// отключаем драг карты
		this.map.dragging.disable();
		// запоминаем текущее положение курсора
		this.tempDragCoords = context.latlng;
		// даём карте дополнительный обработчик движения мыши, который будет двигать объект
		this.map.on('mousemove', this.dragHandler, this);
		// отпускание мыши при перетаскивании
		this.view.on('mouseup', this.dragMouseUp, this);
		this.fire('dragstart', {primitiveID: this.objectID, event: 'polygonDragStart', center: this.getCenter()});
	}

	dragMouseUp(context){
		var self = this;
		// возвращаем карте возможность протаскивания мышкой
		this.map.dragging.enable();
		// УВАГА! ЖЕСТКИЙ ХАК: ЭТО СВОЙСТВО ПО УМОЛЧАНИЮ ОТСУТСТВУЕТ В ОБЪЕКТЕ this.map.boxZoom, ИЗ-ЗА ЭТОГО ПОСЛЕ ОТПУСКАНИЯ МЫШИ СРАБАТЫВАЕТ СОБЫТИЕ click, ПОЭТОМУ СТАВИМ СЮДА TRUE
		this.map.boxZoom._moved = true;
		// удаляем дополнительный обработчик
		this.map.off('mousemove', this.dragHandler, this);		
		this.view.off('mouseup', this.dragMouseUp, this);
		this.fire('dragend', {primitiveID: this.objectID, event: 'polygonDragEnd', center: this.getCenter()});
		// УВАГА! ЖЕСТКИЙ ХАК: ВОЗВРАЩАЕМ ВСЁ НА МЕСТО, УДАЛЯЕМ СВОЙСТВО С ТАЙМАУТОМ, ЧТОБЫ СОБЫТИЕ НЕ УСПЕЛО СРАБОТАТЬ
		setTimeout(()=>{delete self.map.boxZoom._moved;}, 50);		
	}

	getLatLngs(){		
		return LeafletStaticMap.fromNativeToRaw(this.view.getLatLngs()[0]);
	}

	setLatLngs(ll){
		this.view.setLatLngs(LeafletStaticMap.fromRawToNative(ll));
	}

	moveNodeTo(index, coords){
		var ll = this.view.getLatLngs()[0];
		ll[index] = LeafletStaticMap.fromRawToNative(coords);
		this.view.setLatLngs(ll);
	}

	insertPoint(index, coords){
		let ll = this.view.getLatLngs()[0];
		ll.splice(index, 0, LeafletStaticMap.fromRawToNative(coords));
		this.view.setLatLngs(ll);
	}

	removeNode(index){
		let ll = this.view.getLatLngs()[0];
		ll.splice(index, 1);
		this.view.setLatLngs(ll);
	}

	setCursorStyle(style){
		this.view._path.style.cursor = style;
	}
}

class LeafletCircle extends LeafletObject{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
		this.layer = layer;
		var self = this;
		let options = style;
		options.radius = data.radius;
		this.view = L.circle(data.center, options);
		// обработчик клика по области
		this.view.on('click', function(e){			
			// отключаем распространение события на вышестоящие объекты (иначе одновременно будет срабатывать клик по карте, например)
			L.DomEvent.stopPropagation(e);
			// формируем контекст события, передаваемый наверх
			var context = {
				primitiveID: self.objectID,
				event: 'circleClick',
				coords: LeafletStaticMap.fromNativeToRaw(e.latlng)
			};
			// активируем событие
			self.fire('click', context);
		});				
	}

	setCenter(newCenter){
		this.view.setLatLng(newCenter);
	}

	setRadius(newRadius){		
		this.view.setRadius(newRadius);
	}

	getRadius(){		
		return this.view.getRadius();
	}

	enableDragging(){		
		// включаем переменную
		this.isDraggable = true;		
		// зажатие мыши при перетаскивании
		this.view.on('mousedown', this.dragMouseDown, this);			
	}

	disableDragging(){
		// убираем флаг, стираем обработчики
		this.isDraggable = false;
		this.view.off('mousedown');
		this.view.off('mouseup');
	}

	dragHandler(context){		
		// считываем координаты указателя
		const latlng = context.latlng;
		// вычисляем разницу с предыдущей позицией
		const delta = {lat: latlng.lat - this.tempDragCoords.lat, lng: latlng.lng - this.tempDragCoords.lng};
		// считываем текущие координаты объекта и преобразуем их с помощью delta
		let newCoords = {lat: this.view._latlng.lat+delta.lat, lng: this.view._latlng.lng+delta.lng};		
		this.tempDragCoords = latlng;
		// перерисовываем объект
		this.view.setLatLng(newCoords).redraw();
		this.fire('drag', {primitiveID: this.objectID, event: 'circleDrag', center: this.getCenter()});		
	}

	dragMouseDown(context){		
		// отключаем драг карты
		this.map.dragging.disable();
		// запоминаем текущее положение курсора
		this.tempDragCoords = context.latlng;
		// даём карте дополнительный обработчик движения мыши, который будет двигать объект
		this.map.on('mousemove', this.dragHandler, this);
		// отпускание мыши при перетаскивании
		this.view.on('mouseup', this.dragMouseUp, this);
		this.fire('dragstart', {primitiveID: this.objectID, event: 'circleDragStart', center: this.getCenter()});
	}

	dragMouseUp(context){
		var self = this;
		// возвращаем карте возможность протаскивания мышкой
		this.map.dragging.enable();
		// УВАГА! ЖЕСТКИЙ ХАК: ЭТО СВОЙСТВО ПО УМОЛЧАНИЮ ОТСУТСТВУЕТ В ОБЪЕКТЕ this.map.boxZoom, ИЗ-ЗА ЭТОГО ПОСЛЕ ОТПУСКАНИЯ МЫШИ СРАБАТЫВАЕТ СОБЫТИЕ click, ПОЭТОМУ СТАВИМ СЮДА TRUE
		this.map.boxZoom._moved = true;
		// удаляем дополнительный обработчик
		this.map.off('mousemove', this.dragHandler, this);		
		this.view.off('mouseup', this.dragMouseUp, this);
		this.fire('dragend', {primitiveID: this.objectID, event: 'circleDragEnd', center: this.getCenter()});
		// УВАГА! ЖЕСТКИЙ ХАК: ВОЗВРАЩАЕМ ВСЁ НА МЕСТО, УДАЛЯЕМ СВОЙСТВО С ТАЙМАУТОМ, ЧТОБЫ СОБЫТИЕ НЕ УСПЕЛО СРАБОТАТЬ
		setTimeout(()=>{delete self.map.boxZoom._moved;}, 50);		
	}
}

class LeafletRing extends LeafletObject{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
		this.layer = layer;
		var self = this;
		let options = style;		
		options.fillOpacity = 0;
		options.stroke = true;		
		options.radius = data.radius;
		this.view = L.circle(data.center, options);
		this.view.on('click', function(e){
			//L.DomEvent.stopPropagation(e);			
		})	
	}

	setCenter(newCenter){
		this.view.setLatLng(newCenter);
	}

	setRadius(newRadius){
		this.view.setRadius(newRadius);
	}
}

class LeafletLine extends LeafletObject{	
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
		this.layer = layer;
		
		this.view = L.polyline(data.coords, style);		
		
		var self = this;
		this.view.on('click', function(e){
			// отключаем распространение события на вышестоящие объекты (иначе одновременно будет срабатывать клик по карте, например)
			L.DomEvent.stopPropagation(e);			
			// формируем контекст события, передаваемый наверх
			var context = {
				primitiveID: self.objectID,
				event: 'lineClick',
				coords: LeafletStaticMap.fromNativeToRaw(e.latlng)
			};
			// активируем событие линии
			self.fire('click', context);
		});

		this.view.on('mouseover', function(e){
			// отключаем распространение события на вышестоящие объекты (иначе одновременно будет срабатывать клик по карте, например)
			L.DomEvent.stopPropagation(e);			
			// формируем контекст события, передаваемый наверх
			var context = {
				primitiveID: self.objectID,
				event: 'lineMouseOver',
				coords: LeafletStaticMap.fromNativeToRaw(e.latlng)
			};
			// активируем событие линии
			self.fire('mouseover', context);
		});

		this.view.on('mouseout', function(e){
			// отключаем распространение события на вышестоящие объекты (иначе одновременно будет срабатывать клик по карте, например)
			L.DomEvent.stopPropagation(e);			
			// формируем контекст события, передаваемый наверх
			var context = {
				primitiveID: self.objectID,
				event: 'lineMouseOut',
				coords: LeafletStaticMap.fromNativeToRaw(e.latlng)
			};
			// активируем событие линии
			self.fire('mouseout', context);
		});
	}

	setLatLngs(ll){
		this.view.setLatLngs(LeafletStaticMap.fromRawToNative(ll));
	}

	moveNodeTo(index, coords){
		var ll = this.view.getLatLngs()[0];
		ll[index] = LeafletStaticMap.fromRawToNative(coords);
		this.view.setLatLngs(ll);
	}
}

class LeafletSegment extends LeafletLine{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);		
		this.startsAt = data.startsAt;
		this.length = this.view.getLatLngs()[0].distanceTo(this.view.getLatLngs()[1]);
		this.endsAt = this.startsAt + this.length;		
	}

	getLength() { return this.length }

	getStart() { return this.startsAt }

	getEnd () { return this.endsAt }
}

class LeafletPolyline extends LeafletObject{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
		this.layer = layer;
		this.view = L.polyline(data.coords, style);
		var self = this;
		this.view.on('click', function(e){
			// отключаем распространение события на вышестоящие объекты (иначе одновременно будет срабатывать клик по карте, например)
			L.DomEvent.stopPropagation(e);			
			// формируем контекст события, передаваемый наверх
			var context = {
				primitiveID: self.objectID,
				event: 'lineClick',
				coords: LeafletStaticMap.fromNativeToRaw(e.latlng)
			};
			// активируем событие линии
			self.fire('click', context);
		});
	}

	setLatLngs(ll){
		this.view.setLatLngs(ll);
	}

	moveNodeTo(index, coords){
		var ll = this.view.getLatLngs()[0];
		ll[index] = LeafletStaticMap.fromRawToNative(coords);
		this.view.setLatLngs(ll);
	}

	insertPoint(index, coords){
		let ll = this.view.getLatLngs()[0];
		ll.splice(index, 0, LeafletStaticMap.fromRawToNative(coords));
		this.view.setLatLngs(ll);
	}

	removeNode(index){
		let ll = this.view.getLatLngs()[0];
		ll.splice(index, 1);
		this.view.setLatLngs(ll);
	}
	
}

class LeafletMarker extends LeafletObject{
	constructor(id, layer, data, owner, style, isDraggable){
		super(id, layer, data, owner, style);
		var self = this;
		this.layer = layer;
		this.draggable = isDraggable || false;
		this.view = L.marker(data.point, {icon: style, draggable :this.draggable});

		this.view.on('click', function(e){
			// отключаем распространение события на вышестоящие объекты (иначе одновременно будет срабатывать клик по карте, например)
			L.DomEvent.stopPropagation(e);
			// активируем событие
			self.fire('click', {
				primitiveID: self.objectID,
				event: 'markerClick',
				coords: [e.latlng.lat, e.latlng.lng]
			});
		});
		this.view.on('mouseout', function(e){
			self.fire('mouseout', {
				primitiveID: self.objectID,
				event: 'markerMouseOut'				
			});
		});

		if (this.draggable){
			this.enableDragging();
		}		
	}

	setLatLngs(ll){		
		let p = null;
		if (typeof ll[0] === 'object'){
			p = ll[0]
		} else
			p = ll;		
		this.view.setLatLng(p);
	}

	getLatLngs(){		
		return LeafletStaticMap.fromNativeToRaw([this.view.getLatLng()]);
	}

	enableDragging(){
		if (!this.view.options.draggable){
			this.view.dragging.enable();
		}
		var self = this;		
		this.view.on('dragstart', function(e){
			var context = {
				primitiveID: self.objectID,
				event: 'markerDragStart',
				coords: [e.target._latlng.lat, e.target._latlng.lng]
			};			
			self.fire('dragstart',e);
		});
		this.view.on('drag', function(e){
			var context = {
				primitiveID: self.objectID,
				event: 'markerDrag',
				coords: [e.latlng.lat, e.latlng.lng]
			};			
			self.fire('drag',context);
		});
		this.view.on('dragend', function(e){
			var context = {
				primitiveID: self.objectID,
				event: 'markerDragEnd',
				distance: e.distance,
				coords: [e.target._latlng.lat, e.target._latlng.lng]
			};			
			self.fire('dragend',context);
		});
	}

	disableDragging(){
		this.view.dragging.disable();		
		this.view.on('dragstart', null);
		this.view.on('drag', null);
		this.view.on('dragend', null);
	}

	moveNodeTo(index, coords){		
		this.view.setLatLng(coords);
	}	

	setColor(color){		
		document.getElementById('icon'+this.objectID).style.color = color;
	}

	getColor(){
		return this.view.options.icon.options.html.match(/#.{6}/)[0];
	}

	setStyle(style){
		this.style = style;
		this.view.options.icon = LeafletStaticMap.convertIcon(this.style);
	}
}

/*
	Подпись с буквами
	Может быть размещена различными способами вокруг объекта, к которому прикреплена.
	По факту является маркером с текстом.
	Возможно выравнивание по горизонтали и по вертикали (left, right, center & top, bottom, middle)
	Если маркер имеет координаты latlon, то подпись относительно данной точки может быть размещена следующими способами:

	X-------X-------X
	.               .
	X-------X-------X
	.               .
	X-------X-------X

	Если задано положение слева от объекта, то горизонтальный добавляется отступ (несколько пикселей);
		положение справа - отрицательный горизонтальный отступ;
		положение сверху - положительный вертикальный отступ;
		положение снизу - отрицательный вертикальный отступ;
	У центральных положений отступов нет.

	Атрибуты:
		align - положение относительно координат, представление - [horizontal, vertical]; horizontal & vertical сверяются с StaticMap.getStyleCollection.label.align;
		style - стиль текста (CSS в 1 строку);
		coords - положение на карте;

*/
class LeafletLabel extends LeafletObject{

	constructor(id, layer, data, owner, style){
		//this.primitivesCounter, this.map, {coords: coords, text: text, align: align}, owner, style
		super(id, layer, data, owner, style);
		var self = this;		
		this.layer = layer;
		// текст подписи
		this.text = data.text;
		this.coords = data.coords;
		// размер текста в пикселях
		this.textSize = this.calcTextSize();
		// выравнивание
		this.align = data.align;		
		// ID элемента, в котором хранится текст
		this.textElement = 'mapLabel'+this.objectID;
		// создаём иконку		
		this.view = L.marker(this.coords, {icon: this.createIcon()});
		// обработчик клика по подписи
		this.view.on('click', function(e){
			// отключаем распространение события на вышестоящие объекты (иначе одновременно будет срабатывать клик по карте, например)
			L.DomEvent.stopPropagation(e);
			self.fire('click', {primitiveID: self.objectID});			
		});
	}

	createIcon(){
		// вычисляем отступ и подставляем результат
		let inlineStyle = this.style.text || '';		
		let anchor = this.calcLeafletIconAnchor(this.align);
		let icon = L.divIcon({iconAnchor: anchor, className: 'mapLabel', html: '<p class="mapText" id="'+this.textElement+'" style="'+inlineStyle+'">'+this.text+'</p>'});
		return icon;
	}

	// хацкерный метод, возвращающий размер текстового блока в пикселях
	// для этого делается невидимый спан, в который вставляется текст
	// после получения ширины и высоты спан удаляется
	calcTextSize(){
		let s = document.createElement('span');
		s.innerHTML = this.text;
		s.style.visibility="hidden";
		s.style.whiteSpace="nowrap";
		if (this.style.text){
			if (this.style.text){
				s.style = this.style.text
			}			
		} else {
			// если стиль не задан, копируем дефолтный из лифлета			
			s.style.font = window.getComputedStyle(document.getElementsByClassName('leaflet-container')[0]).font;
		}
		document.body.appendChild(s);
		let res={width:s.offsetWidth, height:s.offsetHeight};
		document.body.removeChild(s);
		return res;
	}

	// вычисляет параметр иконки iconAnchor, отвечающий за её положение
	calcLeafletIconAnchor(newAlign){		
		// отступы по горизонтали и вертикали (будем вычислять) и перечисление с вариантами выравнивания для сверки
		let marginHor = 0, marginVert = 0, aligns = LeafletStaticMap.getStyleCollection().label.align;
		// отступы по умолчанию
		const defaultMarginHor = -10, defaultMarginVert = -10;
		// находим отступ иконки по горизонтали
		if (newAlign){
			switch (newAlign[0]){
				case  aligns.hor.left:
					marginHor = defaultMarginHor; break;					
				case aligns.hor.right:
					marginHor = this.textSize.width - defaultMarginHor; break;
				case aligns.hor.center:			
					marginHor = Math.ceil(this.textSize.width / 2); break;
			};
			// находим отступ иконки по вертикали
			switch (newAlign[1]){
				case  aligns.vert.top:
					marginVert = defaultMarginVert; break;
				case aligns.vert.bottom:
					marginVert = (this.textSize.height - defaultMarginVert); break;
				case aligns.vert.middle:
					marginVert = Math.ceil(this.textSize.height / 2);
			}
		} else {
			marginHor = defaultMarginHor;
			marginVert = defaultMarginVert;
		}				
		return [marginHor, marginVert];
	}

	// смена шрифта подписи
	setStyle(style){
		// перезаписываем стиль в поле
		this.style.text = style.text;
		// т.к. шрифт поменялся, то мог измениться размер текстового блока, следовательно
		// нужно пересчитать размер надписи и перерисовать выравнивание
		this.textSize = this.calcTextSize();
		// пересоздаём иконку
		this.layer.removeLayer(this.view);
		this.view.options.icon = this.createIcon();		
		this.layer.addLayer(this.view);
	}

	// задает положение подписи
	setAlign(newAlign){
		// перезаписываем поле объекта
		this.align = newAlign;
		// пересоздаём иконку	
		this.layer.removeLayer(this.view);
		this.view.options.icon = this.createIcon();		
		this.layer.addLayer(this.view);		
	}

	setLatLngs(ll){		
		let p = null;
		if (typeof ll[0] === 'object'){
			p = ll[0]
		} else
			p = ll;		
		this.view.setLatLng(p);
		this.coords = p;
	}
}

// плашка
class LeafletPopup extends LeafletObject{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
		this.layer = layer;
		this.view = L.popup(style);
		this.view.setLatLng(data.coords);		
		this.readOnly = data.readOnly || false;
		// корректны ли данные в полях ввода
		this.correct = true;		
		this.setContent(data.content);
	}

	setContent(content){
		this.view.setContent(content);
	}

	fillValues(){}

	setLatLngs(ll){
		let p = null;
		if (typeof ll[0] === 'object'){
			p = ll[0]
		} else
			p = ll;
		this.view.setLatLng(p);
	}
}

class LeafletHashPopup extends LeafletPopup{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
	}

	/*
		Генерируем html-разметку для плашки (с редактированием и без)
	*/
	setContent(content){
		this.inputContent = '';
		this.readOnlyContent = '';
		if(content){
			this.createFields(content);
			var 
				// левая сторона плашки содержит подписи к полям, она одинакова для обоих вариантов
				leftSide = '<div class="wrapper"><div class="gzmleftblock">',
				// правая сторона для плашки с полями для ввода
				rightSide1 = '<div class="gzmrightblock">',
				// правая сторона для плашки readOnly
				rightSide2 = '<div class="gzmrightblock">'
			for (var i=0; i<this.fields.length; i++){
				leftSide += '<span>'+this.fields[i].name+'</span>';
				rightSide1 += '<input type="'+this.fields[i].inputType+'" id ="'+this.fields[i].inputElement+'">';
				rightSide2 += '<span id ="'+this.fields[i].displayElement+'"</span>';
			}
			leftSide += '</div>';
			rightSide1 += '</div>';  
			rightSide2 += '</div>';
			this.inputContent = leftSide+rightSide1+'<div class="gzmbotblock"><div class="gzmbtn" id="smb.'+this.objectID+'">OK</div></div>'+'</div>';
			this.readOnlyContent = leftSide+rightSide2+'</div>';			
		}		
		if (this.readOnly){
			this.view.setContent(this.readOnlyContent);
		} else {
			this.view.setContent(this.inputContent);
		}
	}

	/*
		Создаёт поля для плашки, используя хэш, пришедший в параметре как исходные данные
	*/
	createFields(data){		
		this.fields = [];
		var index = 0, self = this;
		for (var key in data){			
			// при создании поля передаем его название, текущее значение, порядковый номер, тип данных и ссылку на основной объект (т.е. на плашку)			
			this.fields.push(new PopupField(key, data[key].value, index, data[key].dataType || 'text', data[key].commands, this));
			// вешаем на поля обработчики
			// значение проверено
			this.fields[this.fields.length-1].addListener('validated', function(context){
				self.correct = true;
			});
			// начато редактирование
			this.fields[this.fields.length-1].addListener('startEdit', function(context){
				self.correct = false;
			});
			// некорректный ввод
			this.fields[this.fields.length-1].addListener('invalidValue', function(context){
				self.correct = false;
			});
		}
	}

	show(){		
		this.layer.removeLayer(this.view);
		// показываем саму плашку
		this.layer.addLayer(this.view);
		// заполняем значения появившихся элементов		
		for (var i = 0; i < this.fields.length; i++){			
			this.fields[i].show();
		}
		var self = this;
		// обработчик клика кнопки Ok
		document.getElementById('smb.'+this.objectID).onclick = function(){			
			var pack = [];
			if (self.correct){
				// перебираем все поля
				// формируем набор данных для передачи через событие
				for(var i = 0; i < self.fields.length; i++){					
					pack.push({
						fieldName: self.fields[i].name,
						value: self.fields[i].value,
						index: self.fields[i].index
					});
				}
				// кидаем событие с новыми значениями полей
				self.fire('fieldsUpdate', {data: pack});
				self.hide();
			}			
		}
		this.correct = true;
	}
}

class LeafletStretcherPopup extends LeafletHashPopup{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
		this.index = data.index;
	}

	setContent(content){
		this.inputContent = '';		
		if(content){
			this.createFields(content);			
			// контент плашки - одно поле с координатами
			this.inputContent = '<div class="gzmtopblock"><input type="'+this.fields[0].inputType+'" id="'+this.fields[0].inputElement+'">';
			// достаем команды поля и дописываем код разметки
			for (var i = 0; i < this.fields[0].commands.length; i++){
				this.inputContent += '<div class="gzmbtn" id="'+this.fields[0].commands[i].elementID+'">'+this.fields[0].commands[i].caption+'</div>';
			}
			this.inputContent += '</div>';			
		}		
		this.view.setContent(this.inputContent);
	}

	fillValues(){}

	show(){		
		this.layer.removeLayer(this.view);
		// показываем саму плашку
		this.layer.addLayer(this.view);
		// заполняем значения появившихся элементов		
		for (var i = 0; i < this.fields.length; i++){
			this.fields[i].show();
		}
		var self = this;
		// обработчик клика кнопки Ok (перестановка вершины)
		document.getElementById(this.fields[0].commands[0].elementID).onclick = function(){			
			if (self.correct){				
				// кидаем событие с новыми значениями полей
				self.fire('moveNodeDirect', {
					primitiveID: self.objectID,
					event: 'popupMoveNode',
					coords: self.fields[0].value
				});
			}			
		}
		// обработчик клика кнопки удаления вершины
		document.getElementById(this.fields[0].commands[1].elementID).onclick = function(){						
			self.fire('removeNode', {
				primitiveID: self.objectID,
				event: 'popupRemoveNode'
			});
		}
		this.correct = true;
	}

	setLatLngs(ll){		
		let p = null;
		if (typeof ll[0] === 'object'){
			p = ll[0]
		} else
			p = ll;		
		this.view.setLatLng(p);
		// после того, как плашка была передвинута меняем ей значение поля с координатами
		if (this.fields[0]){			
			this.fields[0].setValue(p);
		}		
	}
}

class LeafletMarker1 extends LeafletObject{
	constructor(id, layer, data, owner, style){
		super(id, layer, data, owner, style);
		this.layer = layer;
		this.view = L.marker(data.point);
		layer.addLayer(this.view);
	}
}