/* 
	Сложная область линейного объекта
	Состоит из совокупности отрезков-сегментов.
	Имеет те же методы, что и обычный примитив (полигон, линия и т.д.), плюс grabIDs.
*/
window.LinearObjectComplexArea = class LinearObjectComplexArea extends ComplexArea{

	constructor(ll, owner, style, startsAt=0){
		super();
		this.owner = owner;
		this.latlngs = ll;
		this.segments = [];
		this.style = style;
		this.isVisible = false;
		this.calc = owner.calc;
		this.startsAt = startsAt;
		this.length = 0;
		// если есть из чего делать отрезки, создаём их
		if (ll.length > 1){
			for (var i = 0; i < ll.length-1; i++){				
				this.addSegment([ll[i], ll[i+1]], this.style, i);
			}
			this.length = this.segments[this.segments.length-1].endsAt;
		}
	}

	/* Общие методы */
	getLatLngs(){
		return this.latlngs;
	}

	setLatLngs(ll){		
		// стираем сегменты, если они есть
		for (var i = 0; i < this.segments.length; i++){
			this.owner.map.removePrimitive(this.segments[i]);
		}
		this.segments = [];		
		this.latlngs = ll;		
		if (this.latlngs.length > 1){			
			for (var i = 0; i < this.latlngs.length-1; i++){
				let coords = [this.latlngs[i], this.latlngs[i+1]];
				let index = i;				
				this.addSegment(coords, this.style, index);
			}
		}
	}

	setStyle(style){
		for (var i = 0; i < this.segments.length; i++){
			this.segments[i].setStyle(style);
		}
	}

	getColor(){
		return this.segments[0].getColor();
	}

	getCenter(){}

	show(){
		this.isVisible = true;
		this.segments.forEach(function(seg){
			seg.show();
		});
	}

	hide(){
		this.isVisible = false;
		this.segments.forEach(function(seg){
			seg.hide();
		});
	}

	grabIDs(){
		var result = [];
		for (var i in this.segments){			
			result.push(this.segments[i].objectID);
		}		
		return result;
	}

	/* Специальные методы */

	// добавление сегмента в позицию index
	addSegment(ll, style, index){
		// создаем линию, овнер примитива - область, а не сам ЛО		
		var 
			seg = this.owner.map.createLine(ll[0], ll[1], this, style),
			self = this;		
		seg.index = index;
		// если сегмент добавляется не в начало, то считаем его параметры отталкиваясь от предыдущего сегмента
		// ставим отметку начала		
		if (seg.index > 0){
			seg.startsAt = this.segments[index-1].endsAt;
		} else {
			seg.startsAt = this.startsAt;
		}
		// находим длину и отметку конца
		seg.length = this.calc.getDistance(ll[0], ll[1]);
		seg.endsAt = seg.startsAt + seg.length;
		seg.addListener('click', function(context){
			context.segIndex = this.index;
			context.distance = self.calc.getDistance( this.getLatLngs()[0], context.coords);
			self.fire('click', context);
		});
		seg.addListener('mouseover', function(context){
			context.segIndex = this.index;
			context.distance = self.calc.getDistance( this.getLatLngs()[0], context.coords);
			self.fire('mouseover', context);
		});
		seg.addListener('mouseout', function(context){
			context.segIndex = this.index;
			self.fire('mouseout', context);
		});
		// кладем новый сегмент в массив
		this.segments.splice(index, 0, seg);		
		if (this.isVisible){
			seg.show();
		}		
	}
	
	// перемещает вершину с номером index в позицию coords
	moveNodeTo(index, coords){
		// определяем, какие сегменты прилегают к перемещаемой вершине
		var adjucentBorders = this.owner.getAdjacentBorders(index);
		// изменяем координаты предыдущего и следующего сегментов в зависимости от их наличия
		if (adjucentBorders.hasOwnProperty('next')){
			let bnext = this.segments[adjucentBorders.next].getLatLngs();			
			bnext[0] = coords;
			this.segments[adjucentBorders.next].setLatLngs(bnext);
		}
		if (adjucentBorders.hasOwnProperty('prev')){
			let bprev = this.segments[adjucentBorders.prev].getLatLngs();
			bprev[1] = coords;
			this.segments[adjucentBorders.prev].setLatLngs(bprev);
		}
		// изменяем общие координаты самой области
		this.latlngs.splice(index, 1, coords);
	}

	removeNode(index){		
		if (index === 0){
			this.owner.map.removePrimitive(this.segments[0]);
			this.segments.splice(0,1);
			this.recalcSegments(0);
		} else if (index === this.latlngs.length-1){
			this.owner.map.removePrimitive(this.segments[this.segments.length-1]);
			this.segments.splice(this.segments.length-1,1);
		} else {
			this.owner.map.removePrimitive(this.segments[index]);
			this.segments[index-1].setLatLngs([this.latlngs[index-1], this.latlngs[index+1]]);
			this.segments.splice(index,1);
			this.recalcSegments(index-1);
		}
		this.latlngs.splice(index, 1);
		
	}
	
	// перемещает вершину с номером index в позицию coords
	pushPoint(coords){
		this.latlngs.push(coords);
		if (this.latlngs.length > 1){
			var ll = [this.latlngs[this.latlngs.length-2], this.latlngs[this.latlngs.length-1]];
			var index = this.segments.length;
			this.addSegment(ll, this.style, index);
		}
	}

	// добавляет точку в середину объекта
	insertPoint(index, coords){
		// вставляем точку в указанную позицию
		this.latlngs.splice(index, 0, coords);
		var 
			ll1 = [], ll2 = [],
			segmentIndex;
		// если точка добавляется в начало
		if (index === 0){
			ll = [coords, this.latlngs[0]];
			this.addSegment(ll, this.style, index);
			// пересчитываем длины и индексы сегментов
			this.recalcSegments(index+1);
		} else 
		// если точка добавляется в конец
		if (index === this.latlngs.length){
			ll = [this.latlngs[this.latlngs.length-1], coords];
			this.addSegment(ll, this.style, index);
			// пересчитывать ничего не нужно
		} else
		// если точка добавляется в середину
		{
			// нужно удалить сегмент и заменить его на 2, сходящихся во вставляемой точке
			// индекс удаляемого сегмента
			segmentIndex = index - 1;
			// готовим координаты
			ll1 = [this.segments[segmentIndex].getLatLngs()[0], coords];
			ll2 = [coords, this.segments[segmentIndex].getLatLngs()[1]];
			// создаём первый сегмент-заменитель			
			this.addSegment(ll1, this.style, segmentIndex);
			// создаём второй сегмент-заменитель
			this.addSegment(ll2, this.style, segmentIndex+1);
			// убираем расщеплённый сегмент
			this.owner.map.removePrimitive(this.segments[segmentIndex+2]);
			this.segments.splice(segmentIndex+2, 1);
			// пересчитываем параметры идущих следом сегментов
			this.recalcSegments(segmentIndex+2);
		}		
	}

	// пересчитывает параметры сегментов ЛО начиная с сегмента с номером index
	recalcSegments(index){		
		var start;
		// если рассчет начинается с самого начала, то первым делом обсчитываем отдельно начальный сегмент
		if (index > 0){
			start = index;
		} else {
			this.segments[0].startsAt = 0;
			this.segments[0].length = this.calc.getDistance(this.segments[0].getLatLngs()[0], this.segments[0].getLatLngs()[1]);
			this.segments[0].endsAt = this.segments[0].startsAt = this.segments[0].length;
			this.segments[0].index = 0;
			start = 1;
		}
		// перебираем сегменты до конца, считаем индекс, начало, конец и длину
		for (var i = start; i < this.segments.length; i++){
			this.segments[i].startsAt = this.segments[i-1].endsAt;
			this.segments[i].length = this.calc.getDistance(this.segments[i].getLatLngs()[0], this.segments[i].getLatLngs()[1]);
			this.segments[i].endsAt = this.segments[i].startsAt = this.segments[i].length;
			this.segments[i].index = this.segments[i-1].index + 1;
		}
	}

	// удаляет сегмент с номером index
	removeSegment(index){
		var ll = null;
		// удаляем примитив с карты		
		this.owner.map.removePrimitive(this.segments[index]);
		// если удаляемый сегмент был не первым/последним, то смыкаем сегменты, между которыми образовалась дырка
		if (index > 0 && index < this.segments.length-1){			
			ll = [this.segments[index-1].getLatLngs()[0], this.segments[index+1].getLatLngs()[0]];
			this.segments[index-1].setLatLngs(ll);
		}
		// удаляем сегмент из массива
		this.segments.splice(index, 1);
	}
}