/**
 * @fileOverview Модуль для построения компонента - абстрактного объекта, часто употребляется понятие формат {@link https://vk.com}
 * @module component
 * @requires twoBe
 */


/**
 * Делаем библиотеку клиентского кода общедоступной
 */
import twoBe from '../twoBe/index.js';
window.twoBe = twoBe;
/**
 * @classdesc Класс для построения компонента - абстрактного класса для большинства отображаемых на экране объектов
 */
export class Component {
    /**
     * @constructor
     * @param {object} options - Набор параметров для построения компонента
     * @param {DOM} options.box - Куда поместить объект
     * @param {object} options.parent - Кто родитель этого объекта
     * @param {object} options.element - Сведения об элементе согласно формату
     * @param {object} options.code - Код
     * @param {array} options.content - Контент для элемента
     *
     */
    constructor(options) {
        /**
         * Место для компонента
         * @member
         * @type {DOM}
         */
        this.box = options.box || null;
        /**
         * Cсылка на родительский элемент
         * @member
         * @type {object}
         */
        this.parent = options.parent || null;
        //в случае пустот
        options.element = options.element || {};
        options.element.properties = options.element.properties || {};
        options.element.id = options.element.id || "";
        /**
         * Cобытия элемента, объект с именем события и именем обработчика события
         * @member
         * @type {object}
         */
        this.events = options.element.events || null;
        /**
         * Объект с именем обработчика события и кодом этого обработчика
         * @member
         * @type {object}
         */
        this.code = this.prepareCode(options.code) || {};
        /**
         * Данные компонента
         * @member
         * @type {array}
         */
        this.content = options.content || [];
        /**
         * Путь к объекту данных
         * @member
         * @type {string}
         */
        this.path = options.element.path || '';
        /**
         * Значение для идентификации всех компнентов (опционально)
         * @member
         * @type {string}
         */
        this.id = this.path + '-' + options.element.type + (options.element.id !== "" ? '-' + options.element.id : "");
        /**
         * Массив деток, нужен для каскадного обновления
         * @member
         * @type {array}
         */
        this.children = [];
        //записываемся в дети родителю
        this.recInChildren();
    }

    /**
     * Записывает объект в дети текущего объекта
     * @param child - объект
     */
    addChildren(child) {
        this.children.push(child);
    }

    /**
     * Функция записывает объект в дети к родителю
     */
    recInChildren() {
        if (this.parent !== null) {
            this.parent.addChildren(this);
        }
    }
    /**
     * Выделение записей и внешних ключей из content
     * @param contentArr - массив контента
     * @returns {object} - Объект из записей и внешних ключей к ним
     */
    prepareData(contentArr) {
        let content = {};
        contentArr.forEach((item) => {
            item.forId.forEach((id) => {
                if (id === this.id) {
                    content.records = item.records || [];
                    content.fk = item.fk || {};
                }
            })
        });
        return content;
    }

    eventHandler(event) {

        let type = event.type;
        let handlerName = this.events[type];
        if (!handlerName) return;

        let handler = this.code[handlerName];
        if (!handler) return;

        // в качестве параметра передаем сам элемент
        handler.apply(this, [this]);

    }

    addHandlers() {
        for (let eventName in this.events) {
            this.box.addEventListener(eventName, this.eventHandler.bind(this));
        }
    }

    /**
     * Уничтожает компонент
     */
    destroy() {
        this.box.innerHTML = '';
        delete stpui[this.id];
        if (w2ui[this.id] !== undefined) {
            w2ui[this.id].destroy();
        }
    }

    /**
     * Преобразует код из строки
     * @param {object} oldCode - объект из строковых функций
     * @returns {object} newCode - объект из функций
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
     * Активирует событие на элементе
     * @param eventName
     * @param data
     */
    trigger(eventName, data) {
        let customEvent = new CustomEvent(eventName, {detail: data});
        this.box.dispatchEvent(customEvent);
    }


    /**
     * Помещает объект в ДОМ
     */

    render() {

    }

    /**
     * Перезагружает компонент
     */
    reload() {

    }

    /**
     * Скрыть элемент со страницы
     */
    hide() {
        this.box.hidden = true;
    }

    /**
     * Отобразить скрытый элемент на странице
     */
    show() {
        this.box.hidden = false;
    }

    /**
     *  Сделать элемент доступным для редактирования
     */
    enable() {

    }

    /**
     *  Сделать элемент недоступным для редактирования
     */
    disable() {

    }

    /**
     * Обновить отображение объекта, нужно для в2уи в процессе скрытия/отображения
     */
    refresh() {

    }

    /**
     * Делает ассоциативный массив
     * @param array - массив
     * @param key - ключ
     * @returns {object} - ассоциативный массив
     */
    makeAsos(array, key) {
        let res = {};
        for (let i in array) {
            res[array[i][key]] = array[i];
        }
        return res;
    }

    /**
     * Из формата, пришедшего с сервера, добирает нужные поля объекта
     * @param attributes
     */
    getAttributes(attributes) {

    }

    /**
     * Записывает объект в глобальную переменную
     * @param id - идентификатор, по умолчанию берется идентификатор объекта
     */
    saveInWindow(id = this.id) {
        if (window.stpui === undefined) {
            window.stpui = {};
        }
        window.stpui[id] = this;
    }

    /**
     * Функция для совместимости с мобильным приложением, возвращает сам объект
     * @returns {Component}
     */
    getProperties() {
        return this;
    }


}