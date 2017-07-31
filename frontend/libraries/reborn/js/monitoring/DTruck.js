window.DTruck = class DTruck extends DynamicObject{
	/*
		Атрибуты
			Текущая позиция
			Хинт
			Подпись
		Части
			Маркер
			Подпись
		Методы
			Показать
			Спрятать
			Переставить		
	*/
	constructor(uuid, map, position, hint, title, props){
		super(uuid, map, position, hint, title, props);
	}
}