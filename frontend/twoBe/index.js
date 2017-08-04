/**
 * Created by AHonyakov on 17.07.2017.
 */

import * as tools from '../tools/index.js';

export default class twoBe {
    static cacheData(data, key) {
        localStorage[key] = JSON.stringify(data);
    }

    static getDefaultParams() {
        return ({url: 'http://localhost:12345'});
    }

    static getById(id) {
        return window.stpui[id];
    }

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

    static getCache(key) {
        if (localStorage[key] !== undefined) {
            return (JSON.parse(localStorage[key]));
        } else {
            return null;
        }
    }

    static showMessage(type, msg) {
        w2alert(msg);
    }

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

    static createRequest() {
        return new Request();
    }

    static showConfirm(msg, callback) {
        w2confirm(msg)
            .yes(function () {
                callback();
            })
    }
}

class Request {
    constructor() {
        this.url = '';
        this.param = {};
        this.before = '';
        this.success = '';
        this.error = '';
        this.queryString = '';
        this.cacheKey = null;
    }

    addUrl(url) {
        this.url = url;
        return this;
    }

    addData(key, value) {
        if (this.param.data === undefined) {
            this.param.data = {};
        }
        this.param.data[key] = value;
        return this;
    }

    addParam(key, value) {
        this.param[key] = value;
        return this;
    }

    addBefore(func) {
        this.before = func;
        return this;
    }

    addSuccess(func) {
        this.success = func;
        return this;
    }

    addError(func) {
        this.error = func;
        return this;
    }

    addCacheKey(key) {
        this.cacheKey = key;
        return this;
    }

    send() {
        /*if (this.cacheKey !== null && localStorage[this.cacheKey] !== undefined) {
         this.success(twoBe.getCache(this.cacheKey));
         return;
         }*/
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