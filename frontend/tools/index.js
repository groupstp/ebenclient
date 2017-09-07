/**
 * Модуль содержащий некоторый общий функционал
 * @module tools
 * @requires {@link pako.js}
 * @requires {@link http://malsup.com/jquery/block/}
 */

import pako from '../libraries/pakojs/pako.js';
require('imports-loader?jQuery=jquery!../libraries/blockUI/jquery.blockUI.js');
/**
 * @classdesc Класс для разжатия данных с сервера
 */
export class Unzipper {
    /**
     * @constructor
     * @param zippedData - сжатые данные
     */
    constructor(zippedData) {
        /**
         * Сжатые данные
         * @member
         * @type {gzip}
         */
        this.zippedData = zippedData;
        /**
         * Разжатые данные
         * @member
         * @type {object}
         */
        this.unzippedData = {};
        this.unzip();
    }

    /**
     * Выполняет разжатие данных
     */
    unzip() {
        if (this.zippedData.message.type === "Buffer") {
            let b64 = this.zippedData.message.data;
            // Decode base64 (convert ascii to binary)
            let strData = atob(b64);
            // Convert binary string to character-number array
            let charData = strData.split('').map(function (x) {
                return x.charCodeAt(0);
            });
            // Turn number array into byte-array
            let binData = new Uint8Array(charData);
            // Pako magic
            let data = JSON.parse(pako.inflate(binData, {to: 'string'}));
            this.unzippedData.status = this.zippedData.status;
            this.unzippedData.message = data;
        } else {
            this.unzippedData = this.zippedData;
        }
    }

}
/**
 * @classdesc Класс для разжатия данных с сервера
 */
export class AjaxSender {
    /**
     * @constructor
     * @param {object} options - параметры
     * @param {string} options.url - адрес
     * @param {string} options.msg - тело ссобщения
     * @param {string} options.headerAccept - заголовок
     * @param {function} options.before - действие во время ожидания
     */
    constructor(options) {
        /**
         * Адрес
         * @member
         * @type {string}
         */
        this.url = options.url;
        /**
         * Тело ссобщения
         * @member
         * @type {string}
         */
        this.msg = options.msg;
        /**
         * Заголовок
         * @member
         * @type {string}
         */
        this.headerAccept = options.headerAccept;
        /**
         * Действие во время ожидания
         * @member
         * @type {function}
         */
        this.before = options.before;
    }

    /**
     * Отслать запрос
     * @returns {Promise}
     */
    sendQuery() {
        let self = this;//передача контекста через замыкание
        return new Promise(function (resolve, reject) {
            let xhr = new XMLHttpRequest();
            if (self.headerAccept !== undefined) {
                xhr.setRequestHeader('headerAccept', self.headerAccept);
            }
            xhr.open('POST', self.url, true);
            xhr.onload = function () {
                if (this.status === 200) {
                    let serverAns = this.response;
                    //для заглушек
                    serverAns = serverAns.toString();
                    serverAns = JSON.parse(serverAns);
                    serverAns = new Unzipper(serverAns).unzippedData;
                    if (serverAns.status === 'success') {
                        resolve(serverAns.message);
                    } else {
                        let error = new Error(serverAns.message);
                        error.code = 9999;
                        reject(error);
                    }

                } else {
                    let error = new Error(this.statusText);
                    error.code = this.status;
                    reject(error);
                }
            }
            if (self.before !== undefined) {
                self.before();
            }
            xhr.onerror = function () {
                reject(new Error('Network Error'));
            }
            xhr.send(self.msg);
        })
    }
}
/**
 * Класс для работы с токеном авторизации в куках
 */
export class TokenAuth {
    /**
     * @constructor
     * @param name - имя токена
     */
    constructor(name) {
        /**
         * Имя токена
         * @member
         * @type {string}
         */
        this.name = name;
    }

    /**
     * Проверить токен
     * @returns {string}
     */
    checkToken() {
        return (this._getCookie(this.name));
    }

    /**
     * Добавляет токен
     * @param token - токен
     */
    addToken(token) {
        this._setCookie(this.name, token, {expires: 0});//устанавливаем "сессионное куки"
    }

    /**
     * Устанавливает кук
     * @param {string} name - имя
     * @param {string} value - значение
     * @param options - параметры
     * @private
     */
    _setCookie(name, value, options) {
        options = options || {};

        var expires = options.expires;

        if (typeof expires === "number" && expires) {
            var d = new Date();
            d.setTime(d.getTime() + expires * 1000);
            expires = options.expires = d;
        }
        if (expires && expires.toUTCString) {
            options.expires = expires.toUTCString();
        }

        value = encodeURIComponent(value);

        var updatedCookie = name + "=" + value;

        for (var propName in options) {
            updatedCookie += "; " + propName;
            var propValue = options[propName];
            if (propValue !== true) {
                updatedCookie += "=" + propValue;
            }
        }

        document.cookie = updatedCookie;
    }

    /**
     *
     * Получить кук
     * @param {string} name - имя
     * @returns {string}
     * @private
     */
    _getCookie(name) {
        var matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }

    /**
     * Удалить кук
     * @private
     */
    _deleteCookie() {
        this._setCookie(this.name, "", {expires: -1});
    }

    /**
     * Выполняет выход из системы
     * @param page - куда уходить
     */
    exit(page) {
        this._deleteCookie();
        document.location.href = page;

    }
}
/**
 * Класс для работы с браузерными уведомлениями {@link https://developer.mozilla.org/ru/docs/Web/API/notification}
 */
export class BrowserNotification {
    /**
     * @constructor
     * @param {string} title - заголовок
     * @param {object} options - опции
     * @param {string} options.body - текст оповещения
     */
    constructor(title, options) {
        // Проверим, поддерживает ли браузер HTML5 Notifications
        if (!("Notification" in window)) {
            alert('Ваш браузер не поддерживает HTML Notifications, его необходимо обновить.');
        }
        // Проверим, есть ли права на отправку уведомлений
        else if (Notification.permission === "granted") {
            // Если права есть, отправим уведомление
            let notification = new Notification(title, options);

            function clickFunc() {
                alert('Пользователь кликнул на уведомление');
            }

            notification.onclick = clickFunc;
        }
        // Если прав нет, пытаемся их получить
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                // Если права успешно получены, отправляем уведомление
                if (permission === "granted") {
                    let notification = new Notification(title, options);

                } else {
                    alert('Вы запретили показывать уведомления'); // Юзер отклонил наш запрос на показ уведомлений
                }
            });
        } else {
            // Пользователь ранее отклонил наш запрос на показ уведомлений
            // В этом месте мы можем, но не будем его беспокоить. Уважайте решения своих пользователей.
        }
    }
}
/**
 * Замораживатель, использует {@link http://malsup.com/jquery/block/}
 */
export class Freezer {
    /**
     *
     * @param {object} params - параметры
     * @param {DOM} params.place - что морозить
     * @param {text} params.message - сообщение
     */
    constructor(params) {
        this.place = params.place || "";
        this.message = params.message || "";
    }

    /**
     * Замораживает
     */
    lock() {
        $(this.place).block({
            css: {
                border: 'none',
                padding: '15px',
                backgroundColor: '#000',
                '-webkit-border-radius': '10px',
                '-moz-border-radius': '10px',
                opacity: .5,
                color: '#fff'
            },
            message: '<i class="fa fa-cog fa-spin fa-fw"></i> ' + this.message
        });
    }

    /**
     * Размораживает
     */
    unlock() {
        $(this.place).unblock();
    }
}

export class utils {
    static getISODate(rusDate, splitter = '/') {
        let dateArr = rusDate.split(splitter);
        return (dateArr[2] + '-' + dateArr[1] + '-' + dateArr[0])
    }
}