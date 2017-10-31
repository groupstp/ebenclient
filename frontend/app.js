'use strict';
//подключаем стили - можно создать несколько точек входа для каждого файла стилей
import './libraries/bootstrap/css/bootstrap.css';
import './libraries/fontawesome/css/font-awesome.css';
//еще немного скриптов
require('imports-loader?jQuery=jquery!./libraries/bootstrap/js/bootstrap.js');

import Controller from './controller';

const controller = new Controller();
controller.init();