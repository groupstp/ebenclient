/**
 * Модуль для авторизации
 * @module auth
 * @requires tools
 * @requires config
 */
'use strict'
//подключаем шаблон
import tempalate from './auth.tpl';
//подключаем инструменты
import * as tools from '../tools/index.js'
//подключаем стили
import './auth.css';
/**
 * @classdesc Класс для построения формы авторизации и создания соответсвующих обработчиков
 */
export default class stpAuth {
    /**
     * @constructor
     * @param {object} options - набор параметров
     * @param {string} options.place - идентификатор места
     * @param {string} options.urlAuth - адрес сервера
     * @param {string} options.version - версия системы
     * @param {string} options.name - имя системы
     * @param {string} options.urlGet - адрес для авторизации гугл
     * @param {string} options.urlGetTokens - адрес для получения токена
     * @param {string} options.msgGet - сообщение для получения адреса гугл
     * @param {string} options.msgGetTokens - сообщение для получения токена после гугл авторизации
     * @param {string} options.authGoogle - нужна ли гугл авторизация
     * @param {string} options.redirectUrl - куда перенаправлять в случае успешной авторизации
     */
    constructor(options) {
        //куда поместить
        this._place = options.place;
        //адрес
        this.urlAuth = options.urlAuth;
        //название системы
        this.caption = options.caption;
        //версия системы
        this.version = options.version;
        //имя системы
        this.name = options.name;
        //адреса и сообщения
        this.urlGet = options.urlGet;
        this.urlGetTokens = options.urlGetTokens;
        this.msgGet = options.msgGet;
        this.msgGetTokens = options.msgGetTokens;
        //делать ли гугл авторизацию
        this.authGoogle = options.authGoogle || false;
        //постфиксы для дом-элементов
        this._formPostfix = '_formAuth';
        this._freezePostfix = '_signinForm';
        //куда перенаправлять в случае успеха
        this.redirectUrl = options.redirectUrl;
        //рисуем форму
        document.getElementById(this._place).innerHTML = tempalate({
            caption: this.caption,
            version: this.version,
            name: this.name,
            authGoogle: this.authGoogle,
            _formPostfix: this._formPostfix,
            _freezePostfix: this._freezePostfix
        });
        //обработчик нажатия на кнопку войти
        document.getElementById('authButton').onclick = function () {
            this._auth();
        }.bind(this);
        //обработчик на энтер в форме пароля
        document.getElementById('passwordInput').onkeydown = function () {
            if (event.code === "Enter") {
                this._auth();
            }
        }.bind(this);
        //активируем гугл-авторизацию
        if (this.authGoogle) {
            this._setGoogleAuth();
        }
    }

    /**
     * Собирает данные с формы и отправляет для авторизации
     * @private
     */
    _auth() {
        let msg = this._getAuthData();
        let query = new tools.AjaxSender({
            url: this.urlAuth,
            msg: msg,
            before: function () {
                $('#' + this.name + this._freezePostfix).block({
                    css: {
                        border: 'none',
                        padding: '10px',
                        backgroundColor: '#000',
                        '-webkit-border-radius': '10px',
                        '-moz-border-radius': '10px',
                        opacity: .5,
                        color: '#fff'
                    }, message: '<i class="fa fa-cog fa-spin fa-fw"></i> Ищем вас...'
                });
            }.bind(this)
        });
        query.sendQuery()
            .then(
                response => {
                    $('#' + this.name + this._freezePostfix).unblock();
                    this._saveToken(response.token);
                    this._saveObjInfo(response.info);
                    document.location.href = this.redirectUrl;
                },
                error => {
                    $('#' + this.name + this._freezePostfix).unblock();
                    document.getElementById('message').hidden = false;
                    document.getElementById('message').className = 'panel panel-danger';
                    if (error.code === 401) {
                        document.getElementById('mes_text').innerHTML = "Неверный логин/пароль";
                    } else {
                        document.getElementById('mes_text').innerHTML = "Сервер недоступен, повторите попытку позже";
                    }
                }
            )

    }

    /**
     * Получаем данные с формы
     * @returns string - строка для запроса
     * @private
     */
    _getAuthData() {
        let arrForm = $('#' + this.name + this._formPostfix).serializeArray();
        let formMsg = $.param(arrForm, true);
        return (formMsg);
    }

    /**
     * Делает возможной авторизацию с помощью гугл
     * @private
     */
    _setGoogleAuth() {
        let authCont = this;
        let qGetUrl = new tools.AjaxSender({
            url: authCont.urlGet,
            msg: authCont.msgGet
        })
        qGetUrl.sendQuery()
            .then(
                response => {
                    document.getElementById('googleAuth').disabled = false;
                    document.getElementById('googleAuth').onclick = function () {
                        let windowGoogle = window.open(response.url, '_blank', 'toolbar=0,location=0,menubar=0,width=600,height=600');
                        window.onmessage = function (e) {
                            windowGoogle.close();
                            var urlWithCode = e.data;
                            var idx = urlWithCode.lastIndexOf("code=");
                            var code = urlWithCode.substring(idx + 5).replace("#", "");
                            var qGetTokens = new tools.AjaxSender({
                                url: authCont.urlGetTokens,
                                msg: authCont.msgGetTokens + '&code=' + code,
                                before: function () {
                                    $('#' + this.name + this._freezePostfix).block({
                                        css: {
                                            border: 'none',
                                            padding: '15px',
                                            backgroundColor: '#000',
                                            '-webkit-border-radius': '10px',
                                            '-moz-border-radius': '10px',
                                            opacity: .5,
                                            color: '#fff'
                                        }, message: '<i class="fa fa-cog fa-spin fa-fw"></i> Ищем вас...'
                                    });
                                }.bind(this)
                            })
                            qGetTokens.sendQuery()
                                .then(
                                    response => {
                                        $('#' + this.name + this._freezePostfix).unblock();
                                        this._saveToken(response.token);
                                        this._saveObjInfo(response.info);
                                        document.location.href = this.redirectUrl;
                                    },
                                    error => {
                                        $('#' + this.name + this._freezePostfix).unblock();
                                        document.getElementById('message').hidden = false;
                                        document.getElementById('message').className = 'panel panel-danger';
                                        if (error.code === 401) {
                                            document.getElementById('mes_text').innerHTML = "Пользователь не найден";
                                        } else {
                                            document.getElementById('mes_text').innerHTML = "Возникла ошибка";
                                        }
                                    }
                                )
                        }.bind(this)
                    }.bind(this)
                }
            );
    }

    /**
     * Сохраняет токен в куки
     * @param token - что сохранять
     * @private
     */

    _saveToken(token) {
        var t = new tools.TokenAuth(this.name);
        t.addToken(token);
    }

    /**
     * Сохраняем информацию для меню
     * @param info - информация с сервера
     * @private
     */
    _saveObjInfo(info) {
        localStorage[this.name + '_ObjInfo'] = JSON.stringify(info);
    }
}
