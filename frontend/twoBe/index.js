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
import config from '../config/config.js';
import * as tools from '../tools/index.js';
import CookieService from '../services/cookie-service';
import LocalStorageService from '../services/local-storage-service';
import Params from '../queryParams/params';
import FilterGroup from '../queryParams/filterGroup';
import FilterItem from '../queryParams/filterItem';

/**
 * @classdesc Класс пользовательских функций
 */
export default class twoBe {
    /**
     * @param {object} data - данные для кэширования
     * @param {string} key - ключ
     */
    static cacheData(data, key) {
        //localStorage[key] = JSON.stringify(data);
        LocalStorageService.set(key, data);
    }

    /**
     * Получить данные по ключу из кэша
     * @param {string} key - ключ
     * @returns {} объект с данными
     */
    static getCache(key) {
        return LocalStorageService.get(key);
    }

    static deleteCache(key) {
        LocalStorageService.delete(key);
    }

    /**
     * Получает конифигурационные данные - пока в виде заглушки
     * @returns {{url: string}} Объект с конфигами
     */
    static getDefaultParams() {
        console.log(config);
        return {
            url: config.testUrl,
            name: config.name
        }
    }

    static getToken(configName) {
        let token = new tools.TokenAuth(configName).checkToken();
        return token;
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

    static getObjectName(path) {
        let pathParts = path.split('-');
        return pathParts[pathParts.length - 1];
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
            new popupLib.Popup({
                element: data.elements[0],
                content: data.content,
                code: data.code
            });
        }
    }

    /**
     * Показать уведомление в виде отдельного popup окна
     * @param {string} type - тип
     * @param {string} msg - сообщение
     */
    static showPopup(type, msg, options = {}) {
        w2popup.open({
            showMax: false,
            showClose: false,
            title: options.title || 'Уведомление',
            body: '<div class="w2ui-centered w2ui-alert-msg" style="font-size: 13px;">' + msg + '</div>',
            buttons: '<button onclick="w2popup.close();" class="w2ui-popup-btn w2ui-btn">' + w2utils.lang('Ok') + '</button>',
            onOpen: function (event) {
                // do not use onComplete as it is slower
                setTimeout(function () {
                    $('#w2ui-popup .w2ui-popup-btn').focus();
                }, 1);
            },
            onKeydown: function (event) {
                $('#w2ui-popup .w2ui-popup-btn').focus().addClass('clicked');
            },
            onClose: function () {
                if (typeof callBack == 'function') callBack();
            }
        });
    }

    /**
     * Показать уведомление
     * @param {string} type - тип
     * @param {string} msg - сообщение
     */
    static showMessage(type, msg) {
        w2alert(msg);
    }

    static showConfirmation(msg, callback) {
        w2confirm({
            msg: msg,
            btn_yes: {
                callBack: callback
            }
        });
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
     * Создает объект типа Params
     * @returns {Params}
     */
    static createQueryParams() {
        return new Params();
    }

    /**
     * Создает объект типа FilterGroup
     * @param options - параметры для передачи в конструктор
     * @returns {FilterGroup}
     */
    static createFilterGroup(options) {
        return new FilterGroup(options);
    }

    /**
     * Создает объект типа FilterItem
     * @param options- параметры для передачи в конструктор
     * @returns {FilterItem}
     */
    static createFilterItem(options) {
        return new FilterItem(options);
    }

    /**
     * Функция для самого распространеного использования фильтра, отбора по одному параметру. Возвращает объект типа Params, настроенный на отбор по одному полю
     * @param name - имя условия
     * @param field - поле по которому устанавливается отбор
     * @param value - значение отбора
     * @param sign - тип сравнения значения
     * @returns {Params}
     */
    static createSimpleCondition(name, field, value, sign){
        let queryParams = new Params();

        let filterItem = new FilterItem({name: name});
        filterItem.setLeft('field', field);
        filterItem.setRight('value', value);
        filterItem.setSign(sign);

        let filterGroup = new FilterGroup({type: 'and'});
        filterGroup.add(filterItem);

        queryParams.addRootGroup(filterGroup);
        return queryParams;
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

    static saveFile(content, description = '', extension = '') {

        function base64ToArrayBuffer(base64) {
            let binaryString = window.atob(base64);
            let binaryLen = binaryString.length;
            let bytes = new Uint8Array(binaryLen);
            for (let i = 0; i < binaryLen; i++) {
                let ascii = binaryString.charCodeAt(i);
                bytes[i] = ascii;
            }
            return bytes;
        }

        let saveByteArray = (function () {
            let a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            return function (data, name) {
                let blob = new Blob(data, {type: "octet/,stream"});
                let url = window.URL.createObjectURL(blob);
                a.href = url;
                a.download = name;
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            };
        }());

        let sampleBytes = base64ToArrayBuffer(content);
        let fileName = description + "." + (!extension ? 'file' : extension);
        saveByteArray([sampleBytes], fileName);

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
        console.log("getDefaultParameters");
        this.url = twoBe.getDefaultParams().url || '';
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
        this.before = function () {
        };
        /**
         * Что делать при успехе
         * @member
         * @type {}
         */
        this.success = function () {
        };
        /**
         * Что делать при неудаче
         * @member
         * @type {}
         */
        this.error = function () {
        };
        /**
         * Ключ для поисков в кэшэ
         * @member
         * @type {string}
         */
        this.cacheKey = null;

        this._init();
    }

    _init() {
        console.log("Get token");
        const token = new tools.TokenAuth(config.name).checkToken();
        console.log("Storage token: " + token);
        this.addParam('token', token);

        console.log("Get current objectView");
        const currentObjView = LocalStorageService.get('currentObjView') || '';
        console.log("Storage objectView");
        this.addParam('objView', currentObjView);
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
    addFilterParam(key, field, value, sign) {
        /*if (sign === undefined) sign = 'equal';

        if (this.param.data === undefined) {
            this.param.data = {};
        }
        if (this.param.data.filter === undefined) {
            this.param.data.filter = {};
        }
        this.param.data.filter[key] = {
            value: value,
            sign: sign
        };*/
        if (sign === undefined) sign = 'equal';
        if (this.param.data === undefined) {
            this.param.data = {};
        }
        if (this.param.data.filter === undefined) {
            this.param.data.filter = {};
        }
        let filter = this.param.data.filter[key] = {
            comparisons: {},
            tree: {}
        };
        filter.comparisons.left = {
            type: 'field',
            value: field
        };
        filter.comparisons.right = {
            type: 'value',
            value: value
        };
        filter.comparisons.sign = sign;

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
            field: field,
            sort: sortDirection
        })
    }

    /**
     * Функция добавляет параметры для сервера в тело запроса
     * @param params - экземпляр объекта Params (/queryParams/params.js)
     */
    addQueryParams(params) {
        if (!this.param.data) {
            this.param.data = {};
        }

        this.param.data.queryParams = {};

        this.param.data.queryParams.filter = {
            comparisons: params.comparisons,
            tree: params.tree
        };

        this.param.data.queryParams.parameters = {
            pagination: params.pagination,
            orderBy: params.orderBy
        };
        return this;
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
        });
        return request.sendQuery()
            .then(
                response => {
                    this.success(response);
                    return Promise.resolve(response);
                },
                errorResponse => {
                    this.error(errorResponse);
                    return Promise.reject(errorResponse);
                }
            )
    }

}