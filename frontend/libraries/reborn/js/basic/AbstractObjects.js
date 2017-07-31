/*
	Геозона, обозначаемая полигоном
*/
window.GeoZone = class GeoZone extends GeoObject{
	constructor(data, view, master){
		super(data, view, master);
		this.minimumNodes = 3;		
	}

	/*
		Строит четырёхугольную геозону вокруг полученной точки
	*/
	static calculate(initialPoint, dimension){
		var 
			ll = [],
			calc = GeoZoneManager.getCalculator(),
			center = null;
		center = calc.fromLatLngToXY(initialPoint);
		// заполняем массив клонами центра
		for (var i = 0; i < 4; i++){
			ll.push(JSON.parse(JSON.stringify(center)));
		}
		// изменяем координаты, чтобы получить прямоугольник
		ll[0].x = ll[0].x - dimension.width/2; ll[0].y = ll[0].y + dimension.height/2;
		ll[1].x = ll[1].x + dimension.width/2; ll[1].y = ll[1].y + dimension.height/2;
		ll[2].x = ll[2].x + dimension.width/2; ll[2].y = ll[2].y - dimension.height/2;
		ll[3].x = ll[3].x - dimension.width/2; ll[3].y = ll[3].y - dimension.height/2;
		// переводим в широту и долготу
		for (var i = 0; i < 4; i++){
			ll[i] = calc.fromXYtoLatLng(ll[i]);
		}
		/*ll.push(StaticMap.fromXYtoLatLng({x: center.x - dimension.width/2, y: center.y + dimension.height/2}));
		ll.push(StaticMap.fromXYtoLatLng({x: center.x + dimension.width/2, y: center.y + dimension.height/2}));
		ll.push(StaticMap.fromXYtoLatLng({x: center.x + dimension.width/2, y: center.y - dimension.height/2}));
		ll.push(StaticMap.fromXYtoLatLng({x: center.x - dimension.width/2, y: center.y - dimension.height/2}));	*/
		return ll;
	}

	static getDefaultDimension(){
		return {width: 50, height: 50};
	}

	splitBorder(index, coords){		
		this.latLngs.splice(index+1, 0, coords);
		this.isModified = true;
		if (this.view) this.view.splitBorder(index, coords);		
	}

	transpose(newCenter){
		const 
			oldCenter = this.getCenter(),
			delta = [newCenter[0] - oldCenter[0], newCenter[1]-oldCenter[1]],
			oldNodes = this.getLatLngs();
		let newNodes = oldNodes.map((latlon) => { return [latlon[0]+delta[0], latlon[1]+delta[1]] });
		this.setLatLngs(newNodes);
	}

	addChild(obj){		
		this.children.push(obj);
		obj.parent = this;
		if (this.view && obj.view){
			this.view.addChild(obj.view);
		}		
	}

}

/*
	Полигональный капитальный объект
*/
window.CapitalPlaneObject = class CapitalPlaneObject extends GeoZone{
	constructor(data, view, master){
		super(data, view, master);
	}
}

/*
	Пикет, обозначаемый полигоном; используется для деления дорог на участки
*/
window.Picket = class Picket extends GeoObject{
	constructor(data, view, master){
		super(data, view, master);
		this.minimumNodes = 6;		
	}	

	// производит рассчет и строит пикет по координатам, возвращает массив с координатами
	static calculate(segments, startsAt, length, width){		
		// вспомогательная функция для обсчета поворотов
		function getTurnPoint(i, deflection){
			let p1, p2, l1, l2;
			p1 = calc.forwardTaskXY(segments[i].start, segments[i].angle+deflection, width/2);
			p2 = calc.forwardTaskXY(segments[i].end, segments[i].angle+deflection, width/2);
			l1 = calc.getLineEquation(p1, p2);
			p1 = calc.forwardTaskXY(segments[i+1].start, segments[i+1].angle+deflection, width/2);
			p2 = calc.forwardTaskXY(segments[i+1].end, segments[i+1].angle+deflection, width/2);
			l2 = calc.getLineEquation(p1, p2);
			return calc.getLinesIntersection(l1,l2);
		}
		// угол поворота - 90 градусов в радианах
		const turn = 1.5708;
		let
			// калькулятор
			calc = GeoZoneManager.getCalculator(),
			// осевая точка (используется для прохождения поворотов)
			axialPoint = null,
			// массивы с точками полигона: перед, зад, левая и правая сторона (чтобы не путаться в индексах)
			rearSide = new Array(3),
			frontSide = new Array(3),
			leftSide = [],
			rightSide = [],
			// сегменты ЛО, на которых начинается и кончается пикет
			startSegment = null,			
			endSegment = null,
			// конечная отметка пикета
			endsAt = startsAt + length,
			// вспомогательная переменная для откладывания расстояний
			d = 0,
			// вспомогательная переменная для хранения промежуточных отметок расстояния
			mark = 0,
			// счетчик
			i = 0;
		// находим стартовый сегмент		
		while (!startSegment){			
			if (segments[i].startsAt <= startsAt && segments[i].endsAt > startsAt) startSegment = segments[i];
			i++;
		}
		// находим конечный сегмент, если пикет не влезает, обрезаем его
		i = 0;		
		while (!endSegment){
			if (segments[i].endsAt >= endsAt && segments[i].startsAt < endsAt) {
				endSegment = segments[i]
			} else if (i === segments.length-1 && endsAt < segments[i]) {
				endsAt = segments[i].endsAt;
				endSegment = segments[i];
			}
			i++;
		}		
		// строим задний торец пикета из 3 точек
		d = startsAt - startSegment.startsAt;
		// центральная (осевая) точка
		rearSide[1] = calc.forwardTaskXY(startSegment.start, startSegment.angle, d);
		axialPoint = rearSide[1];
		// точки справа и слева
		rearSide[0] = calc.forwardTaskXY(rearSide[1], startSegment.angle-turn, width/2);
		rearSide[2] = calc.forwardTaskXY(rearSide[1], startSegment.angle+turn, width/2);

		// проходим повороты
		// запоминаем полную длину пикета
		// !т.к. пикет может не влезать в размечаемую область, то endsAt-startsAt не обязательно равно length		
		d = endsAt - startsAt;		
		if (startSegment.index !== endSegment.index){
			// задаём временную отметку расстояния - точку отсчета
			mark = startsAt;
			// перебираем сегменты, через стыки между которыми проходит пикет
			for (i = startSegment.index; i < endSegment.index; i++){
				// если углы сегментов разные, вычисляем точки на поворотах, если одинаковые, то все чуть проще
				// !!! i+1
				if (segments[i].angle !== segments[i+1].angle){
					// левая сторона				
					leftSide.push(getTurnPoint(i, turn));
					// правая сторона
					rightSide.push(getTurnPoint(i, turn*-1));	
				} else {
					leftSide.push(calc.forwardTaskXY(segments[i].end, segments[i].angle+turn, width/2));
					rightSide.push(calc.forwardTaskXY(segments[i].end, segments[i].angle-turn, width/2));
				}
				// отнимаем от длины пройденное после очередного стыка расстояние
				d -= (segments[i].endsAt - mark);
				// сдвигаем точку отсчёта для следующей итерации
				mark = segments[i].endsAt;
				axialPoint = segments[i].end;
			}
		}		
		// строим передний торец
		// осевая точка
		// если поворотов не было, то d равняется длине пикета (возможно урезаной)
		// если повороты были, то d уменьшено
		frontSide[1] = calc.forwardTaskXY(axialPoint, endSegment.angle, d);
		// точки слева и справа
		frontSide[0] = calc.forwardTaskXY(frontSide[1], endSegment.angle+turn, width/2);
		frontSide[2] = calc.forwardTaskXY(frontSide[1], endSegment.angle-turn, width/2);
		/*let 
			frontSide1 = frontSide.map((node)=>{return calc.fromXYtoLatLng(node)}), 
			rearSide1 = rearSide.map((node)=>{return calc.fromXYtoLatLng(node)}), 
			leftSide1 = leftSide.map((node)=>{return calc.fromXYtoLatLng(node)}), 
			rightSide1 = rightSide.map((node)=>{return calc.fromXYtoLatLng(node)});
		console.log('--------------------');
		console.log(rearSide1.toString());
		console.log(frontSide1.toString());
		console.log(leftSide1.toString());
		console.log(rightSide1.toString());*/
		// склеиваем стороны (правую разворачиваем, ведь по сути мы пушили в неё точки наоборот)
		let res = rearSide.concat(leftSide, frontSide,  rightSide.reverse());
		// переводим результат в широту и долготу
		return res.map((node)=>{return calc.fromXYtoLatLng(node)});

	}

	/* Пикет нельзя редактировать стандартными способами, поэтому методы редактирования выключены (кроме перезаписи координат)*/
	moveNodeTo(index, coords){}
	removeNode(index){}
	pushPoint(ll){}
	addNode(index, coords){}
}

/*
	Окружность
*/
window.CircleObject = class CircleObject extends GeoObject{
	constructor(data, view, master){
		super(data, view, master);
		this.minimumNodes = 1;
		this.center = data.center;
		this.radius = data.radius;
		this.latLngs = [this.radius];
	}

	getLatLngs(){
		return this.latLngs;
	}

	setRadius(newRadius){		
		this.radius = newRadius;
		this.isModified = true;
		if (this.view) this.view.setRadius(newRadius);

	}

	setCenter(newCenter){
		this.center = newCenter;
		this.isModified = true;
		if (this.view) this.view.setCenter(newCenter);
	}

	transpose(newCenter){
		this.setCenter(newCenter);
	}

	// у окружностей не работает
	setLatLngs(ll){}

	moveNodeTo(index, coords){}

	removeNode(index){}

	pushPoint(ll){}

	addNode(index, coords){}

	getBounds(){}

	getCenter(){		
		return this.center;
	}

	getRadius(){
		return this.radius;
	}

	isComplete(){
		return (this.getLatLngs().length >= this.minimumNodes);
	}

	static getDefaultRadius(){ return 5000; }

	//-------------------
}

/*
	Круглая геозона
*/
window.CircleGeoZone = class CircleGeoZone extends CircleObject{
	constructor(data, view, master){
		super(data, view, master);
	}
}

/*
	Регион - очень большая нередактируемая геозона
*/
window.Region = class Region extends GeoZone{
	constructor(data, view, master){
		super(data, view, master);
	}
}

/*
	Линейный объект, обозначаемый ломаной линией
*/
window.LinearObject = class LinearObject extends GeoObject{
	constructor(data, view, master){
		super(data, view, master);
		this.minimumNodes = 2;
	}

	splitBorder(index, coords){
		this.latLngs.splice(index, 0, coords);
		this.isModified = true;
		if (this.view) this.view.splitBorder(index, coords);
	}
}

/*
	Дорога, обозначаемая ломаной. Дробится на пикеты
*/
window.Road = class Road extends LinearObject{
	constructor(data, view, master){
		super(data, view, master);
	}
}

/*
	Маршрут, соединяющий контрольные точки
*/
window.SimpleRoute = class SimpleRoute extends LinearObject{
	constructor(data, view, master){
		super(data, view, master);
	}
}

/*
	Маршрут, соединяющий контрольные точки
*/
window.FactRoute = class FactRoute extends SimpleRoute{
	constructor(data, view, master){
		super(data, view, master);
		// данный объект является временным и его не надо сохранять в базу
		this.isDummy = true;
	}
}

window.PlannedRoute = class PlannedRoute extends SimpleRoute{
	constructor(data, view, master){
		super(data, view, master);
		// данный объект является временным и его не надо сохранять в базу
		this.isDummy = true;
	}
}


/*
	Точечный объект, обозначаемый маркером
*/
window.PointObject = class PointObject extends GeoObject{
	constructor(data, view, master){
		super(data, view, master);
		this.minimumNodes = 1;
	}	

	pushPoint(ll){
		this.latLngs = [ll];
		if (this.view) this.view.pushPoint(ll);
	}
}

/*
	Точечный капитальный объект
*/
window.CapitalPointObject = class CapitalPointObject extends PointObject{
	constructor(){}
}