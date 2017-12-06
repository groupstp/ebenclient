/**
 * Модуль для построения таблиц
 * @module tabs
 * @requires component
 * @requires tools
 */

import * as componentLib from '../component';
import * as tools from '../tools/index.js';
/**
 * @classdesc Класс для построения вкладок
 * @extends module:component.Component
 */
export class Tabs extends componentLib.Component {
    constructor(params) {
        super(params);
        /**
         * Массив для данных о вкладках
         * @member
         * @type {array}
         */
        this.tabsContent = [];
        this.showFirstTab = true;
        this.getAttributes(params.element);
        this.buildTabs();
    }

    getAttributes(attributes) {
        this.tabsContent = attributes.elements;
        for (let i in this.tabsContent) {
            if (this.tabsContent[i].events !== undefined) {
                for (let event in this.tabsContent[i].events) {
                    this.tabsContent[i].events[event] = this.code[this.tabsContent[i].events[event]];
                }
            }
        }
        if (attributes.properties.showFirstTab !== undefined)
            this.showFirstTab = attributes.properties.showFirstTab;
    }

    /**
     * Функция строит вкладки
     */
    buildTabs() {
        //контейнер для таблеток
        let navTabs = document.createElement('ul');
        navTabs.className = "nav nav-pills";
        this.box.appendChild(navTabs);
        //генерируем вкладки
        this.buildTabsContent();
        //формируем ссылки на сгенерированые вкладки
        for (let i in this.children) {
            let li = document.createElement('li');
            navTabs.appendChild(li);
            let aHref = document.createElement('a');
            aHref.innerHTML = this.tabsContent[i].properties.header;
            aHref.setAttribute('data-toggle', 'pill');
            aHref.setAttribute('href', '#' + this.children[i].id);
            aHref.data = i;
            li.appendChild(aHref);
            //навешиваем обработчики, в контекст передаем объект вкладки
            //beforeShow
            $('a[href="#' + this.children[i].id + '"]').on('show.bs.tab', $.proxy(function (e) {
                for (let i in this.children) {
                    this.children[i].refresh();
                }
                if (!this._showByFunc) {
                    if (this.events !== null && this.events.beforeShow !== undefined) {
                        this._beforeEvent = e;
                        this.events.beforeShow.call(this, this);
                    }
                }
            }, this.children[i]))
            //afterShow
            $('a[href="#' + this.children[i].id + '"]').on('shown.bs.tab', $.proxy(function (e) {
                if (this.events !== null && this.events.afterShow !== undefined) {
                    this.events.afterShow.call(this, this);
                }
            }, this.children[i]))
        }
        if (this.showFirstTab) {
            //по умолчанию показываем первую вкладку
            this.children[0].show();
        }
    }

    /**
     * Строим объекты-вкладки
     */
    buildTabsContent() {
        //генерируем контейнер
        let tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.style.height = /*(this.box.clientHeight - 45) + 'px'*/'calc(100% - 45px)';
        this.box.appendChild(tabContent);
        //вызываем конструкторы
        for (let i in this.tabsContent) {
            let tab = new Tab({
                code: this.code,
                content: this.content,
                element: this.tabsContent[i],
                box: tabContent,
                parent: this
            })
        }
    }

    /**
     * Обновление
     */
    refresh() {
        for (let i in this.children) {
            this.children[i].refresh();
        }
    }
}

/**
 * @classdesc Класс сторит одну вкладку
 * @extends module:component.Component
 */
class Tab extends componentLib.Component {
    constructor(params) {
        super(params);
        //контейнер вкладки
        this.tabContainer = null;
        //показывает ести ли во вкладке контент
        this.isFilled = false;
        //информация о вкладке
        this.tabContent = null;
        this._beforeEvent = '';
        this._showByFunc = false;
        //хранит объект заморозки
        this._freezer = '';
        this.getAttributes(params.element);
        this.render();
        this.saveInWindow(this.id);
    }

    getAttributes(attributes) {
        if (attributes.elements[0] !== undefined)
            this.tabContent = attributes.elements[0]
    }

    /**
     * Обновление
     */
    refresh() {
        for (let i in this.children) {
            this.children[i].refresh();
        }
    }

    /**
     * Показать вкладку программно
     */
    show() {
        this._showByFunc = true;
        $('a[href="#' + this.id + '"]').tab('show');
    }

    /**
     * Заморозить вкладку
     * @param msg - сообщение
     */
    lock(msg = '') {
        let freezer = new tools.Freezer({
            place: this.tabContainer,
            message: msg
        });
        freezer.lock();
        this.isFilled = true;
        this._freezer = freezer;
    }

    /**
     * Разморозить
     */
    unlock() {
        this.isFilled = false;
        this._freezer.unlock();
    }

    /**
     * Прекратить показ текущей вкладки
     */
    stop() {
        this._beforeEvent.preventDefault();
    }

    /**
     * Сеттер для установки заполненности вкладки
     * @param value - значение
     */
    setFilled(value) {
        this.isFilled = value;
    }

    /**
     * Заполнить вкладку
     * @param data
     */
    fill(data) {
        let layoutLib = require('../layout/index.js');
        let layout = new layoutLib.Layout({
                box: this.tabContainer,
                element: (data === undefined ? this.tabContent : data.elements[0]),
                content: (data === undefined ? this.content : data.content),
                code: (data === undefined ? this.code : data.code),
                parent: this
            }
        );
        this.isFilled = true;
    }

    /**
     * Создать дом объект вкладки
     */
    render() {
        let tabDiv = document.createElement('div');
        tabDiv.className = 'tab-pane';
        tabDiv.style.height = 'calc(100% - 45px)'/*'calc(100%)'*/;
        tabDiv.style.width = '100%';
        tabDiv.id = this.id;
        this.tabContainer = tabDiv;
        this.box.appendChild(tabDiv);
        if (this.tabContent !== null) {
            this.fill();
        }
    }
}