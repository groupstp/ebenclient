/* 
	Сложная область объекта (абстрактный класс)
	Состоит из нескольких примитивов, организованых определённым образом.
	Имеет те же методы, что и обычный примитив (полигон, линия и т.д.), плюс grabIDs.
*/
window.ComplexArea = class ComplexArea extends SmartObject{

	constructor(ll){
		super();
	}

	getLatLngs(){}

	setLatLngs(){}

	setStyle(style){}

	getCenter(){}

	show(){}

	hide(){}

	grabIDs(){}
}