/**
 * Модуль для построения simpleField
 * @module simpleField
 * @requires field
 */
import {Field} from '../field';
/**
 * @extends module:field.Field
 */
export class SimpleField extends Field {
    constructor(options) {
        super(options);

        this.type = options.element.properties.type || 'text';

        if (options.element.properties.type === 'checkbox') {
            this.value = false;
        } else {
            this.value = '';
        }

    }

    ///// Private methods /////

    initLogic() {
        super.initLogic();
        this._applyLogic();
        this.applyProperties();
        this._addListeners();
    }

    _applyLogic() {
        // для даты и время используем bootstrap-datepicker для всего остального w2ui
        if (this.isItDateField()){
            this._applyDatepicker();
        } else {
            this._applyW2ui();
        }
    }

    _applyW2ui(){
        if (!this.controlEl) return;

        let config = {};

        $(this.controlEl).w2field(this.type, config);

        // убираем w2ui классы для стилизации
        this.controlEl.classList.remove('w2field');
        this.controlEl.classList.remove('w2ui-input');
    }

    _applyDatepicker(){
        let config = {
            format: 'dd/mm/yyyy',
            language: 'ru'
        };
        $(this.controlEl).datepicker(config);
    }

    /**
     *  Сохраняет значение из инпута в свойство value
     * @param event
     * @private
     */
    _saveChanges(event) {
        if (event.target.type === "checkbox") {
            this.value = event.target.checked;
            // Если float то надо заменять запятую на точку
        } else if (this.type === 'float') {
            if (typeof event.target.value == "string") {
                this.value = event.target.value.replace(/,/,".");
            }
        } else {
            this.value = event.target.value;
        }

        this.trigger('changeValue');
    }


    /**
     *  Добавляем наблюдение за событиями controlEl
     * @private
     */
    _addListeners() {
        // в w2ui при работе с датой и временем не срабатывает событие change, поэтому ориентируемся на потерю фокуса
        this.controlEl.addEventListener('blur', this._saveChanges.bind(this));
    }

    ///// Public methods /////

    enable() {
        // вызываем родительский метод чтобы активировать кнопки
        super.enable();
        // + своя логика
        // при кастомном макете элемент может быть не орпеделен
        if (!this.controlEl) return;
        this.controlEl.removeAttribute('disabled');

    }

    disable() {
        // вызываем родительский метод чтобы деактивировать кнопки
        super.disable();
        // + своя логика
        // при кастомном макете элемент может быть не орпеделен
        if (!this.controlEl) return;
        this.controlEl.setAttribute('disabled', 'true');
    }


    getValue() {
        let result;

        if (this.isItDateField()){
            result = $(this.controlEl).datepicker('getUTCDate');
            if (result instanceof Date){
                result = result.toISOString();
            }
        } else {
            result = this.value;
        }
        return result;
    }

    isItDateField(){
        let result = false;
        if (this.type === "date" || this.type === "time" || this.type === "timestamp"){
            result = true;
        }
        return result;
    }

    setValue(newValue) {
        this.value = newValue;
        if (this.isItDateField()){
            if (typeof newValue === "string"){
                $(this.controlEl).datepicker('setDate',new Date(newValue));
            } else if (newValue instanceof Date){
                $(this.controlEl).datepicker('setDate',newValue);
            }
        } else {
            this.controlEl.value = newValue;
        }

        // если меняем checkbox
        if (this.value === true) {
            this.controlEl.checked = true;
        } else if (this.value === false) {
            this.controlEl.checked = false;
        }
        // Это непотребство нужно для того чтобы w2ui отреагировал на изменение и применил форматирование к данным
        if (!this.isItDateField()){
            $(this.controlEl).data('w2field').change(new Event('change'));
        }
    }

}