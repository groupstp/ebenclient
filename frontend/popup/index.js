/**
 * Модуль для построения всплывающих окон
 * @module popup
 * @requires tools
 * @requires component
 */
import {Button} from '../button/index.js';
import {Component} from '../component';
/**
 * @classdesc Класс реализующий построение всплывающего окна
 */
export class Popup extends Component {
    /**
     * @constructor
     */
    constructor(options) {
        super(options);
        this.dimension = 0;
        this.header = '';
        this.body = {};
        this.footer = [];
        this.width = 500;
        this.height = 500;
        this.maximized = false;
        this.parent = this.getParent();
        this.getAttributes(options.element);
        this.saveInWindow(this.id);
        this.showNewModal();
        stpui.currentPopup = this;
    }

    getAttributes(properties) {
        console.log(properties);
        for (let i in properties.elements) {
            if (properties.elements[i].type === 'header') {
                if (properties.elements[i].properties !== undefined) {
                    this.header = properties.elements[i].properties.caption || '';
                } else {
                    this.header = ''
                }

            }
            if (properties.elements[i].type === 'footer') {
                this.footer = properties.elements[i].elements;
            }
            if (properties.elements[i].type === 'body') {
                this.body = properties.elements[i].elements[0];
            }
        }
        this.width = properties.properties.width;
        this.height = properties.properties.height;
        if (this.parent !== null) {
            this.dimension = this.parent.dimension + 1;
        }
    }

    getParent() {
        return stpui.currentPopup || null;
    }

    /**
     * Функция выполняет показ нового модального окна
     */
    showNewModal() {
        this.getPlace().then(
            place => {
                let layoutLib = require('../layout/index.js');
                let layout = new layoutLib.Layout({
                        box: place,
                        element: this.body,
                        content: this.content,
                        code: this.code,
                        parent: this
                    }
                );
            }
        );
    }

    /**
     * Закрывает очередную модаль
     */
    close() {
        let self = this;
        if (self.parent === null) {
            w2popup.close();
            delete stpui[this.id];
            delete stpui.currentPopup;
        } else {
            //заголовок
            document.getElementById('popupHeader').innerHTML = self.parent.header;
            //удаляем
            document.getElementById('popup' + self.dimension).parentNode.removeChild(document.getElementById('popup' + self.dimension));
            document.getElementById('popupBtn' + self.dimension).parentNode.removeChild(document.getElementById('popupBtn' + self.dimension));
            if (w2popup.get().maximized) {
                w2popup.min();
            }
            //изменяем размер
            w2popup.resize(self.parent.width,
                self.parent.height, function () {
                    if (self.parent.maximized) {
                        w2popup.max();
                    }
                    for (let i in self.parent.children) {
                        self.parent.children[i].refresh();
                    }
                    //покаываем
                    document.getElementById('popup' + self.parent.dimension).style.display = '';
                    document.getElementById('popupBtn' + self.parent.dimension).style.display = '';
                    stpui.currentPopup = self.parent;
                    delete stpui[self.id];
                });
        }
    }

    /**
     * Замораживает попап
     * @param {string} msg - сообщение
     * @param {boolean} spinner - показывать ли спинннер
     */
    lock(msg = '', spinner = true) {
        w2popup.lock(msg, spinner);
    }

    /**
     * Размораживает попап
     */
    unlock() {
        w2popup.unlock();
    }

    /**
     * Скрывает попап
     */
    hide() {
        document.getElementById('w2ui-lock').style.display = 'none';
        document.getElementById('w2ui-popup').style.display = 'none';
    }

    /**
     * Показывает
     */
    unhide() {
        document.getElementById('w2ui-lock').style.display = '';
        document.getElementById('w2ui-popup').style.display = '';
    }


    /**
     * Получает место для построения содержимого модали, взято из старого проекта
     * @returns {Promise}
     */
    getPlace() {
        let self = this;
        return new Promise(function (resolve, reject) {
            //определяем статус всплывающего окна
            if (self.parent === null) {
                //это первое модальное окно
                //формируем панель с кнопками
                var buttonsHtml = '<div id="popupBtn"><div id="popupBtn0"></div></div>';
                //формируем контейнер для панели
                var bodyHtml = '<div id="popupDiv" style="position: absolute; left: 5px; top: 5px; right: 5px; bottom: 5px;"><div id="popup0" style="position: absolute; left: 5px; top: 5px; right: 5px; bottom: 5px;"></div></div>';
                //конфигурируем окно в2уи
                w2popup.open({
                        title: '<div id="popupHeader">' + self.header + '</div>',
                        height: self.height,
                        width: self.width,
                        body: bodyHtml,
                        showMax: true,
                        buttons: buttonsHtml,
                        modal: true,
                        onOpen: function (event) {
                            event.onComplete = function () {
                                this.width = w2popup.get().width;
                                this.height = w2popup.get().height;
                                //навешиваем обработчики на кнопки
                                for (let i in self.footer) {
                                    let btnDiv = document.createElement('div');
                                    document.getElementById('popupBtn0').appendChild(btnDiv);
                                    self.footer[i].path = self.body.path;
                                    let btn = new Button({
                                        element: self.footer[i],
                                        code: self.code,
                                        box: btnDiv,
                                        path: self.body.path,
                                        parent: self
                                    });
                                    btn.render();
                                    btn.initLogic();
                                }
                                let closeBtn = jQuery('div.w2ui-popup-close')[0];
                                $(closeBtn).unbind('click');
                                closeBtn.onclick = null;
                                closeBtn.onclick = function () {
                                    stpui.currentPopup.close();
                                };
                                resolve(document.getElementById('popup0'));
                            }

                        },
                        onClose: function (event) {

                        },
                        onToggle: function (event) {
                            event.onComplete = function () {
                                self.lock('', true);
                                function func() {
                                    self.unlock();
                                }

                                setTimeout(func, 500);
                            }
                        }
                    }
                )
            } else {
                //вложенное окно
                self.parent.maximized = w2popup.get().maximized;
                if (w2popup.get().maximized) {
                    w2popup.min();
                }
                //скрываем имеющееся тело и кнопки
                document.getElementById('popup' + (self.parent.dimension)).style.display = 'none';
                document.getElementById('popupBtn' + (self.parent.dimension)).style.display = 'none';
                //формируем тело
                var bodyObj = document.createElement('div');
                bodyObj.id = 'popup' + self.dimension;
                bodyObj.style.height = '100%';
                document.getElementById('popupDiv').appendChild(bodyObj);
                var buttonsObj = document.createElement('div');
                buttonsObj.id = 'popupBtn' + self.dimension;
                document.getElementById('popupBtn').appendChild(buttonsObj);
                //навешиваем обработчики на кнопки
                for (let i in self.footer) {
                    let btnDiv = document.createElement('div');
                    document.getElementById('popupBtn' + self.dimension).appendChild(btnDiv);
                    self.footer[i].path = self.body.path;
                    let btn = new Button({
                        element: self.footer[i],
                        code: self.code,
                        box: btnDiv,
                        path: self.body.path,
                        parent: self
                    });
                    btn.render();
                    btn.initLogic();
                }
                let closeBtn = jQuery('div.w2ui-popup-close')[0];
                $(closeBtn).unbind('click');
                closeBtn.onclick = null;
                closeBtn.onclick = function () {
                    stpui.currentPopup.close();
                };
                //меняем размеры
                var w = 0;
                var h = 0;
                w = self.width;
                h = self.height;
                w2popup.resize(w, h, function () {
                    self.width = w2popup.get().width;
                    self.height = w2popup.get().height;
                    document.getElementById('popupHeader').innerHTML = self.header;
                    resolve(document.getElementById('popup' + self.dimension));
                });
            }
        })
    }
}