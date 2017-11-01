import TopMenu from './newTopMenu';
import DropDownMenu from './newDropdownMenu';
import CookieService from "./services/cookie-service";
import ObjViewSelection from "./newObjViewSelection";
import ContentBuilder from "./newMainScreen";

export default class Controller {
    constructor() {
        this._topMenu = null;
        this._objViewSelection = null;
        this._mainScreen = null;
    }

    async init() {

        this._initMenu();
        this._initMainScreen();

        // получить данные с сервера
        const mainInterface = await this._getInterface();

        const allowedObjectViews = [];
        for (let objViewName in mainInterface.objectViews) {
            allowedObjectViews.push(objViewName);
        }

        /*const currentObjView = CookieService.getCookie('currentObjView');
        if (allowedObjectViews.indexOf(currentObjView) !== -1){

        }*/

        if (allowedObjectViews.length > 1) {
            this._initOjViewSelection(allowedObjectViews);
        } else if (allowedObjectViews.length === 1) {
            const menuData = await this._getMenuFromServer(allowedObjectViews[0]);
            this._updateMenu(menuData);
            this._mainScreen.show();
        }

        /*this._topMenu.addDropDownMenu(new DropDownMenu({
            key: 'reference',
            title: 'Справочники',
            items: [{key: 'query', value: 'Заявки'}, {key: 'position', value: 'Позиции'}]
        }));*/
        /*this._topMenu.addDropDownMenu(new DropDownMenu({
            key: 'stages',
            title: 'Этапы'
        }));
        this._topMenu.renderDDMenus();*/

    }

    _initMenu() {
        this._topMenu = new TopMenu({
            el: document.querySelector('#topMenu')
        });
        this._topMenu.render();

        //подписка на клик, роутер системы
        this._topMenu.on('menuItemSelected', event => {
            let detail = event.detail;
            if (detail.obj === 'reference' || detail.obj === 'stage' || detail.obj === 'scheme') {
                let path;
                if (detail.obj === 'scheme') {
                    path = 'ref-scheme';
                } else {
                    path = 'ref-' + detail.name;
                }


                let page = this._mainScreen.showPage(path, detail.caption);
                //загружаем содержимое страницы с сервера
                page.load();
                //выделить пункт меню
                //menu.selectItem(path);
            }
        });

        this._topMenu.on('toObjViewSelection', event => {
            this._topMenu.clearDropDownMenus();
            this._topMenu.render();
            this._mainScreen.hide();
            this._objViewSelection.show();
        });

        this._topMenu.on('exit', event => {
            new tools.TokenAuth(config.name).exit('index.html');
        });

    }

    _initOjViewSelection(objViews) {
        this._objViewSelection = new ObjViewSelection({
            el: document.querySelector('#objViewSelection'),
            objViews: objViews
        });
        this._objViewSelection.render();

        this._objViewSelection.on('select', async (event) => {
            let selectedObjView = event.detail.name;
            CookieService.setCookie('currentObjView', selectedObjView);
            this._objViewSelection.hide();
            const menuData = await this._getMenuFromServer(selectedObjView);
            this._updateMenu(menuData);
            this._mainScreen.show();
        });

    }

    _initMainScreen() {
        this._mainScreen = new ContentBuilder({box: document.querySelector('#container')});
        this._mainScreen.render();
        this._mainScreen.hide();
    }

    async _updateMenu(elements) {
        for (let objType in elements) {
            let options = {
                key: objType,
                title: '',
                items: []
            };
            const element = elements[objType];
            options.title = element.display;

            const innerObjects = element.objects;

            innerObjects.forEach((innerEl) => {
                const item = {
                    key: innerEl.key,
                    value: innerEl.value
                };
                options.items.push(item);
            });

            this._topMenu.addDropDownMenu(new DropDownMenu(options));
        }
        this._topMenu.renderDDMenus();
    }

    async _getMenuFromServer(objView) {
        const request = twoBe.createRequest();
        request.addParam('action', 'getMenu').addParam('objView', objView);
        return request.send();
        //twoBe.showMessage(0, "Не удалось получить навигационное меню с сервера!");
    }

    async _getInterface() {
        const request = twoBe.createRequest();
        const url = twoBe.getDefaultParams().url + '/getConfigInfo';

        request.addUrl(url);
        return request.send();

    }
}

