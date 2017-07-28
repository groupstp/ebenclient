export class Component {

    constructor(options) {
        this.box = options.box || null;
        // ссылка на родительский элемент
        this.parent = options.parent || null;
        // собятия элемента, объект с именем события и именем обработчика события
        options.element = options.element || '';
        options.element.properties = options.element.properties || ''
        this.events = options.element.events || null;
        // объект с именем обработчика события и кодом этого обработчика
        this.code = this.prepareCode(options.code) || {};
        // данные компонента
        this.content = options.content || [];
        //идентификатор
        this.id = options.element.id;
        //массив деток, нужен для каскадного обновления
        this.children = [];
        //записываемся в дети родителю
        this.recInChildren();
        //тип и имя объекта для которго строится компонент
        this.object = options.element.properties.object || "";
        this.name = options.element.properties.name || "";
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

    destroy() {
        this.box.innerHTML = '';
        delete stpui[this.id];
    }

    /**
     * Преобразует код из строки
     * @param oldCode
     * @returns {{}}
     * @private
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
     * @returns {{}}
     * @private
     */
    makeAsos(array, key) {
        let res = {};
        for (let i in array) {
            res[array[i][key]] = array[i];
        }
        return res;
    }

    /**
     * Из формата, пришедшего с сервера, добирвает нужные поля объекта
     * @param attributes
     */
    getAttributes(attributes) {

    }

    /**
     * Записывает объект в глобальную переменную
     * @param id
     */
    saveInWindow(id = this.id) {
        if (window.stpui === undefined) {
            window.stpui = {};
        }
        window.stpui[id] = this;
    }

    /**
     * Функция для совместимости с мобильным приложением
     * @returns {Component}
     */
    getProperties() {
        return this;
    }


}