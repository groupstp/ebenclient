/**
 * Модуль для выпадающих список
 * @module dropdownField
 * @requires tools
 */

import {Field} from "../field";
import {AjaxSender} from '../tools/index.js';

//подключаем библиотеку и экспортируем переменные из нее
const magiclib = require('imports-loader?jQuery=jquery!../libraries/magicsuggest/magicsuggest.js');
//подключаем стили
import '../libraries/magicsuggest/magicsuggest.css';

/**
 * @extends module:component.Component
 */
export class DropdownField extends Field {
    constructor(options) {
        super(options);

        this.type = options.element.properties.type || 'reference';
        // количество элементов, которые могут быть выбраны
        this.maxSelection = options.element.properties.maxSelection || 1;
        this.static = options.element.properties.static || false;

        this.value = [];
        this.link = options.element.properties.link || '';

        // объект magicSuggest, так как проще большинство действий совершать через него, а не через controlEl
        this.magicObj = null;
    }

    ///// Private methods /////

    initLogic() {
        super.initLogic();
        this._applyMagicSuggest();
        this.applyProperties();
        this._addListeners();
        this._getValuesFromServer();
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

        if (!this.static){
            $(this.magicObj).on('keyup', (e, magic, v) => {

                let newValue = this.magicObj.getRawValue();

                //различные системные кнопки, клики которых не надо обрабатывать
                let forbiddenKeyCodes = [13, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38, 39, 40, 44, 45, 46, 91, 93, 144, 145];

                if (forbiddenKeyCodes.indexOf(v.keyCode) !== -1) {
                    return;
                } else if (newValue) {
                    this._getListDataFromServer(this.magicObj.getRawValue());
                } else {
                    this.clearListData();
                }
            });
        }

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

    /**
     * Удаляет все значения из выпадающего списка
     */
    clearListData() {
        this.setListData([]);
    }

    /**
     *  Метод отправляет запрос на сервер за порцией данных, подходящей под введенный текст
     */
    _getListDataFromServer(text) {
        let url = twoBe.getDefaultParams().url;
        let self = this;
        twoBe.createRequest().addUrl(url).addParam('action', 'getContent').addParam('path', 'ref-' + this.link).addData('type', 'getFieldValues').addFilterParam('description', text, 'consist').addBefore(function () {
        }).addSuccess(function (data) {
            let suggestion = self._prepareDataForList.call(self, data);
            self.setListData(suggestion);
        }).addError(function (msg) {
            twoBe.showMessage(0, msg);
        }).send();

    }

    /**
     * Подготавливаем данные в формат {"id": '',"name" : ''}
     */
    _prepareDataForList(data) {
    let result = [];
    // делаем в попытке, потому что мало ли что нам придет в data
    try {
        let values = data.content[0].fk[this.link];
        if (values) {
            let ids = Object.keys(values);
            ids.forEach((id) => {
                result.push({
                    "id" : id,
                    "name" : values[id]
                });
            });
        }
    }
    catch
        (err) {
        console.log(err);
    }

    return result;
}

    /**
     * Подгружает все данные для филда, если их нет в кэше
     * @private
     */
    _getValuesFromServer(){
        if (!this.static) return;

        let url = twoBe.getDefaultParams().url;
        let request = twoBe.createRequest();
        let self = this;
        let cacheKey = 'dropList-' + this.link;

        request.addUrl(url);
        request.addParam('action', 'getContent');
        request.addParam('path', 'ref-' + this.link);
        request.addData('type', 'getFieldValues');
        request.addCacheKey(cacheKey);
        request.addBefore(function () {
            self.disable();
        }).addSuccess(function (data) {
            let suggestion = self._prepareDataForList.call(self, data);
            twoBe.cacheData(data, cacheKey);
            self.setListData(suggestion);
            self.enable();
        }).addError(function (msg) {
            twoBe.showMessage(0, msg);
            self.enable();
        }).send();

    }


}
