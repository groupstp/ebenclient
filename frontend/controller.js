import TopMenu from './newTopMenu';
import DropDownMenu from './newDropdownMenu';
import ObjViewSelection from "./newObjViewSelection";
import ContentBuilder from "./newMainScreen";

import CookieService from "./services/cookie-service";
import LocalStorageService from './services/local-storage-service';
import * as tools from './tools';
import config from './config/config.js';

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

       const currentObjView = LocalStorageService.get('currentObjView');


        if (allowedObjectViews.length > 1) {
            this._initOjViewSelection(allowedObjectViews);
            // if we already use one of allowed object views
            if (allowedObjectViews.indexOf(currentObjView) !== -1) {
                this._objViewSelection.hide();
                this._updateMenu(currentObjView);
                this._mainScreen.show();
            } else { // if we use object view that have been forbidden for us
                LocalStorageService.delete('currentObjView');
            }
        } else if (allowedObjectViews.length === 1) {
            if (currentObjView !== allowedObjectViews[0]) {
                LocalStorageService.set('currentObjView', allowedObjectViews[0]);
            }
            this._updateMenu(allowedObjectViews[0]);
            this._mainScreen.show();
        }

    }

    _initMenu() {
        this._topMenu = new TopMenu({
            el: document.querySelector('#topMenu')
        });
        this._topMenu.render();

        //подписка на клик, роутер системы
        this._topMenu.on('menuItemSelected', event => {
            let detail = event.detail;
            //if (detail.obj === 'reference' || detail.obj === 'stage' || detail.obj === 'scheme') {
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
            //}
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

        this._objViewSelection.on('objViewSelected', async (event) => {
            let selectedObjView = event.detail.name;
            // set cookie for one day
            LocalStorageService.set('currentObjView', selectedObjView);
            this._objViewSelection.hide();
            this._updateMenu(selectedObjView);
            this._clearObjects();
            this._mainScreen.show();
            this._mainScreen.clearScreen();
        });

    }

    _initMainScreen() {
        this._mainScreen = new ContentBuilder({box: document.querySelector('#container')});
        this._mainScreen.render();
        this._mainScreen.hide();
    }

    _clearObjects() {
        // delete all w2ui objects because they don't need anymore after we switch object view
        for (let obj in w2ui) {
            delete w2ui[obj];
        }
        for (let obj in stpui) {
            delete stpui[obj];
        }
    }

    async _updateMenu(objView) {
        const elements = await this._getMenuFromServer(objView);
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

