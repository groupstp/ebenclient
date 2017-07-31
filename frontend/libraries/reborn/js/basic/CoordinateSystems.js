class Coordinates(){
	constructor(){}

	getProjection(){
		return this.constructor.name;
	}
}

class LatLonCoordinates extends Coordinates{
	constructor(lat, lng){
		this.lat = lat;
		this.lng = lng;
	}
}

class MetricCoordinates extends Coordinates{
	constructor(x, y){
		this.x = x;
		this.y = y;
	}
}


class GaussKruger extends MetricCoordinates{
	constructor(x, y){
		super(x,y);
	}	
}

class UTM extends MetricCoordinates{
	constructor(x, y, zone){
		super(x,y);
		this.zone = zone;
	}
}

class SK42 extends LatLonCoordinates{
	constructor(lat, lng){
		super(lat, lng);
	}
}

class WGS84 extends LatLonCoordinates{
	constructor(lat, lng){
		super(lat, lng);
	}
}