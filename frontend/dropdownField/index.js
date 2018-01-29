/**
 * Модуль для выпадающих список
 * @module dropdownField
 * @requires tools
 */

import {Field} from "../field";
import {AjaxSender} from '../tools/index.js';
import {utils} from '../tools';

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
        this.maxItemsInCache = options.element.properties.maxItemsInCache || 5;

        // объект magicSuggest, так как проще большинство действий совершать через него, а не через controlEl
        this.magicObj = null;

        // делаем запросы на сервер при подборе текста не чаще чем раз в 600мс
        this._getListDataFromServer = utils.debounce(this._getListDataFromServer, 600);
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
        // закэшируем выбранное значение
        //this._cacheValue(value);
    }

    _addListeners() {

        if (!this.magicObj) return;

        $(this.magicObj).on('selectionchange', (e, ms, records) => {
            this._saveChanges(records);
            this.trigger('changeValue', this);
        });

        $(this.magicObj).on('focus', () => {
            this.trigger('focus');
        });

        $(this.magicObj).on('expand', () => {
            this._onExpand();
        });

        if (!this.static) {
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

    getRawValue() {
        return this.magicObj.getRawValue();
    }

    getValue() {
        return this.value;
    }

    setValue(newValue) {
        if (Array.isArray(newValue) && newValue.length) {
            this.value = [];
            let value = newValue[0];
            if (value.id !== undefined && value.id !== null) {
                this.value.push(value);
                this.magicObj.setSelection(newValue);
            }
        } else {
            this.value = [];
            let value = newValue;
            if (value.id !== undefined && value.id !== null) {
                this.value.push(value);
                this.magicObj.setSelection(newValue);
            }
        }
    }

    clear() {
        if (this.magicObj) {
            this.magicObj.clear();
            this.trigger('changeValue', this);
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
        let request = twoBe.createRequest();
        var queryParams = twoBe.createSimpleCondition('description', 'description', text, 'consist');
        request.addParam('action', 'getContent').addParam('path', 'ref-' + this.link).addData('type', 'getFieldValues').addQueryParams(queryParams).addBefore(function () {
        }).addSuccess(function (data) {
            let suggestion = self._prepareDataForList.call(self, data);
            self.setListData(suggestion);
        }).addError(function (msg) {
            twoBe.showMessage(0, msg);
        });
        let filterParams = this.getFiltersParams();
        if (filterParams) {
            filterParams.forEach((filerParam) => {
                request.addFilterParam(filerParam.name, filerParam.value);
            });
        }
        request.send();
    }

    getFiltersParams() {
        let filterParams = [];
        if (this.filterFields.length) {
            this.filterFields.forEach((field) => {
                let filterFieldName = field.filterBy;
                let filterField = this.parent.getField(filterFieldName);
                if (filterField) {
                    let filterValue = filterField.getValue();
                    if (filterValue && filterValue.length) {
                        filterParams.push({
                            name: field.alias,
                            value: filterValue[0].id
                        });
                    }
                }
            });
        }
        return filterParams.length ? filterParams : null;
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
                        "id": id,
                        "name": values[id]
                    });
                });
            }
        }
        catch (err) {
            console.log(err);
        }

        return result;
    }

    /**
     * Подгружает все данные для филда, если их нет в кэше
     * @private
     */
    _getValuesFromServer() {
        if (!this.static) return;

        let url = twoBe.getDefaultParams().url;
        let request = twoBe.createRequest();
        let self = this;
        let cacheKey = this._getCacheKey();

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


    _onExpand() {
        if (this.static) return;
        // don't use cache when we already typed something
        let currentValue = this.getRawValue();
        if (currentValue) return;

        let cacheKey = this._getCacheKey();
        let cache = twoBe.getCache(cacheKey);

        if (Array.isArray(cache)) {
            this.setListData(cache);
        }

    }

    _cacheValue(valueArr) {

        if (!valueArr.length) return;

        let valueToCache = valueArr[0];

        if (this.static) return;

        let cacheKey = this._getCacheKey();
        let cache = twoBe.getCache(cacheKey);

        // cache is already exist
        if (cache !== null) {

            if (Array.isArray(cache) && valueNotInCache(valueToCache)) {

                if (cache.length === this.maxItemsInCache) {
                    cache.shift();
                }

                cache.push(valueToCache);
                twoBe.cacheData(cache, cacheKey);

            }

        } else { // cache is not exist

            twoBe.cacheData([valueToCache], cacheKey);

        }

        function valueNotInCache() {

            let result = true;

            for (let i in cache) {
                let id = cache[i].id;
                if (id === valueToCache.id) {
                    result = false;
                    break;
                }
            }

            return result;

        }


    }


    _getCacheKey() {
        return 'dropList-' + this.link;
    }

}
