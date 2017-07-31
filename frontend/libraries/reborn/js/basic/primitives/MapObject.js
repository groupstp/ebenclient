/*
	Класс примитивного объекта, добавляемого на карту
*/
window.MapObject = class MapObject extends SmartObject{
	constructor(id, layer, data, owner, style){
		super();
		this.objectID = id;
		this.style = style;
		this.owner = owner;
		this.isVisible = false;
	}

	/*
		Возвращает массив с координатами объекта, каждый элемент - объект с полями lat и lng
	*/
	getLatLngs(){return []}

	/*
		Перезаписыват координаты объекта
	*/
	setLatLngs(ll){}	

	setStyle(style){}

	show(){}

	hide(){}

	/*
		Возвращает прямоугольник, в который укладывается объект на карте
	*/
	getBounds(){}

	getCenter(){}

	/*
		Параллельный перенос объекта через изменение его центра
	*/
	transpose(newCenter){}
}