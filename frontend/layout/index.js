/**
 * Created by AHonyakov on 28.06.2017.
 */
'use strict'

import * as componentLib from '../component'
import twoBe from '../twoBe/index.js';
window.twoBe = twoBe;

export class Layout extends componentLib.Component {
    constructor(param) {
        super(param);
        this.panels = {};
        this.saveInWindow();
        this.getAttributes(param.element);
        this.render();
    }

    getAttributes(attributes) {
        for (let i in attributes.elements) {
            this.panels[attributes.elements[i].properties.position] = attributes.elements[i];
        }
    }

    refresh() {
        for (var i in this.children) {
            this.children[i].refresh();
        }
    }

    render(place) {
        if (place === undefined) {
            place = this.box;
        }
        if (w2ui[this.id] !== undefined) {
            w2ui[this.id].destroy();
        }
        let panelObj = this.makew2uilayout();
        $(place).w2layout(panelObj);
        this.buildPanels();
    }

    /**
     * Делает объект для в2уай
     * @returns {{name: *}}
     * @private
     */
    makew2uilayout() {
        let obj = {
            name: this.id
        }
        let panels = [];
        for (let type in this.panels) {
            panels.push({
                type: this.panels[type].properties.position,
                size: this.panels[type].properties.width,
                resizable: true
            })
            if (this.panels[type].elements.length !== 1 && this.panels[type].elements.length !== 0) {
                let error = new Error('Wrong format data');
                throw (error);
            }
        }
        obj.panels = panels;
        console.log(obj);
        return obj;
    }

    /**
     * Выполняет построение панелей и объектов в них
     * @private
     */
    buildPanels() {
        console.log(this.panels);
        for (let panel in this.panels) {
            if (this.panels[panel] === undefined) continue;
            //определяем тип содержимого
            //содержимое таблица
            if (this.panels[panel].elements[0].type === 'grid') {
                //запоминание контекста
                let self = this;
                //подключаем нужную библиотеку
                let needLib = require('bundle-loader!../grid/grid.js')(function (mod) {
                    //строим таблицу
                    new mod.Grid({
                        box: w2ui[self.id].el(panel),
                        element: self.panels[panel].elements[0],
                        code: self.code,
                        content: self.content,
                        parent: self
                    });
                });
            }
            if (this.panels[panel].elements[0].type === 'form') {
                //запоминание контекста
                let self = this;
                //подключаем нужную библиотеку
                let needLib = require('bundle-loader!../form/index.js')(function (mod) {
                    let form = new mod.Form({
                        element: self.panels[panel].elements[0],
                        code: self.code,
                        content: self.content,
                        parent: self
                    });
                    w2ui[self.id].el(panel).appendChild(form.render());
                });
            }
            if (this.panels[panel].elements[0].type === 'tabs') {
                //запоминание контекста
                let self = this;
                console.log(self);
                //подключаем нужную библиотеку
                let needLib = require('bundle-loader!../tabs/index.js')(function (mod) {
                    let tabs = new mod.Tabs({
                        box: w2ui[self.id].el(panel),
                        element: self.panels[panel].elements[0],
                        code: self.code,
                        content: self.content,
                        parent: self
                    });
                });
            }

        }
    }
}