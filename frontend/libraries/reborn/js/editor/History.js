
/*
	Класс, отвечающий за логирование изменений, их откат и повтор
	Определены следующие операции:
		запись - обрезает историю по текущей позиции, записывает в неё новую команду, сдвигается на 1 позицию вперёд;
		откат (ctrl+x) - отменяет текущую команду и смещается по истории команд назад;
		повтор (ctrl+y) - смещается по истории команд вперед и повторно выполняет очередную команду;
		обрезание - обрезает историю по текущей позиции;
		очистка - смещает позицию в начало и обрезает историю, полностью зачищая её;
	Все манипуляции с историей выдают событие logChange, в контексте которого передаётся информация о возможности ctrl+x и ctrl+y
*/
window.History = class History extends SmartObject{
	constructor(){
		super();
		// массив для записи команд
		this.log = [];
		// текущая позиция в логе (при пустой истории равна -1)
		this.position = -1;
		// флаг, показывающий, возможна ли отмена
		Object.defineProperty(this, 'undoEnabled', {			
			get: () => {return (this.position >= 0)}
		});
		// флаг, показывающий, возможен ли возврат
		Object.defineProperty(this, 'redoEnabled', {			
			get: () => {return (this.position < this.log.length-1)}
		});
	}

	// записывает очередную команду в историю
	write(command){
		// обрезаем лог, стирая отменённые операции
		this.truncate();
		this.position++;
		this.log.push(command);
		this.fire('logChange', {undoEnabled: this.undoEnabled, redoEnabled: this.redoEnabled});		
	}

	// отмена предыдущего действия (движение по логу назад)
	undo(){
		// если отмена возможна, откатываем команду, находящуюся в текущей позиции, а позицию сдвигаем на 1 назад
		if (this.undoEnabled){
			this.log[this.position].undo();
			this.position--;
			this.fire('logChange', {undoEnabled: this.undoEnabled, redoEnabled: this.redoEnabled});
		}
	}

	// возврат последнего отменённого действия (движение по логу вперёд)
	redo(){
		// если возврат возможен, то двигаем позицию на 1 вперед и выполняем команду
		if (this.redoEnabled){
			this.position++;
			this.log[this.position].execute();
			this.fire('logChange', {undoEnabled: this.undoEnabled, redoEnabled: this.redoEnabled});
		}
	}

	// обрезает лог до последней задействованной команды, делая невозможным вызов redo()
	truncate(){
		this.log.splice(this.position+1, this.log.length);		
	}

	// полностью стирает историю изменений
	clear(){
		this.position = -1;
		this.truncate();
		this.fire('logChange', {undoEnabled: this.undoEnabled, redoEnabled: this.redoEnabled});
	}
}