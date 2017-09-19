/**
 * Created by AHonyakov on 17.07.2017.
 */
/**
 * Модуль для исполнения функций в пользовательском коде, также должен быть реализван в мобильном клиенте
 * @module twoBe
 * @requires tools
 * @requires config
 */

//подключаем конфиг
import {config} from '../config/config.js';
import * as tools from '../tools/index.js';
/**
 * @classdesc Класс пользовательских функций
 */
export default class twoBe {
    /**
     * @param {object} data - данные для кэширования
     * @param {string} key - ключ
     */
    static cacheData(data, key) {
        localStorage[key] = JSON.stringify(data);
    }

    /**
     * Получает конифигурационные данные - пока в виде заглушки
     * @returns {{url: string}} Объект с конфигами
     */
    static getDefaultParams() {
        return ({url: config.testUrl});
    }

    /**
     * Получает объект по идентификатору
     * @param {string} id - идентификатор
     * @returns {object} - найденный объект
     */
    static getById(id) {
        return window.stpui[id];
    }

    static getPopupPath() {
        return window.stpui.popup.modals[window.stpui.popup.modals.length - 1].object.path;
    }

    static getGridRefs(headPath) {
        let result = {};
        for (let id in window.stpui) {
            if (id.indexOf(headPath) >= 0 && id.indexOf('grid') >= 0 && id.indexOf('refs') >= 0 && id.split('refs').length - headPath.split('refs').length === 1) {
                result[id] = window.stpui[id];
            }
        }
        return result;
    }

    /**
     * Строит инетрфейс по полученным данным с сервера
     * @param {object} data - данные
     * @param {string} key - ключ
     */
    static buildView(data, key) {
        if (data.needToCache) {
            this.cacheData(data, key);
        }
        if (data.elements.length !== 1) {
            w2alert('Сервер вернул некорректные данные!');
            return;
        }
        if (data.elements[0].type === 'popup') {
            let popupLib = require('../popup/index.js');
            if (window.stpui !== undefined && window.stpui.popup === undefined) {
                new popupLib.Popup();
            }
            window.stpui.popup.showNewModal(data);
        }
    }

    /**
     * Получить данные по ключу из кэша
     * @param {string} key - ключ
     * @returns {} объект с данными
     */
    static getCache(key) {
        if (localStorage[key] !== undefined) {
            return (JSON.parse(localStorage[key]));
        } else {
            return null;
        }
    }

    /**
     * Показать уведомление
     * @param {string} type - тип
     * @param {string} msg - сообщение
     */
    static showMessage(type, msg) {
        w2alert(msg);
    }

    /**
     * Отсылает запрос на сервер - не используется (вроде)
     * @param url
     * @param action
     * @param object
     * @param name
     * @param beforeSend
     * @param success
     * @param error
     */
    static sendRequest(url, action, object, name, beforeSend, success, error) {
        let request = new tools.AjaxSender({
            url: url,
            msg: action + object + name,
            before: function () {
                beforeSend();
            }
        })
        request.sendQuery()
            .then(
                response => {
                    success(response);
                },
                errorResponse => {
                    error(errorResponse);
                }
            )
    }

    /**
     * Создает запрос
     * @returns {Request}
     */
    static createRequest() {
        return new Request();
    }

    /**
     * Показать подтверждение
     * @param {string} msg - сообщение
     * @param {function} callback - что делать если да
     */
    static showConfirm(msg, callback) {
        w2confirm(msg)
            .yes(function () {
                callback();
            })
    }

    /**
     * Возвращает путь связанного c Grid элемента Form
     * @param gridPath - Путь связанного c Grid элемента Form
     */
    static getFormID(gridID) {

        let idParts = gridID.split('-');
        let gridIndex;
        let formID = '';

        for (let i = 0; i < idParts.length; i++) {
            if (idParts[i] === 'grid') {
                gridIndex = i;
            }
        }

        let endIndex = gridIndex - 2;
        let arrToJoin = [];

        for (let i = 0; i < endIndex; i++) {
            arrToJoin.push(idParts[i]);
        }

        formID = arrToJoin.join('-') + '-form';

        return formID;

    }
}
/**
 * @classdesc Класс запроса
 */
class Request {
    /**
     * @constructor
     */
    constructor() {
        /**
         * Адрес запроса
         * @member
         * @type {string}
         */
        this.url = '';
        /**
         * Тело запроса
         * @member
         * @type {object}
         */
        this.param = {};
        /**
         * Что делать во время ожидания
         * @member
         * @type {}
         */
        this.before = '';
        /**
         * Что делать при успехе
         * @member
         * @type {}
         */
        this.success = '';
        /**
         * Что делать при неудаче
         * @member
         * @type {}
         */
        this.error = '';
        /**
         * Ключ для поисков в кэшэ
         * @member
         * @type {string}
         */
        this.cacheKey = null;
    }

    /**
     * Сеттер для адреса
     * @param {string} url - адрес
     * @returns {Request}
     */
    addUrl(url) {
        this.url = url;
        return this;
    }

    /**
     * Сеттер для поля данные запроса
     * @param {string} key - ключ
     * @param {object} value - значение
     * @returns {Request}
     */
    addData(key, value) {
        if (this.param.data === undefined) {
            this.param.data = {};
        }
        this.param.data[key] = value;
        return this;
    }

    /**
     * Сеттер для фильтра
     * @param {string} key - ключ
     * @param {object} value - значение
     * @param {object} sign - тип сравнения (равно, содержит и т.д.)
     * @returns {Request}
     */
    addFilterParam(key, value, sign) {
        if (sign === undefined) sign = 'equal';

        if (this.param.data === undefined) {
            this.param.data = {};
        }
        if (this.param.data.filter === undefined) {
            this.param.data.filter = {};
        }
        this.param.data.filter[key] = {
            value: value,
            sign: sign
        };
        return this;
    }

    /**
     * Сеттер для значения limit пагинации
     * @param {object} value - значение
     * @returns {Request}
     */
    addPaginationLimit(value) {
        if (this.param.data === undefined) {
            this.param.data = {};
        }
        if (this.param.data.pagination === undefined) {
            this.param.data.pagination = {};
        }

        this.param.data.pagination.limit = value;
        return this;
    }

    /**
     * Сеттер для значения offset пагинации
     * @param {object} value - значение
     * @returns {Request}
     */
    addPaginationOffset(value) {
        if (this.param.data === undefined) {
            this.param.data = {};
        }
        if (this.param.data.pagination === undefined) {
            this.param.data.pagination = {};
        }

        this.param.data.pagination.offset = value;
        return this;
    }

    /**
     * Сеттер для значения orderBy пагинации
     * @param field - имя поля
     * @param sortDirection - направление сортировки
     */
    addOrderByParam(field, sortDirection = 'DESC') {

        if (this.param.data === undefined) {
            this.param.data = {};
        }
        if (this.param.data.orderBy === undefined) {
            this.param.data.orderBy = [];
        }

        this.param.data.orderBy.push({
            field : field,
            sort : sortDirection
        })
    }

    /**
     * Добавить параметр в запрос
     * @param {string} key - ключ
     * @param {string} value - значение
     * @returns {Request}
     */
    addParam(key, value) {
        this.param[key] = value;
        return this;
    }

    /**
     * Добавить действие до
     * @param func
     * @returns {Request}
     */
    addBefore(func) {
        this.before = func;
        return this;
    }

    /**
     * Добавить действие-успех
     * @param func
     * @returns {Request}
     */
    addSuccess(func) {
        this.success = func;
        return this;
    }

    /**
     * Добавить действие-неудачу
     * @param func
     * @returns {Request}
     */
    addError(func) {
        this.error = func;
        return this;
    }

    /**
     * Добаляет ключ для кэша
     * @param key
     * @returns {Request}
     */
    addCacheKey(key) {
        this.cacheKey = key;
        return this;
    }

    /**
     * Отправить запрос
     */
    send() {
        if (this.cacheKey !== null && localStorage[this.cacheKey] !== undefined) {
            this.success(twoBe.getCache(this.cacheKey));
            return;
        }
        let request = new tools.AjaxSender({
            url: this.url,
            msg: JSON.stringify(this.param),
            before: function () {
                this.before();
            }.bind(this)
        })
        request.sendQuery()
            .then(
                response => {
                    this.success(response);
                },
                errorResponse => {
                    this.error(errorResponse);
                }
            )
    }

}