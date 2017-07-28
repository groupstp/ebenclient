/**
 * Created by AHonyakov on 10.07.2017.
 */

import * as componentLib from '../component';
import * as tools from '../tools/index.js';
export class Tabs extends componentLib.Component {
    constructor(params) {
        super(params);
        this.tabsContent = [];
        this.getAttributes(params.element);
        this.buildTabsHeaders();
        this.buildTabs();
        console.log(this);
    }

    getAttributes(attributes) {
        this.tabsContent = this.makeAsos(attributes.elements, 'id');
        for (let id in this.tabsContent) {
            if (this.tabsContent[id].events !== undefined) {
                for (let event in this.tabsContent[id].events) {
                    this.tabsContent[id].events[event] = this.code[this.tabsContent[id].events[event]];
                }
            }
        }
    }

    buildTabsHeaders() {
        let navTabs = document.createElement('ul');
        navTabs.className = "nav nav-pills";
        this.box.appendChild(navTabs);
        for (let id in this.tabsContent) {
            let li = document.createElement('li');
            navTabs.appendChild(li);
            let aHref = document.createElement('a');
            aHref.innerHTML = this.tabsContent[id].properties.header;
            aHref.setAttribute('data-toggle', 'pill');
            aHref.setAttribute('href', '#' + id);
            aHref.data = id;
            li.appendChild(aHref);
        }
    }

    buildTabs() {
        let tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        console.log(this.box.clientHeight);
        tabContent.style.height = (this.box.clientHeight - 45) + 'px';
        this.box.appendChild(tabContent);
        for (let id in this.tabsContent) {
            let tab = new Tab({
                id: id,
                code: this.code,
                content: this.content,
                element: this.tabsContent[id],
                box: tabContent,
                parent: this
            })
        }
        this.children[0].show();
    }

    refresh() {
        for (let i in this.children) {
            this.children[i].refresh();
        }
    }
}


class Tab extends componentLib.Component {
    constructor(params) {
        super(params);
        this.tabContainer = null;
        this.isFilled = false;
        this.tabContent = null;
        this._beforeEvent = '';
        this._showByFunc = false;
        this._freezer = '';
        this.getAttributes(params.element);
        this.render();
        this.saveInWindow(this.id);
        console.log(this);
    }

    getAttributes(attributes) {
        if (attributes.elements[0] !== undefined)
            this.tabContent = attributes.elements[0]
    }

    refresh() {
        for (let i in this.children) {
            this.children[i].refresh();
        }
    }

    show() {
        this._showByFunc = true;
        $('a[href="#' + this.id + '"]').tab('show');
    }

    lock(msg = '') {
        let freezer = new tools.Freezer({
            place: this.tabContainer,
            message: msg
        });
        freezer.lock();
        this.isFilled = true;
        this._freezer = freezer;
    }

    unlock() {
        this.isFilled = false;
        this._freezer.unlock();
    }

    stop() {
        this._beforeEvent.preventDefault();
    }

    setFilled(value) {
        this.isFilled = value;
    }

    fill(data) {
        let layoutLib = require('../layout/index.js');
        let layout = new layoutLib.Layout({
                box: this.tabContainer,
                element: (data === undefined ? this.tabContent : data.elements[0]),
                content: (data === undefined ? this.content : data.content),
                code: (data === undefined ? this.code : data.code),
                parent: this
            }
        );
        this.isFilled = true;
    }

    render() {
        let tabDiv = document.createElement('div');
        tabDiv.className = 'tab-pane';
        tabDiv.style.height = this.box.clientHeight + 'px';
        tabDiv.style.width = '100%';
        tabDiv.id = this.id;
        this.tabContainer = tabDiv;
        this.box.appendChild(tabDiv);
        if (this.tabContent !== null) {
            this.fill();
        }

        $('a[href="#' + this.id + '"]').on('show.bs.tab', $.proxy(function (e) {
            for (let i in this.children) {
                this.children[i].refresh();
            }
            if (!this._showByFunc) {
                if (this.events !== null && this.events.beforeShow !== undefined) {
                    this._beforeEvent = e;
                    this.events.beforeShow.call(this, this);
                }
            }
        }, this))
        //afterShow
        $('a[href="#' + this.id + '"]').on('shown.bs.tab', $.proxy(function (e) {
            if (this.events !== null && this.events.afterShow !== undefined) {
                this.events.afterShow.call(this, this);
            }
        }, this))
    }
}