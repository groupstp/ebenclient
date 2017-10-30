'use strict';
/**
 * Модуль для построения меню
 * @module menu
 */
//подключаем шаблон
import tempalate from './menu.tpl';
//подключаем стили
import './menu.css';
/**
 * @classdesc Класс, строящий верхнее навигационное меню
 */
export default class menuTopFixed {
    /**
     * @constructor
     * @param {object} options - массив опций
     * @param {stirng} options.place - идентифкатор места
     * @param {string} options.name - имя системы
     * @param {object} options.objInfo - информация о доступных маршрутах
     */
    constructor(options) {
        //идентификатор узла
        this._place = options.place;
        //бренд
        this._name = options.name;
        //пользователь
        this._user = options.objInfo.description + (options.objInfo.login !== undefined ? ' (' + options.objInfo.login + ')' : "");
        //возможные перемещения
        this.objInfo = options.objInfo || {};
        //строим шаблон и размещаем его
        document.getElementById(this._place).innerHTML = tempalate({
            name: this._name,
            user: this._user,
            routes: this.objInfo
        });
        //навешиваем обработчики событий
        document.getElementById(this._place).addEventListener('click', this._onMenuItemClick.bind(this));
    }

    /**
     * Обработчик событий, доступный извне
     * @param eventName - имя события
     * @param handler - функция-обработчик
     */
    on(eventName, handler) {
        document.getElementById(this._place).addEventListener(eventName, handler);
    }

    /**
     * Вызывает событие на элементе
     * @param eventName - имя события
     * @param data - что передать
     * @private
     */
    _trigger(eventName, data) {
        let myEvent = new CustomEvent(eventName, {detail: data});
        document.getElementById(this._place).dispatchEvent(myEvent);
    }

    /**
     * Выделяет пункт в меню
     * @param elem - выделяемый элемент
     * @private
     */
    _setSelection(elem) {
        //развыделяем остальное
        let actives = $('#' + this._place + ' .active');
        for (let i = 0; i < actives.length; i++) {
            actives[i].className = '';
        }
        //выделяем нужное
        elem.className = 'active';
    }

    /**
     * Обрабочик нажатия на меню
     * @param event
     * @private
     */
    _onMenuItemClick(event) {
        //определяем ближайший элемент с доступной обработкой клика
        let elem = $(event.target).closest('[data-cl=true]');
        if (elem.length === 0) return;
        elem = elem[0];
        let dataset = elem.dataset;
        //при необходимости выделяем
        if (dataset.sel === 'true') {
            this._setSelection(elem)
        }
        //генерируем событие
        this._trigger('menuItemSelected', dataset);
    }

    selectItem(path) {
        this._setSelection(document.getElementById('topMenu_' + path));
    }
}