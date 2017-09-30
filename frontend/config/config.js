/**
 * Модуль конфигурации
 * @module config
 */
'use strict'
/**
 * Объект конфига
 * @type {{name: string, caption: string, defaultUrl: string, version: string, authGoogle: boolean, mainPage: string, testUrl: string}}
 */
export let config = {
    name: 'test',
    caption: 'Тестовая ИС',
    defaultUrl: 'https://gag.groupstp.ru:8809',
    version: '0.0.1',
    authGoogle: true,
    mainPage: 'main.html',
    testUrl: "http://localhost:12345"
}