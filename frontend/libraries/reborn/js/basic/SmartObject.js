/*
	Класс, умеющий подписываться на события и реагировать на них.
*/
window.SmartObject = class SmartObject{
	constructor(){
		// обработчики событий; по ключу, содержащему имя события мы получаем доступ к массиву коллбэков
		this.handlers = {};		
	}

	/* 
		подписка на событие 
	*/
	addListener(event, callback){
		if (!(event in this.handlers)){		
			this.handlers[event] = [];
		}
		this.handlers[event].push(callback);
	}

	/*
		Удаляет все обработчики заданного события
	*/
	clearListeners(event){
		this.handlers[event] = [];
	}

	/*
		вызов события
	*/
	fire(event, data){
		// если объект подписан на событие
		if (event in this.handlers){			
			// перебираем коллбэки в массиве и вызываем их, передавая контекст и данные из события
			for(var i = 0; i < this.handlers[event].length; i++){
				this.handlers[event][i].call(this, data);
			}
		}
	}

	/*
		Возвращает имя класса
	*/
	getClassName(){
		return this.constructor.name;
	}

	/*
		Метод, в котором объект подписывается на большую часть событий
	*/
	subscribe(){}
}