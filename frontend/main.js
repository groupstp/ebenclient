'use strict';
//подключаем стили - можно создать несколько точек входа для каждого файла стилей
import './libraries/bootstrap/css/bootstrap.css';
import './libraries/fontawesome/css/font-awesome.css';
//еще немного скриптов
require('imports-loader?jQuery=jquery!./libraries/bootstrap/js/bootstrap.js');
//подключаем меню, причем сразу же
import menuTopFixed from './menu';
// компонент выбора предметных областей
import ObjViewSelection from './objViewSelection';
//подключаем менеджер страниц
import contentBuilder from './contentBuilder';
//подключаем конфиг
import config from './config/config.js';
//подключаем тулзы
import * as tools from './tools';
import CookieService from './services/cookie-service';
//подключаем библиотеку w2ui и экспортируем переменные из нее
const w2lib = require('imports-loader?jQuery=jquery!exports-loader?w2ui&w2alert&w2popup&w2utils&w2confirm!./libraries/w2ui/w2ui-1.5.js');
//подключаем стили
import './libraries/w2ui/w2ui-1.5.css';

// datepicker
require('imports-loader?jQuery=jquery!./libraries/bootstrap-datepicker/js/bootstrap-datepicker.min');
require('imports-loader?jQuery=jquery!./libraries/bootstrap-datepicker/locales/bootstrap-datepicker.ru.min');
import './libraries/bootstrap-datepicker/css/bootstrap-datepicker3.min.css';

/**
 * Модуль для построения главной страницы приложения
 * @module mainPage
 * @requires menu
 * @requires w2ui {@link https://w2ui.com}
 * @requires jQuery
 * @requires config
 * @requires tools
 * @requires contentBuilder
 */


//импортированные переменные делаем доступными всюду, в том числе jQuery;
window.w2popup = w2lib.w2popup;
window.w2alert = w2lib.w2alert;
window.w2ui = w2lib.w2ui;
window.w2utils = w2lib.w2utils;
window.w2confirm = w2lib.w2confirm;
window.jQuery = jQuery;

// проверка токена
let token = new tools.TokenAuth(config.name).checkToken();
// если токена нет - делаем redirect
if (token === undefined) {
    document.location.href = 'index.html';
}

//localStorage.clear();
let ruLocale = require('./libraries/w2ui/ru-ru.json');
w2utils.locale(ruLocale);

let containerDiv = document.getElementById('container');
//строим менеджер страниц
let builder = new contentBuilder({box: containerDiv, onHome: buildMain});
buildMain(builder);

// получаем конфиг с сервера
let serverConfigPromise;
try {
    serverConfigPromise = getServerConfigInfo();
    serverConfigPromise
        .then((serverConfig) => {
            // сформируем массив доступных пользователю предметных областей
            const possibleObjViews = [];
            for (let objViewName in serverConfig.objectViews) {
                possibleObjViews.push(objViewName);
            }

            const currentObjectView = CookieService.getCookie('currentObjectView');

            // если предметная область не выбрана строим меню без данных и компонент для выбора предметной области
            if (!currentObjectView) {
                buildMenu();
                buildObjectsViewSelection(possibleObjViews);
            } else {
                let menuData = getMenuInfoFromServer(currentObjectView);
                //buildMenu(menuData);
            }


        })
        .catch((err) => {
            throw(err)
        });
} catch (err) {
    twoBe.showMessage(0, "Не удалось получить конфигурационную информацию с сервера!");
}

function getServerConfigInfo() {
    const request = twoBe.createRequest();
    const url = twoBe.getDefaultParams().url + '/getConfigInfo';

    request.addUrl(url);
    return request.send();
}


function buildObjectsViewSelection(possibleObjViews = []) {
    let container = document.querySelector('#container');
    let objViewSelection = new ObjViewSelection({
        el: container,
        possibleObjViews: possibleObjViews
    });
}

function buildMain(builder) {
    let place = builder.showPage('main', 'Главная страница').generatedBox;
    place.innerHTML = '<div style = "text-align: center"><img src="mainPage.gif" alt=""></div><p><h1 align="center">Вы находитесь на главной странице</h1></p>';
}

// функция отправляет запрос к серверу на получение описания меню
function getMenuInfoFromServer() {
    twoBe.createRequest().addParam('action', 'getMenu').addParam('token', token).addBefore(function () {

    }).addSuccess(function (data) {
        buildMenu(data);
    }).addError(function (msg) {
        twoBe.showMessage(0, "Не удалось получить навигационное меню с сервера!");
    }).send();

}

function buildMenu(menuData = {}) {

    var menu = new menuTopFixed({
        name: config.caption,
        place: 'topMenu',
        objInfo: menuData
    });

    //подписка на клик, роутер системы
    menu.on('menuItemSelected', event => {
        let detail = event.detail;
        if (detail.obj === 'references' || detail.obj === 'stages' || detail.obj === 'scheme') {
            let path;
            if (detail.obj === 'scheme') {
                path = 'ref-scheme';
            } else {
                path = 'ref-' + detail.name;
            }


            let page = builder.showPage(path, detail.caption);
            //загружаем содержимое страницы с сервера
            page.load();
            //выделить пункт меню
            menu.selectItem(path);
        }
        /*кнопка выход*/
        if (detail.obj === 'exit') {
            new tools.TokenAuth(config.name).exit('index.html');
        }
    })

}







