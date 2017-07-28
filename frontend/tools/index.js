/**
 * Created by AHonyakov on 07.06.2017.
 */

import pako from '../libraries/pakojs/pako.js';
require('imports-loader?jQuery=jquery!../libraries/blockUI/jquery.blockUI.js');
export class commonTools {
    constructor(name) {
        this.name = name;
    }

    getTimeStr(isodate) {
        var dateStr = isodate.substring(0, isodate.length - (isodate.length - 10));
        return dateStr;
    }
}

export class unzipper {
    constructor(zippedData) {
        this.zippedData = zippedData;
        this.unzippedData = {};
        this._unzip();
    }

    _unzip() {
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
export class AjaxSender {
    constructor(options) {
        this.url = options.url;
        this.msg = options.msg;
        this.headerAccept = options.headerAccept;
        this.before = options.before;
    }

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
                    serverAns = new unzipper(serverAns).unzippedData;
                    console.log(serverAns);
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

export class tokenAuth {
    constructor(name) {
        this.name = name;
    }

    checkToken() {
        return (this._getCookie(this.name));
    }

    addToken(token) {
        this._setCookie(this.name, token, {expires: 0});//устанавливаем "сессионное куки"
    }

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

    _getCookie(name) {
        var matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }

    _deleteCookie() {
        this._setCookie(this.name, "", {expires: -1});
    }

    exit(page) {
        this._deleteCookie();
        document.location.href = page;

    }
}

export class browserNotification {
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
export class Freezer {
    constructor(params) {
        this.place = params.place || "";
        this.message = params.message;
    }

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

    unlock() {
        $(this.place).unblock();
    }
}