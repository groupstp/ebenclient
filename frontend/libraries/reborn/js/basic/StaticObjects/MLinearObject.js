/*
	Линейный объект, обозначаемый ломаной линией
*/
window.MLinearObject = class MLinearObject extends StaticObject{
	constructor(data, map, style){
		super(data, map);
		this.minimumNodes = 2;
		this.arrows = [];
		this.calc = GeoZoneManager.getCalculator();
		this.isMarking = false;
		this.marks = {markers: []};
		this.markedArea = null;		
		if (data.nodes){
			this.createArea(data.nodes);
			this.createMarkers();
		} else this.isVisible = false;
		this.directionArrow = this.createDirectionArrow();
		this.subscribe();
	}

	// подписка объекта на события
	subscribe(){
		this.addListener('stretcherDrag', function(context){
			this.middleStretcherDragHandler(context);
		});
		this.addListener('endingStretcherDrag', function(context){
			this.stretcherDragHandler(context);
		});
		this.addListener('stretcherDragStart', function(context){
			this.stretcherDragStartHandler(context);
		});
		this.addListener('stretcherDragEnd', function(context){
			this.stretcherDragEndHandler(context);
		});
		this.addListener('areaMouseOver', function(context){
			this.segmentMouseOverHandler(context);
		});
	}

	createArea(coords){
		var self = this;		
		this.Area = new LinearObjectComplexArea(coords, this, StaticMap.getStyleForObject(this));
		if (this.isComplete()){
			this.Area.show();
		}
		this.Area.addListener('click', function(context){			
			self.areaClickHandler(context);
		});
		this.Area.addListener('mouseover', function(context){
			self.fire('areaMouseOver', context);
		});		
		this.createGhostArea(coords);
	}

	areaClickHandler(context){	
		context.objectID = this.objectID;
		if (this.isMarking){
			let d = context.distance + this.Area.segments[context.segIndex].startsAt;
			this.setMark(d);
		} else this.fire('mapClick', context);
	}

	createDirectionArrow(){
		var da = this.map.createMarker(null, this, StaticMap.getStyleCollection().markers.directionArrow, false);
		da.segIndex = -1;
		da.distance = -1;
		var self = this;
		da.addListener('click', function(context){
			context.distance = this.distance;
			context.segIndex = this.segIndex;

			self.areaClickHandler(context);
		});
		da.addListener('mouseout',function(context){
			self.hideDirectionArrow();
		});
		return da;

	}

	createGhostArea(coords){
		this.ghostArea = this.map.createPolyline(coords, this, StaticMap.getStyleCollection()['ghostArea']);		
	}

	/*
		Метод, переводящий линейный объект в режим нанесения разметки для разбивки на пикеты
	*/
	startMarking(){
		if (this.isComplete() && !this.isMarking){
			// пишем, что объект находится в режиме нанесения разметки
			this.isMarking = true;
			// считываем координаты объекта
			let ll = this.Area.getLatLngs();
			// ставим 2 маркера - в начале и в конце объекта, размечая, таким образом, весь объект целиком
			this.setMark(0);
			this.setMark(this.Area.segments[this.Area.segments.length-1].endsAt);
		}
	}

	stopMarking(){
		this.isMarking = false;
		var self = this;
		// стереть маркеры
		if (this.marks.markers.length > 0){
			this.marks.markers.forEach(function(marker){
				self.map.removePrimitive(marker);
			});
			this.marks.markers = [];
		}		
		this.destroyMarkedArea();
	}

	// устанавливает маркер для нанесения пикетной разметки
	// distance - отметка расстояния, на которой стоит метка
	setMark(distance){
		// индекс сегмента, на который мы попадаем, координаты метки, счетчик и т.д.
		let index = -1, coords = null, i = 0, d = 0, ll = this.getLatLngs();
		// по дистанции определяем, на какой сегмент упала разметка	
		while (index < 0 && i < 100){
			if (this.Area.segments[i].startsAt <= distance && this.Area.segments[i].endsAt >= distance) {
				index = i;
			};
			i++;
		}
		// определяем координаты метки
		// смотрим, сколько осталось
		d = distance - this.Area.segments[index].startsAt;
		// откладываем точку
		coords = this.calc.forwardTask(ll[index], this.calc.getAngle(ll[index], ll[index+1]), d);		
		// создаём маркер
		let newMarker = this.map.createMarker(coords, this, StaticMap.getStyleCollection().markedArea.marker, false), oldMarker = null;
		newMarker.index = index;		
		// замеряем расстояние от маркера до начала сегмента, на котором он стоит
		newMarker.distance = distance;
		// если маркеров меньше 2, пушим новый маркер в массив
		if (this.marks.markers.length < 2){
			this.marks.markers.push(newMarker);
		} else {
			// если 2 маркера уже есть, выясняем, ближе к какому из них находится новый и заменяем
			// если оба имеющихся маркера стоят на 1 сегменте, то определяем заменяемый по расстоянию, иначе считаем по номерам сегментов
			if (this.marks.markers[0].index === this.marks.markers[1].index){
				if (Math.abs(newMarker.distance - this.marks.markers[0].distance) <= Math.abs(newMarker.distance - this.marks.markers[1].distance)){
					oldMarker = this.marks.markers[0];
					this.marks.markers[0] = newMarker;
				} else {
					oldMarker = this.marks.markers[1];
					this.marks.markers[1] = newMarker;
				}
			} else {
				if (Math.abs(newMarker.index - this.marks.markers[0].index) <= Math.abs(newMarker.index - this.marks.markers[1].index)){
					oldMarker = this.marks.markers[0];
					this.marks.markers[0] = newMarker;
				} else {
					oldMarker = this.marks.markers[1];
					this.marks.markers[1] = newMarker;
				}
			}
			this.map.removePrimitive(oldMarker);
		}
		newMarker.show();
		this.fire('markPlaced', {objectID: this.objectID, distance: newMarker.distance});
		if (this.marks.markers.length === 2){
			// если у нас есть 2 маркера, определяем, какой из них начальный, какой - конечный
			let swap = false;
			if (this.marks.markers[0].index === this.marks.markers[1].index){
				swap = (this.marks.markers[0].distance > this.marks.markers[1].distance);
			} else {
				swap = (this.marks.markers[0].index > this.marks.markers[1].index);
			}
			if (swap) 
				this.marks.markers = [this.marks.markers[1], this.marks.markers[0]];
			// после того, как оба маркера поставлены и определено их взаиморасположение, создаем размеченную область
			this.createMarkedArea();
		}
	}

	/*
		Создаём размеченную область
			Удаляем старую область, если она есть
			Формируем новую, записываем координату начального маркера, пробегаем все сегменты ЛО от начального маркера к конечному, записываем концы, записываем координату конечного маркера
			Сегменты получают обработчик, вызывающий LO.mark(index, latlng), т.е. ставящий маркер
	*/
	createMarkedArea(){
		// размеченная область рисуется только для объектов в режиме разметки и с 2 маркерами
		if (this.isMarking && this.marks.markers.length === 2){
			if (this.markedArea) this.destroyMarkedArea();
			let nodes = [], ll = this.getLatLngs();
			var self = this;
			// первая точка размеченной области - та, в которой стоит маркер
			nodes.push(this.marks.markers[0].getLatLngs()[0]);
			// собираем остальные точки - стыки между сегментами
			for (let i = this.marks.markers[0].index; i < this.marks.markers[1].index; i++){
				nodes.push(ll[i+1]);
			}
			// последняя точка размеченной области - та, в которой стоит маркер
			nodes.push(this.marks.markers[1].getLatLngs()[0]);
			this.markedArea = new LinearObjectComplexArea(nodes, this, StaticMap.getStyleCollection().markedArea.line, this.marks.markers[0].distance);			
			this.markedArea.addListener('click', function(context){
				let d = context.distance + this.segments[context.segIndex].startsAt;
				self.setMark(d);
			});
			this.markedArea.show();
			this.fire('markupComplete', {objectID: this.objectID, from: this.marks.markers[0].distance, to: this.marks.markers[1].distance});
		}
	}

	destroyMarkedArea(){
		for (let i = 0; i < this.markedArea.segments.length; i++){
			this.map.removePrimitive(this.markedArea.segments[i])
		}
		this.markedArea = null;
	}

	// создание стрелок по всей длине объекта
	createArrows(){		
		/*var calc = GeoZoneManager.getCalculator();
		// стрелки по умолчанию размещаются с интервалом в 100 метров
		const ARROWSTEP = 500;
		// Заряжаем шаг, с которым размещаются стрелки
		var d = ARROWSTEP, ll = [], i = 0, angle = 0, point = null, style = null, arrow = null;
		// Удаляем старые стрелки, если они есть, обнуляем массив с ними
		if (this.arrows && this.arrows.length){
			this.destroyArrows();
		}		
		ll = this.getLatLngs();
		for (var k = 1; k < ll.length-1; k++){
			//this.map.createMarker1(ll[k]);
		}
		// Пока пройденное расстояние не превосходит длину линейного объекта и мы не вышли за пределы его сегментов
		while (d < this.segments[this.segments.length-1].endsAt && i < this.segments.length){			
			// Если счетчик расстояния вышел из текущего сегмента, увеличиваем счетчик сегментов			
			while (d < this.segments[i].startsAt || d >= this.segments[i].endsAt){
				i++;
			}			
			// получаем XY начала и конца сегмента, находим угол наклона сегмента (в радианах)
			angle = calc.getAngle(ll[i], ll[i+1]);
			// решаем ПГЗ, находим точку, в которой будет рисоваться стрелка
			point = calc.forwardTask(ll[i], angle, d - this.segments[i].startsAt);			
			// создаем маркер со стрелкой, повернутой на угол, равный наклону сегмента			
			// изменяем стиль маркера, добавляя ему вращение
			// цвет стрелки считываем из линейного объекта, чтобы они сливались
			style = StaticMap.getStyleCollection().markers.directionArrow;			
			style.color = this.Area.getColor();
			style.rotate = calc.radToDeg(angle)*-1;			
			arrow = this.map.createMarker(point, this, style, false);			
			// пушим маркер в массив
			this.arrows.push(arrow);			
			// увеличиваем счетчик расстояния
			d += ARROWSTEP;
		}*/
	}

	/*
		Показывает все стрелки
	*/
	showArrows(){
		if (this.arrows){
			this.arrows.forEach(function(arrow){
				arrow.show();
			})
		}
	}

	/*
		Прячет все стрелки
	*/
	hideArrows(){
		if (this.arrows){
			this.arrows.forEach(function(arrow){
				arrow.hide();
			})
		}
	}

	showDirectionArrow(coords, segment, distance){
		var angle = this.calc.getAngle(segment.getLatLngs()[0], coords);		
		this.directionArrow.setLatLngs(coords);
		this.directionArrow.segIndex = segment.index;
		this.directionArrow.distance = distance;
		var style = StaticMap.getStyleCollection().markers.directionArrow;
		style.color = '#000000';
		style.rotate = this.calc.radToDeg(angle)*-1;
		this.directionArrow.setStyle(style);		
		if (!this.directionArrow.isVisible){			
			this.directionArrow.show();			
		}		
	}

	hideDirectionArrow(){		
		if (this.directionArrow.isVisible){			
			this.directionArrow.hide();
		}
	}

	hasBorders(){
		return true;
	}

	hasMarkers(){
		return true;
	}

	hasStretchers(){
		return true;
	}

	/*
		Создание (пересоздание) границ объекта
	*/
	createBorders(){
		// если в полигоне не хватает вершин, стороны не создаются
		if (this.isComplete()){
			this.borders = [];
			for (var i=0; i<this.Area.getLatLngs().length-1; i++){
				this.borders.push(this.createBorder(i));
			}			
		}
	}

	/*
		Создание границы с номером index
	*/
	createBorder(index){
		var
			self = this,
			ll = this.getLatLngs(),
			from = ll[index],			
			to = ll[index+1],
			border = this.map.createLine(from, to, this, StaticMap.getStyleCollection().defaultBorder);			
			border.index = index;
			border.addListener('click', function(context){
				self.map.fire('splitBorderVisual', {objectID: self.objectID, borderIndex: this.index, nodeIndex: this.index, coords: context.coords});				
			});
		return border;
	}

	/*
		Расщепление границы с номером index путем добавления точки с к-тами coords
	*/
	splitBorder(index, coords){		
		// если границы с таким индексом нет, выходим из метода
		if (!this.borders[index]) return;
		let	pointIndex = index + 1;
		// добавляем точку в позицию		
		this.Area.insertPoint(pointIndex, coords);
		this.ghostArea.setLatLngs(this.Area.getLatLngs());
		// удалить границу index
		this.map.removePrimitive(this.borders[index]);
		// соединить точки, оставшиеся без границ
		this.borders.splice(index, 1, this.createBorder(index));
		this.borders.splice(index+1, 0, this.createBorder(index+1));
		// сдвигаем индексы идущих следом границ на 1
		for (var i=index+2; i<this.borders.length; i++){
			this.borders[i].index = this.borders[i].index + 1;
		}
		// если объект выделен и видим, то созданные границы показываются
		if (this.isVisible && this.isSelected){
			this.borders[index].show();
			this.borders[index+1].show();
		}
		// добавляем новый стретчер
		this.addStretcher(pointIndex-1, pointIndex);
		this.addStretcherPopup(pointIndex, pointIndex);
		// сдвигаем индекс конечного маркера
		this.markers[1].index = this.Area.getLatLngs().length-1;
	}

	addNode(index, coords){
		let L = this.getLatLngs().length;
		if (index === 0){
			// добавляем точку в позицию		
			this.Area.insertPoint(index, coords);
			this.ghostArea.setLatLngs(this.Area.getLatLngs());
			this.borders.splice(index, 0, this.createBorder(0));
			for (var i = 1; i < this.borders.length; i++){
				this.borders[i].index++;
			}
			// если объект выделен и видим, то созданные границы показываются
			if (this.isVisible && this.isSelected){
				this.borders[index].show();
				this.borders[index+1].show();
			}
			this.adjustMarkers();
		} else {
			if (index < L){
				/*
					Индекс точки   1 2 3 4 5
					Индекс стороны 0 1 2 3 4
				*/
				this.splitBorder(index-1, coords);
			} else this.pushPoint(coords);
		}			
	}

	/*
		Директивно изменяет положение вершины с номером index, передвигая её в положение coords 
	*/
	moveNodeTo(index, coords){
		this.Area.moveNodeTo(index, coords);
		this.ghostArea.setLatLngs(this.Area.getLatLngs());
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
			if (this.stretchers[index-1]){
				this.stretchers[index-1].setLatLngs(coords);
			}
		}
		this.stretcherPopups[index].setLatLngs(coords);
	}

	/*
		Удаляет точку из объекта
	*/
	removeNode(index){
		/*
			Если удаляется 0 вершина, то отвалится самый первый сегмент и конечный маркер переместится на следующую точку
				удаляем 0 плашку, у всех остальных двигаем индексы
				удаляем 0 стретчер, у всех остальных двигаем индексы
				подгоняем маркеры
			Если удаляется конечная вершина
				удаляем последнюю плашку
				удаляем последний стретчер
				подгоняем маркеры
			Если удаляется вершина из середины
				удаляем стретчер и плашку с номером index
				у всех следующих двигаем индексы
		*/
		if (index === 0){
			this.removeStretcher(0);
			this.removeStretcherPopup(0);
		} else if (index === this.getLatLngs().length-1){
			this.removeStretcher(this.stretchers.length-1);
			this.removeStretcherPopup(this.stretcherPopups.length-1);
		} else {
			this.removeStretcher(index-1);
			this.removeStretcherPopup(index);
		}
		this.Area.removeNode(index);
		this.ghostArea.setLatLngs(this.Area.getLatLngs());
		// поправляем маркеры
		this.adjustMarkers();
		// перерисовываем границы
		this.redrawBorders();
	}

	// создание маркеров линейного объекта
	// маркеры ЛО при растягивании ведут себя аналогично стретчерам
	createMarkers(){		
		let latlon = this.getLatLngs();
		// маркеры можно создавать только тогда, когда в объекте есть точки
		if (latlon.length > 0){
			var self = this;
			/*
				Во время поточечного создания ЛО при установке первой точки ставится не стретчер, а основной маркер;
				затем, когда ставится вторая точка, к нему добавляется второй маркер;
				стретчеры появляются тогда, когда точек в ЛО становится 3+;
			*/
			/*
				В цикле создаём маркеры;
				Метод может вызываться дважды при поточечном создании объекта, тогда сначала создастся начальный маркер, затем конечный;
				При развертывании объекта создаются сразу оба;
				Для управления созданием используются переменные start и count.

				Если один маркер уже создан, то будет всего 1 итерация; иначе - от 1 до 2;
				Если в объекте всего 1 точка, то будет всего 1 итерация; иначе - от 1 до 2;
			*/
			let
				start = (this.markers.length === 0) ? 0 : 1,
				count = (latlon.length > 1) ? 2 : 1;

			for (var i = start; i < count; i++){
				// по номеру маркера определяем, к какой координате он относится
				let coord = (i === 0) ? latlon[0] : latlon[latlon.length-1];
				// создаем маркер
				let m = this.map.createMarker(coord, this, StaticMap.getStyleCollection().markers.defaultMarker, this.isStretching);
				// выдаем маркеру индекс
				m.index = (i === 0) ? 0 : latlon.length-1;
				// создаем маркеру плашку
				this.stretcherPopups.splice(m.index, 0, this.createStretcherPopup(m.index));
				// вешаем обработчики
				m.addListener('dragstart', function(context){
					context.index = this.index;					
					self.fire('stretcherDragStart', context);
				});
				m.addListener('drag', function(context){
					context.index = this.index;
					self.fire('endingStretcherDrag', context);
				});
				m.addListener('dragend', function(context){
					context.index = this.index;
					self.fire('stretcherDragEnd', context);
				});
				m.addListener('click', function(context){					
					self.stretcherPopups[this.index].show();
				});
				// пушим маркер в массив
				this.markers.push(m);
			}
		}		
	}

	/*
		Корректирует позицию начального и конечного маркера
	*/
	adjustMarkers(){		
		if (this.markers.length){
			var latlon = this.ghostArea.getLatLngs();			
			this.markers[0].setLatLngs(latlon[0]);
			this.markers[1].index = latlon.length-1;
			this.markers[1].setLatLngs(latlon[latlon.length-1]);			
		}
	}

	/*
		Перебирает все сегменты, пушит коодинаты в массив
	*/
	getLatLngs(){
		var ll = [];
		if (this.Area){			
			ll = this.Area.getLatLngs();
		}
		return ll;
	}

	/*
		Перезаписывает координаты объекта
	*/
	setLatLngs(ll){
		if (this.Area){
			this.Area.setLatLngs(ll);
		}
	}

	/*
		Добавляет точку в конец линейного объекта
	*/
	pushPoint(coords){
		// если области нет, создаём её
		if (!this.Area){
			this.createArea([coords]);
			// создаём маркер в первой точке
			this.createMarkers();
			this.showMarkers();
		} else {
			let ghost = this.ghostArea.getLatLngs(); 
			ghost.push(coords);			
			this.ghostArea.setLatLngs(ghost);
			// если область есть, но объект не завершен
			if (!this.isComplete()){
				// добавляем точку и завершаем объект
				this.Area.pushPoint(coords);
				// создаем маркеры
				this.createMarkers();
				// показываем объект
				this.show();
			} else {
				// если объект завершен
				this.Area.pushPoint(coords);
				this.adjustMarkers();
				// создаём стретчер
				this.addStretcher(this.stretchers.length, this.Area.getLatLngs().length - 2);
				this.addStretcherPopup(this.Area.getLatLngs().length - 1, this.Area.getLatLngs().length - 1);
			}
			// создаем новую границу
			this.borders.push(this.createBorder(this.Area.getLatLngs().length - 2));
			// если объект видим, показываем новый сегмент
			if (this.isVisible){
				// если объект выделен, показываем новую границу
				if (this.isSelected){					
					this.borders[this.borders.length-1].show();
				}
			}
		}		
	}

	/*
		Переводит объект в режим растягивания
	*/
	stretch(){
		super.stretch();
		if (this.markers.length){
			this.markers.forEach(function(m){
				m.enableDragging();
			});
		}
	}

	freeze(){
		super.freeze();
		if (this.markers.length){
			this.markers.forEach(function(m){
				m.disableDragging();
			});
		}
	}

	unselect(){
		super.unselect();
		if (this.isMarking) this.stopMarking();
	}

	middleStretcherDragHandler(context){		
		this.stretcherDragHandler(context);
		// подгоняем положение маркеров
		this.adjustMarkers();
	}

	// обработка передвижения маркера
	stretcherDragHandler(context){
		// находим смежные границы
		var adjucentBorders = this.getAdjacentBorders(context.index);		
		// двигаем границы (у следующей меняется начало, у предыдущей - конец)
		if (adjucentBorders.hasOwnProperty('next')){
			let bnext = this.borders[adjucentBorders.next].getLatLngs();
			bnext[0] = context.coords;
			this.borders[adjucentBorders.next].setLatLngs(bnext);
		}
		if (adjucentBorders.hasOwnProperty('prev')){
			let bprev = this.borders[adjucentBorders.prev].getLatLngs();
			bprev[1] = context.coords;
			this.borders[adjucentBorders.prev].setLatLngs(bprev);
		}
		let ghost = this.ghostArea.getLatLngs(); ghost.splice(context.index, 1, context.coords);		
		this.ghostArea.setLatLngs(ghost);

	}

	// начало движения
	stretcherDragStartHandler(context){
		// при начале движения делаем смежные границы пунктирными
		var adjucentBorders = this.getAdjacentBorders(context.index);		
		if (adjucentBorders.hasOwnProperty('next')){
			this.borders[adjucentBorders.next].setStyle(StaticMap.getStyleCollection().dottedBorder);
		}
		if (adjucentBorders.hasOwnProperty('prev')){
			this.borders[adjucentBorders.prev].setStyle(StaticMap.getStyleCollection().dottedBorder);
		}
	}

	// окончание движения
	stretcherDragEndHandler(context){
		// при окончании движения делаем смежные границы сплошными
		var adjucentBorders = this.getAdjacentBorders(context.index);
		if (adjucentBorders.hasOwnProperty('next')){
			this.borders[adjucentBorders.next].setStyle(StaticMap.getStyleCollection().defaultBorder);
		}
		if (adjucentBorders.hasOwnProperty('prev')){
			this.borders[adjucentBorders.prev].setStyle(StaticMap.getStyleCollection().defaultBorder);
		}
		context.objectID = this.objectID;		
		this.map.fire('moveNodeVisual', context);

	}

	segmentMouseOverHandler(context){		
		this.showDirectionArrow(context.coords, this.Area.segments[context.segIndex], context.distance);
	}	

	getArchetype(){
		return 'Line';
	}

	/*
		Возвращает ID всех примитивов, из которых состоит объект
	*/
	grabIDs(){
		var result = [];
		// ID области
		let segs = 	this.Area.grabIDs();
		for (var i in segs){
			result.push(segs[i]);
		}		
		// стретчеры
		for (var i = 0; i < this.stretchers.length; i++){
			result.push(this.stretchers[i].objectID);
		}
		// границы
		for (var i = 0; i < this.borders.length; i++){
			result.push(this.borders[i].objectID);
		}
		// маркеры
		for (var i = 0; i < this.markers.length; i++){
			result.push(this.markers[i].objectID);
		}
		// стрелки
		for (var i = 0; i < this.arrows.length; i++){
			result.push(this.arrows[i].objectID);
		}		
		return result;
	}	
}