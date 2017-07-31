window.LeafletBounds = class LeafletBounds extends GzmBounds{

	fromNative(source){		
		let res = {};
		if (source instanceof Array){
			res.north = source[0];
			res.east = source[1],
			res.south = source[2];
			res.west = source[3];
		} else if (source instanceof LeafletBounds){
			res.north = source.getNorth();
			res.east = source.getEast(),
			res.south = source.getSouth();
			res.west = source.getWest();
		} else if (source instanceof L.LatLngBounds){
			res.north = source.getNorth();
			res.east = source.getEast(),
			res.south = source.getSouth();
			res.west = source.getWest();
		}
		return res;
	}

	toNative(){
		let
			ne = new L.LatLng(this._north, this._east),
			sw = new L.LatLng(this._south, this._west);
		return new L.LatLngBounds(ne, sw);
	}
}