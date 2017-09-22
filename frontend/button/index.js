/**
 * Модуль для построения кнопки
 * @module button
 * @requires component
 */

import {Component} from '../component';
import template from './template.hbs';
/**
 * @extends module:component.Component
 */
export class Button extends Component {

    constructor(options) {
        super(options);

        this.label = options.element.properties.label || '';

        this.controlEl = null;

        this.caption = options.element.properties.caption || '';
        this.icon = options.element.properties.icon || '';
        this.style = options.element.properties.style || 'btn btn-default';

        this.hidden = options.element.properties.hidden || false;
        this.enabled = options.element.properties.enabled || true;

        this.param = options.element.properties.param || '';
    }


    /**
     * Заполняет контейнер html содержимым
     * @private
     */
    _generateHTML() {
        if (!this.box) {
            this.box = document.createElement('div');
        }

        this.box.style.display = 'inline-block';

        this.box.innerHTML = template({
            "id": this.id,
            "className": this.style + " " + this.icon,
            "caption": this.caption
        });

        this.controlEl = this.box.querySelector('button');

    }

    initLogic() {
        // если до сих пор не определен контейнер box - значит мы работаем с кастомным шаблоном, а в нем по стандарту поле должно быть завернуто в div с [data-component = "button"]
        if (!this.box) {
            let button = this.parent.box.querySelector('#' + this.id);
            if (!button) return;
            this.controlEl = button;
            this.box = button.closest('[data-component = "button"]');
        }
        //debugger;
        this.addHandlers();
    }

    applyProperties() {
        if (this.hidden) {
            this.hide();
        } else {
            this.show();
        }

        if (this.enabled) {
            this.enable();
        } else {
            this.disable();
        }
    }

    ///// Public methods /////

    /**
     * Скрыть элемент со страницы
     */
    hide() {
        this.box.style.display = 'none';
    }

    /**
     * Отобразить скрытый элемент на странице
     */
    show() {
        this.box.style.display = 'inline-block';
    }

    enable() {
        // при кастомном макете элемент может быть не орпеделен
        if (!this.controlEl) return;
        this.controlEl.removeAttribute('disabled');

    }

    disable() {
        // при кастомном макете элемент может быть не орпеделен
        if (!this.controlEl) return;
        this.controlEl.setAttribute('disabled', true);
    }

    /**
     * Генерирует DOM элемент с кнопкой и возвращает его
     * @returns {object} - DOM элемент с формой
     */
    render() {

        this._generateHTML();
        this.applyProperties();

        return this.box;

    }

}