window.GzmBounds = class GzmBounds {

	constructor(source){		
		let raw = this.fromNative(source);		
		this._north = raw.north;
		this._east = raw.east;
		this._south = raw.south;
		this._west = raw.west;
	}

	// конвертирует исходные нативные границы (подлежит переопределению)
	fromNative(source){
		return {
			north: null,
			south: null,
			east: null,
			west: null
		};
	}

	// возвращает платформенно-зависимый объект границ, построенный из общего (подлежит переопределению)
	toNative(){
		return null;
	}	

	// манипуляции с объектом
	// возвращает другие границы, полученные путём объединения с другими (либо с одним объектом, либо с массивом)
	unite(anotherBounds){
		let
			n = Math.max(anotherBounds.getNorth(), this._north),
			e = Math.max(anotherBounds.getEast(), this._east),
			s = Math.min(anotherBounds.getSouth(), this._south),
			w = Math.min(anotherBounds.getWest(), this._west),
			arg = [n, e, s, w];		
		return eval('new '+this.constructor.name+'(arg)');
	}

	// возвращает границы, полученные путем дополнения текущих границ точкой
	extend(coords){
		let
			s = Math.min(coords[0], this._south),
			n = Math.max(coords[0], this._north),
			e = Math.max(coords[1], this._east),
			w = Math.min(coords[1], this._west),
			arg = [n, e, s, w];
		return eval('new '+this.constructor.name+'(arg)');
	}

	// возвращает увеличенные на num % границы
	broadenBy(num){
		let
			bufHeight = Math.abs(this._south - this._north) * num,
			bufWidth = Math.abs(this._west - this._east) * num,
			n = this._north + bufHeight,
			e = this._east + bufWidth,
			s = this._south - bufHeight,
			w = this._west - bufWidth;arg = [n, e, s, w];
		return eval('new '+this.constructor.name+'(arg)');
	}

	// проверки
	// проверка на попадание точки в границы
	contains(coords){
		return (coords[0] >= this._south) && (coords[0] <= this._norths) && 
			   (coords[1] >= this._west) && (coords[1] <= this.east);
	}

	includes(bounds){
		return (this._north >= bounds.getNorth() && this._east >= bounds.getEast() && this._south <= bounds.getSouth() && this._west <= bounds.getWest());
	}

	// проверка на пересечение
	intersects(bounds){
		let
			latIntersects = (bounds._north >= this._south) && (bounds._south <= this._north),
			lngIntersects = (bounds._east >= this._west) && (bounds._west <= this._east);
		return latIntersects && lngIntersects;
	}

	// проверка на перекрывание
	overlaps(bounds){
		let
			latOverlaps = (bounds._north > this._south) && (bounds._south < this._north),
			lngOverlaps = (bounds._east > this._west) && (bounds._west < this._east);
		return latOverlaps && lngOverlaps;
	}

	// проверка на совпадение
	equals(bounds){
		return (bounds._north === this._north) && (bounds._east === this._east) && (bounds._south === this._south) && (bounds._west === this._west);
	}

	// получение координат границ по сторонам света
	getSouth(){
		return this._south;
	}

	getNorth(){
		return this._north;
	}

	getWest(){
		return this._west;
	}

	getEast(){
		return this._east;
	}

	getSouthWest(){
		return this._south && this._west ? [this._south, this._west] : null;
	}

	getNorthWest(){
		return this._north && this._west ? [this._north, this._west] : null;
	}

	getSouthEast(){
		return this._south && this._east ? [this._south, this._east] : null;
	}

	getNorthEast(){
		return this._north, this._east ? [this._north, this._east] : null;
	}

	// центр
	getCenter(){
		return [(this._north + this._south) / 2, (this._west + this._east) / 2 ];
	}
}