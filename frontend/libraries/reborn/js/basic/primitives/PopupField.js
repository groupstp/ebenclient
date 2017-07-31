/*
	Поле для отображения в плашке
*/
window.PopupField = class PopupField extends SmartObject{	
	constructor(key, value, index, dataType, commands, owner){
		super();
		// имя поля
		this.name = key;
		// значение
		this.value = value;
		// порядковый номер в массиве
		this.index = index;
		// тип данных (пока не используется)
		this.dataType = dataType;
		// IDшники элементов для ввода/изменения значения и для статичного отображения
		this.inputElement = owner.objectID+'.inputElement.'+this.index;
		this.displayElement = owner.objectID+'.displayElement.'+this.index;
		// определяем тип поля ввода
		if (this.dataType){
			switch (this.dataType){
				case 'text':
				case 'coordinates':
					this.inputType = 'text';
					break;
				case 'date':
				case 'datetime':
					this.inputType = 'text';
					break;
				case 'number':
				case 'integer':
				case 'float':
					this.inputType = 'text';
					break;
				case 'boolean':
					this.inputType = 'checkbox';
					break;
				case 'list':
					this.inputType = 'combobox';
					break;
			}
		} else {
			// если тип данных не указан, будет использоваться обычное текстовое поле
			this.inputType = 'text';
		}
		// кнопки команд
		this.commands = [];
		if (commands){			
			for (var i = 0; i < commands.length; i++){				
				this.commands.push({
					caption: commands[i],
					elementID: owner.objectID+'.commandBtn.'+i
				});
			}
		}
		// только чтение или нет
		this.readOnly = owner.readOnly;
		// функция, проверяющая значение на корректность
		this.extractValue = this.getExtractor(this.dataType);		
	}

	show(){
		var self = this;
		if (this.readOnly){
			document.getElementById(this.displayElement).textContent = this.value;
		} else {
			document.getElementById(this.inputElement).value = this.value;
			// при фокусе на поле для ввода кидаем событие
			document.getElementById(this.inputElement).onfocus = function(){
				self.fire('startEdit', {index: self.index});
			}
			// при переходе фокуса на другой объект обновляем значение поля
			// тут будет проверка ввода после снятия фокуса с элемента, но это потом
			document.getElementById(this.inputElement).onblur = function(){				
				if (self.extractValue(this.value)){					
					self.fire('validated', {index: self.index});
				} else {
					self.fire('ivalidValue', {index: self.index});
				}
			}
		}
	}

	setValue(newValue){		
		// если новое значение прошло проверку
		if (this.extractValue(newValue)){			
			// если плашка только для чтения
			// проверяем, существует ли html-элемент, в который можно записать значение и пишем в него
			if (this.readOnly){
				if (document.getElementById(this.displayElement)){
					document.getElementById(this.displayElement).textContent = this.value.toString();
				}
			// для редактируемой плашки - аналогично
			} else {
				if (document.getElementById(this.inputElement)){
					document.getElementById(this.inputElement).value = this.value.toString();
				}
			}
		}
	}

	getExtractor(dataType){		
		var extractor = this.extractText;
		switch (dataType){
			case 'text':
			case 'integer':
			case 'float':
			case 'boolean':
			case 'list':
			case 'date':
			case 'datetime':
				extractor = this.extractText;
				break;
			case 'coordinates':
				extractor = this.extractCoordinates;
				break;
		}		
		return extractor;
	}
	
	/*
		Функции для валидации значений
	*/

	// пустой валидатор, не проверяющий ничего
	extractText(value){
		this.value = value;
		return true;
	}

	/*
		Возвращает true и записывает значение в поле, если оно корректное; в противном случае вернет false.
	*/
	extractCoordinates(value){
		var result = false, buf = value.toString();
		buf = buf.split(',');
		if (buf.length === 2){
			if (!isNaN(buf[0]) && buf[0].indexOf('.') != -1 && !isNaN(buf[1]) && buf[1].indexOf('.') != -1){
				result = true;
				this.value = [parseFloat(buf[0]), parseFloat(buf[1])];
			}
		}
		return result;
	}

	extractDate(value){}
	extractTime(value){}
	extractDatetime(value){}
	extractNumber(value){}
	extractInteger(value){}
	extractFloat(value){}
}