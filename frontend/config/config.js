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
    caption: 'Тестовая ИС',
    defaultUrl: 'http://gag-test.groupstp.ru:80/api/login',
    version: '0.0.1',
    authGoogle: false,
    mainPage: 'main.html',
    testUrl: "http://gag-test.groupstp.ru:80/api"
};

export default config;
