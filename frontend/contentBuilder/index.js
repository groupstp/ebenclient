import * as componentLib from '../component';
import * as tools from '../tools/index.js';
/**
 * Created by AHonyakov on 21.07.2017.
 * Данный класс представляет собой реализацию скелета одностраничного приложения
 */
export default class contentBuilder extends componentLib.Component {
    constructor(param) {
        super(param);
        this.pageContainer = '';
        //какая страница открыта на данный момент
        this.current = -1;
        this.pages = [];//массив страниц
        this.onHome = param.onHome || null;//что делать при нажатии кнопки домой
        this.render();
        console.log(this);
    }

    /**
     * Размещает на странице тулбар и контейнер для страниц
     */
    render() {
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
     * @param place
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

    /**
     * Показывает страниу
     * @param id
     * @param caption
     * @returns
     */
    showPage(id, caption) {
        //меняем подпись вверху
        w2ui.navigatorToolbar.set('navigatorLabel', {html: '<b><h3>' + caption + '</h3></b>'});
        w2ui.navigatorToolbar.refresh();
        //подгоняем стили
        this.pageContainer.style.height = document.documentElement.clientHeight - 115 + 'px';
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
 *
 */
class Page {
    constructor(id, caption, box) {
        this.id = id;
        this.caption = caption;
        this.box = box;
        this.generatedBox = '';
        this.children = [];
        this.render();
        console.log(this);
    }

    addChildren(child) {
        this.children.push(child);
    }

    destroy() {
        this.generatedBox.parentNode.removeChild(this.generatedBox);
    }

    clear() {
        this.generatedBox.innerHTML = 'Перезагрузка';
        for (let i in this.children) {
            this.children[i].destroy();
        }
    }

    reload() {
        let object = this.children[0].object;
        let name = this.children[0].name;
        this.clear();
        let locker = new tools.Freezer({
            place: this.generatedBox,
            message: 'Загрузка'
        });
        let mainQuery = new tools.AjaxSender({
            url: 'http://localhost:1234/get' /*'server.json'*/,
            msg: "obj=" + object + '&name=' + name /*''*/,
            before: function () {
                locker.lock();
            }.bind(this)
        });
        mainQuery.sendQuery()
            .then(
                response => {
                    locker.unlock();
                    let layoutLib = require('../layout/index.js');
                    let layout = new layoutLib.Layout({
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
                    w2alert(error);
                }
            )
    }

    refresh() {
        for (let i in this.children) {
            this.children[i].refresh();
        }
    }

    render() {
        let boxForElement = document.createElement('div');
        boxForElement.id = 'boxForLayout' + this.id;
        boxForElement.style.height = '100%';
        this.box.appendChild(boxForElement);
        this.generatedBox = boxForElement;
    }

    show() {
        document.getElementById('boxForLayout' + this.id).style.display = '';
    }

    hide() {
        document.getElementById('boxForLayout' + this.id).style.display = 'none';
    }
}