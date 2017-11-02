'use strict';
//подключаем стили - можно создать несколько точек входа для каждого файла стилей
import './libraries/bootstrap/css/bootstrap.css';
import './libraries/fontawesome/css/font-awesome.css';
//еще немного скриптов
require('imports-loader?jQuery=jquery!./libraries/bootstrap/js/bootstrap.js');
//подключаем менеджер страниц
import contentBuilder from './contentBuilder';
//подключаем конфиг
import config from './config/config.js';
//подключаем тулзы
import * as tools from './tools';
//подключаем библиотеку w2ui и экспортируем переменные из нее
const w2lib = require('imports-loader?jQuery=jquery!exports-loader?w2ui&w2alert&w2popup&w2utils&w2confirm!./libraries/w2ui/w2ui-1.5.js');
//подключаем стили
import './libraries/w2ui/w2ui-1.5.css';

// datepicker
require('imports-loader?jQuery=jquery!./libraries/bootstrap-datepicker/js/bootstrap-datepicker.min');
require('imports-loader?jQuery=jquery!./libraries/bootstrap-datepicker/locales/bootstrap-datepicker.ru.min');
import './libraries/bootstrap-datepicker/css/bootstrap-datepicker3.min.css';

//импортированные переменные делаем доступными всюду, в том числе jQuery;
window.w2popup = w2lib.w2popup;
window.w2alert = w2lib.w2alert;
window.w2ui = w2lib.w2ui;
window.w2utils = w2lib.w2utils;
window.w2confirm = w2lib.w2confirm;
window.jQuery = jQuery;

window.stpui = {};
// проверка токена
let token = new tools.TokenAuth(config.name).checkToken();
// если токена нет - делаем redirect
if (token === undefined) {
    document.location.href = 'index.html';
}

//localStorage.clear();
let ruLocale = require('./libraries/w2ui/ru-ru.json');
w2utils.locale(ruLocale);

import Controller from './controller';

const controller = new Controller();
controller.init();