/**
 * Модуль для построения объекта-контейнера страниц
 * @module contentBuilder
 * @requires tools
 * @requires component
 * @requires layout
 * @requires config
 */
import * as componentLib from '../component';
import * as tools from '../tools/index.js';
//подключаем конфиг
import config from '../config/config.js';
import twoBe from "../twoBe/index";
import CookieService from '../services/cookie-service';

let layout = require('../layout/index.js');
/**
 * @classdesc Данный класс представляет собой реализацию скелета одностраничного приложения
 * @extends module:component.Component
 */
export default class contentBuilder extends componentLib.Component {
    /**
     * @constructor
     * @param {object} options - Набор параметров для построения компонента
     * @param {DOM} options.box - Куда поместить объект
     * @param {object} options.parent - Кто родитель этого объекта
     * @param {object} options.element - Сведения об элементе согласно формату
     * @param {object} options.code - Код
     * @param {array} options.content - Контент для элемента
     * @param param.onHome  - действие при нажатии кнопки домой остальные
     */
    constructor(param) {
        super(param);
        this.pageContainer = '';
        //какая страница открыта на данный момент
        this.current = -1;
        this.pages = [];//массив страниц
        this.onHome = param.onHome || null;//что делать при нажатии кнопки домой
    }

    /**
     * Размещает на странице тулбар и контейнер для страниц
     */
    render() {
        this.box.innerHTML = '';
        let pageNavigator = document.createElement('div');
        pageNavigator.id = 'pageNavigator';
        pageNavigator.style.marginBottom = '5px';
        this.box.appendChild(pageNavigator);
        let pageContainer = document.createElement('div');
        pageContainer.id = 'pageContainer';
        this.box.appendChild(pageContainer);
        this.pageContainer = pageContainer;
        this.buildNavigatorToolbar(pageNavigator);
    }

    /**
     * Функция выполняет построение тулбара
     * @param {DOM} place - куда поместить
     */
    buildNavigatorToolbar(place) {
        $(place).w2toolbar({
            name: 'navigatorToolbar',
            items: [
                {type: 'button', id: 'buttonNavigatorBack', tooltip: 'Back', icon: 'fa fa-arrow-left', disabled: true},
                {type: 'button', id: 'buttonNavigatorStr', tooltip: 'Up', icon: 'fa fa-arrow-right', disabled: true},
                {type: 'button', id: 'buttonNavigatorHome', tooltip: 'Home', icon: 'fa fa-home', disabled: true},
                {
                    type: 'button',
                    id: 'buttonNavigatorReload',
                    tooltip: 'Reload',
                    icon: 'fa fa-refresh',
                    disabled: false
                },
                {type: 'break'},
                {type: 'html', id: 'navigatorLabel', html: '<b><h3>Главная страница</h3></b>'},
                {type: 'spacer'}
            ],
            onClick: function (event) {
                if (event.item.id === 'buttonNavigatorBack') {
                    this.current--;
                    this.pages[this.current + 1].hide();
                    this.pages[this.current].show();
                    w2ui.navigatorToolbar.set('navigatorLabel', {html: '<b><h3>' + this.pages[this.current].caption + '</h3></b>'});
                    if (this.current === 0) {
                        w2ui.navigatorToolbar.set('buttonNavigatorBack', {disabled: true});
                        w2ui.navigatorToolbar.render();
                    }
                    w2ui.navigatorToolbar.set('buttonNavigatorStr', {disabled: false});
                    w2ui.navigatorToolbar.set('buttonNavigatorHome', {disabled: false});
                    w2ui.navigatorToolbar.render();
                    this.refresh();

                }
                if (event.item.id === 'buttonNavigatorStr') {
                    this.current++;
                    this.pages[this.current - 1].hide();
                    this.pages[this.current].show();
                    w2ui.navigatorToolbar.set('navigatorLabel', {html: '<b><h3>' + this.pages[this.current].caption + '</h3></b>'});
                    if (this.current === this.pages.length - 1) {
                        w2ui.navigatorToolbar.set('buttonNavigatorStr', {disabled: true});
                        w2ui.navigatorToolbar.render();
                    }
                    w2ui.navigatorToolbar.set('buttonNavigatorBack', {disabled: false});
                    w2ui.navigatorToolbar.set('buttonNavigatorHome', {disabled: false});
                    w2ui.navigatorToolbar.render();
                    this.refresh();
                }
                if (event.item.id === 'buttonNavigatorHome') {
                    if (this.onHome !== null) {
                        this.onHome(this);
                        w2ui.navigatorToolbar.set('buttonNavigatorHome', {disabled: true});
                    }
                }
                if (event.item.id === 'buttonNavigatorReload') {
                    if (this.pages[this.current].id === 'main') {
                        return;
                    }
                    this.pages[this.current].reload();
                }
            }.bind(this)
        });
    }

    /**
     * Выполняет обновление текущей страницы
     */
    refresh() {
        if (this.pages[this.current] !== undefined)
            this.pages[this.current].refresh();
    }

    // Set default values to properties and render component
    clearScreen(){
        this.pages.length = [];
        this.current = -1;
        this.render();
    }

    /**
     * Показывает страниу
     * @param id - идентифкатор страницы(возможно это наш path)
     * @param caption - подпись
     * @returns{Page}
     */
    showPage(id, caption) {
        //меняем подпись вверху
        w2ui.navigatorToolbar.set('navigatorLabel', {html: '<b><h3>' + caption + '</h3></b>'});
        w2ui.navigatorToolbar.refresh();
        //подгоняем стили
        this.pageContainer.style.height = document.documentElement.clientHeight - 120 + 'px';
        this.pageContainer.style.marginBottom = '15px';
        let uniq = true;
        this.current++;
        if (this.current > 0) {
            //скрываем предыдущую
            this.pages[this.current - 1].hide();
            w2ui.navigatorToolbar.set('buttonNavigatorBack', {disabled: false});
            w2ui.navigatorToolbar.set('buttonNavigatorHome', {disabled: false});
            w2ui.navigatorToolbar.render();
        }
        if (this.pages.length >= 0) {
            //убираем повторы
            for (let i in this.pages) {
                if (this.pages[i].id === id) {
                    if (i <= this.current - 1) uniq = false;
                    //удаляем страницу
                    this.pages[i].destroy();
                    //удаляем ее из массива
                    this.pages.splice(i, 1);
                    break;
                }
            }
        }
        if (!uniq) --this.current;
        let page = new Page(id, caption, this.pageContainer);
        this.pages.splice(this.current, 0, page);
        return page;
    }
}
/**
 * @classdesc Класс страницы в рамках одностраничного приложения
 */
class Page {
    /**
     * @constructor
     * @param path - идентификdebuggerатоif (token) {
        sendResponse(res, 'success', token);
    } else {
        sendResponse(res, 'error', 'Login error!');
    }р страницы
     * @param caption - подпись к странице
     * @param box - куда поместить
     */
    constructor(path, caption, box) {
        /**
         * Идентифкатор
         * @member
         * @type {string}
         */
        this.id = path;
        /**
         * Подпись
         * @member
         * @type {string}
         */
        this.caption = caption;
        /**
         * Куда поместить страницу
         * @member
         * @type {DOM}
         */
        this.box = box;
        /**
         * Сгенерированный блок страницы
         * @member
         * @type {DOM}
         */
        this.generatedBox = '';
        /**
         * Дети страницы
         * @member
         * @type {array}
         */
        this.children = [];
        this.render();
    }

    /**
     * Записать в дети
     * @param {object} child
     */
    addChildren(child) {
        this.children.push(child);
    }

    /**
     * Уничтожить страницу
     */
    destroy() {
        this.generatedBox.parentNode.removeChild(this.generatedBox);
    }

    /**
     * Очистить страницу
     */
    clear() {
        this.generatedBox.innerHTML = 'Перезагрузка';
        for (let i in this.children) {
            this.children[i].destroy();
        }
    }

    /**
     * Перезагрузить страницу
     */
    reload() {
        let path = this.id;
        this.clear();
        this.load();
    }

    /**
     * Обновить страницу
     */
    refresh() {
        for (let i in this.children) {
            this.children[i].refresh();
        }
    }

    /**
     * Получить блок страницы
     */
    render() {
        let boxForElement = document.createElement('div');
        boxForElement.id = 'boxForLayout' + this.id;
        boxForElement.style.height = '100%';
        this.box.appendChild(boxForElement);
        this.generatedBox = boxForElement;
    }

    /**
     * Показать страницу
     */
    show() {
        document.getElementById('boxForLayout' + this.id).style.display = '';
    }

    /**
     * Скрыть страницу
     */
    hide() {
        document.getElementById('boxForLayout' + this.id).style.display = 'none';
    }

    /**
     * Функция загружает страницу
     */
    load() {
        let locker = new tools.Freezer({
            place: this.generatedBox,
            message: 'Загрузка'
        });
        let token = new tools.TokenAuth(config.name).checkToken();
        const currentObjView = CookieService.getCookie('currentObjView') || '';
        let options = {
            action: 'get',
            path: this.id,
            token: token,
            objView: currentObjView,
            data: {
                type: 'listForm'
            }
        };
        // Проверим кэш на наличие дополнительных полей которые надо вернуть с запросом
        let cacheKey = 'customFieldsFor-' + this.id + '-grid-listForm';
        let additionalFields = twoBe.getCache(cacheKey);
        // И добавим их в данные запроса
        if (additionalFields) options.data.additionalFields = additionalFields;

        let mainQuery = new tools.AjaxSender({
            url: config.testUrl,
            msg: JSON.stringify(options),
            before: function () {
                locker.lock();
            }.bind(this)
        });
        mainQuery.sendQuery()
            .then(
                response => {
                    locker.unlock();
                    new layout.Layout({
                            box: this.generatedBox,
                            element: response.elements[0],
                            content: response.content,
                            code: response.code,
                            parent: this
                        }
                    );
                },
                error => {
                    locker.unlock();
                    this.generatedBox.innerHTML = '<h1>Получение данных окончилось неудачей!</h1>'
                    w2alert(error);
                }
            )
    }
}