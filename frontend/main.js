/**
 * Created by AHonyakov on 02.06.2017.
 */

'use strict'
//подключаем стили - можно создать несколько точек входа для каждого файла стилей
import './libraries/bootstrap/css/bootstrap.css';
import './libraries/fontawesome/css/font-awesome.css';
//еще немного скриптов
require('imports-loader?jQuery=jquery!./libraries/bootstrap/js/bootstrap.js');
//подключаем меню, причем сразу же
import menuTopFixed from './menu/index.js';
//подключаем менеджер страниц
import contentBuilder from './contentBuilder/index.js';
//подключаем конфиг
import {config} from './config/config.js';
//подключаем тулзы
import * as tools from './tools/index.js';
//подключаем библиотеку w2ui и экспортируем переменные из нее
const w2lib = require('imports-loader?jQuery=jquery!exports-loader?w2ui&w2alert&w2popup&w2utils&w2confirm!./libraries/w2ui/w2ui-1.5.js');
//подключаем стили
import './libraries/w2ui/w2ui-1.5.css';
//импортированные переменные делаем доступными всюду, в том числе jQuery;
window.w2popup = w2lib.w2popup;
window.w2alert = w2lib.w2alert;
window.w2ui = w2lib.w2ui;
window.w2utils = w2lib.w2utils;
window.w2confirm = w2lib.w2confirm;
window.jQuery = jQuery;

//проверка токена
let token = new tools.tokenAuth(config.name).checkToken();
if (token === undefined) {
    document.location.href = 'index.html';
}
let ruLocale = require('./libraries/w2ui/ru-ru.json')
w2utils.locale(ruLocale);
//строим меню
let info = JSON.parse(localStorage[config.name + '_ObjInfo']);
var menu = new menuTopFixed({
    name: config.caption,
    place: 'topMenu',
    objInfo: info
});
let containerDiv = document.getElementById('container');
//строим менеджер страниц
let builder = new contentBuilder({box: containerDiv, onHome: buildMain});
buildMain(builder);
//подписка на клик, роутер системы
menu.on('menuItemSelected', event => {
    let detail = event.detail;
    /*if (detail.obj === 'main') {
     buildMain(builder);
     }*/
    if (detail.obj === 'ref' || detail.obj === 'doc' || detail.obj === 'st') {
        let objectID = detail.obj + '&' + detail.name;
        let boxForElement = builder.showElement(objectID, detail.caption);
        let locker = new tools.Freezer({
            place: boxForElement,
            message: 'Загрузка'
        });
        let mainQuery = new tools.AjaxSender({
            url: 'http://localhost:1234/get' /*'server.json'*/,
            msg: "obj=" + detail.obj + '&name=' + detail.name /*''*/,
            before: function () {
                locker.lock();
            }.bind(this)
        });
        mainQuery.sendQuery()
            .then(
                response => {
                    locker.unlock();
                    let layoutLib = require('./layout/index.js');
                    let layout = new layoutLib.Layout({
                            box: boxForElement,
                            element: response.elements[0],
                            content: response.content,
                            code: response.code
                        }
                    );
                    //связываем лэйаут с менеджером страниц
                    builder.pages[builder.current].object = layout;
                },
                error => {
                    locker.unlock();
                    w2alert(error);
                }
            )
    }
    /*кнопка выход*/
    if (detail.obj === 'exit') {
        new tools.tokenAuth(config.name).exit('index.html');
    }
})

function buildMain(builder) {
    let place = builder.showElement('main', 'Главная страница')
    place.innerHTML = 'Главная страница!';
}





