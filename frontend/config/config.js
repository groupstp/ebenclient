/**
 * Модуль конфигурации
 * @module config
 */
'use strict'
/**
 * Объект конфига
 * @type {{name: string, caption: string, defaultUrl: string, version: string, authGoogle: boolean, mainPage: string, testUrl: string}}
 */
let config = {
    name: 'test',
    caption: 'ИС Снабжение',
    defaultUrl: 'http://localhost:12345/login',
    version: '0.0.1',
    authGoogle: false,
    mainPage: 'main.html',
    testUrl: 'http://localhost:12345'
};

export default config;
