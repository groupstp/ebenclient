/**
 * Модуль для построения всплывающих окон
 * @module popup
 * @requires tools
 * @requires component
 */

/**
 * @classdesc Класс реализующий построение всплывающего окна
 */
export class Popup {
    /**
     * @constructor
     */
    constructor() {
        /**
         * Уровень вложенности
         * @member
         * @type {number}
         */
        this.dimension = -1;
        /**
         * Хранит в себе окна
         * @member
         * @type {array}
         */
        this.modals = [];
        if (window.stpui === undefined) {
            window.stpui = {};
        }
        //может существовать только один объект попап
        window.stpui.popup = this;
    }

    /**
     * Функция выполняет показ нового модального окна
     * @param data - информация приходящая с сервера в определенном формате
     */
    showNewModal(data) {
        let popupProperties = this.getParams(data);
        this.getPlace(popupProperties).then(
            place => {
                let layoutLib = require('../layout/index.js');
                let layout = new layoutLib.Layout({
                        box: place,
                        element: popupProperties.body,
                        content: data.content,
                        code: data.code
                    }
                );
                this.modals[this.dimension].object = layout;
            }
        );
    }

    /**
     * @see module:component.Component#prepareCode
     */
    prepareCode(oldCode) {
        let newCode = {};
        for (let funcName in oldCode) {
            let func = new Function('return ' + oldCode[funcName]);
            newCode[funcName] = func();
        }
        return newCode;
    }

    /**
     * Закрывает очередную модаль
     */
    close() {
        let self = this;
        if (self.dimension === 0) {
            w2popup.close();
            delete stpui.popup;
        } else {
            //заголовок
            document.getElementById('popupHeader').innerHTML = self.modals[self.dimension].header;
            //удаляем
            document.getElementById('popup' + self.dimension).parentNode.removeChild(document.getElementById('popup' + self.dimension));
            document.getElementById('popupBtn' + self.dimension).parentNode.removeChild(document.getElementById('popupBtn' + self.dimension));
            if (w2popup.get().maximized) {
                w2popup.min();
            }
            self.dimension--;
            //изменяем размер
            w2popup.resize(self.modals[self.dimension].width,
                self.modals[self.dimension].height, function () {
                    if (self.modals[self.dimension].maximized) {
                        w2popup.max();
                    }
                    self.modals[self.dimension].object.refresh();
                    //покаываем
                    document.getElementById('popup' + self.dimension).style.display = '';
                    document.getElementById('popupBtn' + self.dimension).style.display = '';
                    self.modals.pop();

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
     * @param properties - свойства модали
     * @returns {Promise}
     */
    getPlace(properties) {
        let self = this;
        return new Promise(function (resolve, reject) {
            //определяем статус всплывающего окна
            if (self.dimension < 0) {
                //это первое модальное окно
                //формируем панель с кнопками
                var buttonsHtml = "";
                for (var i in properties.footer) {
                    buttonsHtml += '<button class="w2ui-btn" id=' + properties.footer[i].id + '0' + '  style="margin-left: 5px">' + properties.footer[i].properties.caption + '</button>';
                }
                buttonsHtml += '<button class="w2ui-btn" id=' + 'close' + '0' + '  style="margin-left: 5px">' + 'Закрыть' + '</button>';
                buttonsHtml = '<div id="popupBtn"><div id="popupBtn0">' + buttonsHtml + '</div></div>';
                //формируем контейнер для панели
                var bodyHtml = '<div id="popupDiv" style="position: absolute; left: 5px; top: 5px; right: 5px; bottom: 5px;"><div id="popup0" style="position: absolute; left: 5px; top: 5px; right: 5px; bottom: 5px;"></div></div>';
                //конфигурируем окно в2уи
                w2popup.open({
                        title: '<div id="popupHeader">' + properties.header + '</div>',
                        height: properties.height,
                        width: properties.width,
                        body: bodyHtml,
                        showMax: true,
                        buttons: buttonsHtml,
                        modal: true,
                        onOpen: function (event) {
                            event.onComplete = function () {
                                self.dimension++;
                                self.modals.push({
                                    header: properties.header,
                                    width: w2popup.get().width,
                                    height: w2popup.get().height
                                })
                                //навешиваем обработчики на кнопки
                                for (let i in properties.footer) {
                                    document.getElementById(properties.footer[i].id + '0').onclick = function () {
                                        let button = {
                                            getProperties: function () {
                                                return {
                                                    param: properties.footer[i].properties.param || null,
                                                    path: properties.body.path
                                                };
                                            }
                                        }
                                        try {
                                            properties.code[properties.footer[i].events.click](button);
                                        } catch (err) {
                                            console.log('SERVER CODE ERROR:' + err);
                                            w2alert('Серевер вернул некорректное действие!');
                                        }
                                    };
                                }
                                //добавляем кнопку отмену
                                document.getElementById('close0').onclick = function () {
                                    self.close();
                                }
                                let closeBtn = jQuery('div.w2ui-popup-close')[0];
                                $(closeBtn).unbind('click');
                                closeBtn.onclick = null;
                                closeBtn.onclick = function () {
                                    self.close();
                                };
                                console.log(document.getElementById('popup0').clientHeight);
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
                self.modals[self.dimension].maximized = w2popup.get().maximized;
                if (w2popup.get().maximized) {
                    w2popup.min();
                }
                //скрываем имеющееся тело и кнопки
                document.getElementById('popup' + (self.dimension)).style.display = 'none';
                document.getElementById('popupBtn' + (self.dimension)).style.display = 'none';
                self.dimension++;
                //формируем тело
                var bodyObj = document.createElement('div');
                bodyObj.id = 'popup' + self.dimension;
                bodyObj.style.height = '100%';
                document.getElementById('popupDiv').appendChild(bodyObj);
                var buttonsHtml = "";
                for (let i in properties.footer) {
                    buttonsHtml += '<button class="w2ui-btn" id=' + properties.footer[i].id + self.dimension + '  style="margin-left: 5px">' + properties.footer[i].properties.caption + '</button>';
                }
                buttonsHtml += '<button class="w2ui-btn" id=' + 'close' + self.dimension + ' style="margin-left: 5px">' + 'Назад' + '</button>';
                var buttonsObj = document.createElement('div');
                buttonsObj.id = 'popupBtn' + self.dimension;
                buttonsObj.innerHTML = buttonsHtml;
                document.getElementById('popupBtn').appendChild(buttonsObj);
                //навешиваем обработчики на кнопки
                for (let i in properties.footer) {
                    document.getElementById(properties.footer[i].id + self.dimension).onclick = function () {
                        let button = {
                            getProperties: function () {
                                return {
                                    param: properties.footer[i].properties.param || null,
                                    path: properties.body.path
                                };
                            }
                        }
                        try {
                            properties.code[properties.footer[i].events.click](button);
                        } catch (err) {
                            console.log('SERVER CODE ERROR:' + err);
                            w2alert('Серевер вернул некорректное действие!');
                        }
                    }.bind(self);
                }
                //меняем размеры
                var w = 0;
                var h = 0;
                w = properties.width;
                h = properties.height;
                w2popup.resize(w, h, function () {
                    self.modals.push({
                        header: document.getElementById('popupHeader').innerHTML,
                        width: w2popup.get().width,
                        height: w2popup.get().height
                    })
                    document.getElementById('popupHeader').innerHTML = properties.header;
                    //кнопка закрыть откатывает на один шаг назад
                    document.getElementById('close' + self.dimension).onclick = function () {
                        self.close();
                    }
                    resolve(document.getElementById('popup' + self.dimension));
                });
            }
        })
    }

    /**
     * Функция из приходящей информации получает информацию об очередной модали - заголовок, тело, кнопки, размеры, а также код
     * @param {object} data - данные с сервера
     * @returns {object}
     */
    getParams(data) {
        let popupData = data.elements[0];
        let result = {
            code: this.prepareCode(data.code)
        }
        for (let i in popupData.elements) {
            if (popupData.elements[i].type === 'header') {
                if (popupData.elements[i].properties !== undefined) {
                    result.header = popupData.elements[i].properties.caption || '';
                } else {
                    result.header = ''
                }

            }
            if (popupData.elements[i].type === 'footer') {
                result.footer = popupData.elements[i].elements;
            }
            if (popupData.elements[i].type === 'body') {
                result.body = popupData.elements[i].elements[0];
            }
        }
        result.width = popupData.properties.width;
        result.height = popupData.properties.height;
        return result;
    }
}