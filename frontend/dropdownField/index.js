import {Field} from "../field";
import {AjaxSender} from '../tools/index.js';

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
            "allowFreeEntries": false,
            "editable": true,
            "maxSelection": this.maxSelection,
        });
    }

    _saveChanges(value) {
        this.value = value;
    }

    _addListeners() {

        if (!this.magicObj) return;

        $(this.magicObj).on('selectionchange', (e, ms, records) => {
            this._saveChanges(records);
            this.trigger('changeValue');
        });

        $(this.magicObj).on('focus', () => {
            this.trigger('focus');
        });

        $(this.magicObj).on('keyup', (e, magic, v) => {

            let newValue = this.magicObj.getRawValue();

            //различные системные кнопки, клики которых не надо обрабатывать
            let forbiddenKeyCodes = [13, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 44, 45, 46, 91, 93, 144, 145];

            if (forbiddenKeyCodes.indexOf(v.keyCode) !== -1){
                return;
            } else if (newValue) {
                this.getListDataFromServer(this.magicObj.getRawValue());
            } else {
                this.clearListData();
            }

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

    clearListData(data){
        this.setListData([]);
    }

    /**
     *  Метод отправляет запрос на сервер за порцией данных, подходящей под введенный текст
     */
    getListDataFromServer(text) {
        let request = new AjaxSender({
            url: 'http://localhost:1234/api',
            msg: JSON.stringify({
                "method": "getSuggestion",
                "obj": this.object,
                "name": this.name,
                "id": this.id,
                "text": text
            })
        });

        let requestPromise = request.sendQuery();

        requestPromise.then(result => {
            let suggestion = prepareDataForList.call(this, result);
            this.setListData(suggestion);
        })
            .catch(err => {
                console.log(err);
            });

        /**
         * Подготавливаем данные в формат {"id": '',"name" : ''}
         */
        function prepareDataForList(data) {
            let result = [];

            // делаем в попытке, потому что мало ли что нам придет в data
            try {
                let values = data.content.fk[this.id];
                if (values) result = values;
            }
            catch
                (err) {
                console.log(err);
            }

            return result;
        }

    }

}
