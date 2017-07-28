import {Field} from "../field";

//подключаем библиотеку и экспортируем переменные из нее
const magiclib = require('imports-loader?jQuery=jquery!../libraries/magicsuggest/magicsuggest.js');
//подключаем стили
import '../libraries/magicsuggest/magicsuggest.css';


export class DropdownField extends Field {
    constructor(options) {
        super(options);

        this.type = options.element.properties.type || 'reference';
        // количество элементов, которые могут быть выбраны
        this.maxSelection = options.element.properties.maxSelection || 1;

        this.value = [];

        // объект magicSuggest, так как проще большинство действий совершать через него, а не через controlEl
        this.magicObj = null;
    }

    ///// Private methods /////

    initLogic() {
        super.initLogic();
        this._applyMagicSuggest();
        this.applyProperties();
        this._addListeners();
    }

    _applyMagicSuggest() {
        this.magicObj = $(this.controlEl).magicSuggest({
            //"style" : "width : 50% !important; display : inline-block"
            "allowFreeEntries" : false,
            "maxSelection" : this.maxSelection,
        });
    }

    _saveChanges(value) {
        this.value = value;
    }

    _addListeners() {

        if (!this.magicObj) return;

        $(this.magicObj).on('selectionchange', (e, ms, records) => {
            console.log(this.magicObj.getData());
            this._saveChanges(records);
            this.trigger('changeValue');
        });

        $(this.magicObj).on('focus', () => {
            this.trigger('focus');
        });

    }

    ///// Public methods /////

    enable() {
        // вызываем родительский метод чтобы активировать кнопки
        super.enable();
        // + своя логика
        if (this.magicObj) {
            this.magicObj.enable();
        }
    }

    disable() {
        // вызываем родительский метод чтобы активировать кнопки
        super.disable();
        // + своя логика
        if (this.magicObj) {
            this.magicObj.disable();
        }
    }


    getValue() {
        return this.value;
    }

    setValue(newValue) {
        if (newValue.length) {
            this.value = [];
            newValue.forEach((item) => {
                this.value.push(newValue);
            });
            this.magicObj.setSelection(newValue);
        }
    }

    /**
     * Получить значения выпадающего списка
     * @returns {array}
     */
    getListData() {
        return this.magicObj.getData();
    }

    /**
     * Установить значения выпадающего списка
     * @param {array} data
     */
    setListData(data) {
        this.magicObj.setData(data);
    }

}
