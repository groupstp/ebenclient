/**
 * Created by AHonyakov on 08.06.2017.
 */
//импортируем конфиги и библиотеку авторизации
import {config} from './config/config.js';
import stpAuth from './auth/index.js';
//всякие библиотеки
import './libraries/bootstrap/css/bootstrap.css';
import './libraries/fontawesome/css/font-awesome.css';
require('imports-loader?jQuery=jquery!./libraries/bootstrap/js/bootstrap.js');
require('imports-loader?jQuery=jquery!./libraries/blockUI/jquery.blockUI.js');
//объект страница авторизации
let auth = new stpAuth({
    place: 'main',
    caption: config.caption,
    name: config.name,
    version: config.version,
    urlAuth: config.defaultUrl,
    urlGet: config.defaultUrl,
    msgGet: 'type=google&method=geturl',
    urlGetTokens: config.defaultUrl,
    msgGetTokens: 'type=google&method=gtokens',
    authGoogle: config.authGoogle,
    redirectUrl: config.mainPage
});