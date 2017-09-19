/**
 * Модуль для построения field
 * @module field
 * @requires button
 * @requires component
 */
import {Component} from '../component';
import {Button} from '../button';
import template from './template.hbs'
/**
 * @extends module:component.Component
 */
export class Field extends Component {

    constructor(options) {
        super(options);

        this.name = options.element.properties.name || this.id;

        // DOM-объект контролирующего элемента (input или textarea)
        this.controlEl = null;
        // кнопки относящиеся именно к этому полю
        this.buttons = [];

        this.label = options.element.properties.label || '';
        this.type = options.element.properties.type;
        // при true используем textarea
        this.multiline = options.element.properties.multiline || false;

        this.hidden = options.element.properties.hidden || false;
        this.enabled = options.element.properties.enabled || true;
        this.required = options.element.properties.required || false;

        this._initField(options.element.elements);
    }

    ///// Private methods /////

    /**
     * Инициализация поля, поиск кнопок
     * @private
     */
    _initField(elements = []) {

        extractElements.call(this, elements);

        function extractElements(elements) {

            elements.forEach((el) => {
                searchForFormElements.call(this, el);
            });

        }

        function searchForFormElements(el) {

            let type = el.type;
            switch (type) {
                case 'button' :
                    el.path = this.path;
                    this.buttons.push(new Button({
                        "element": el,
                        "code": this.prepareCode(this.code),
                        "parent": this
                    }));
                    break;
            }

        }

    }

    /**
     * Заполняет контейнер html содержимым
     * @private
     */
    _generateHTML() {

        if (!this.box) {
            this.box = document.createElement('div');
        }

        let requiredMark = (this.required) ? '<sup style="color:red; margin-left: 4px">*</sup>' : '';

        // TODO переделать для checkbox'ов и radio кнопок
        this.box.innerHTML = template({
            "label": this.label,
            "requiredMark": requiredMark,
            "id": this.id,
            "name": this.name,
            "multiline": this.multiline,
            "checkbox": (this.type === 'checkbox') ? true : false
        });

        if (this.multiline) {
            this.controlEl = this.box.querySelector('textarea');
        } else {
            this.controlEl = this.box.querySelector('input');
        }
        debugger;
        this._renderButtons();

    }

    /**
     * Рисуем кнопки
     * @private
     */
    _renderButtons() {

        let btnsWrapper = this.box.querySelector('.field-btns-wrapper');

        if (!btnsWrapper) return;

        this.buttons.forEach((btn) => {
            btnsWrapper.appendChild(btn.render());
            btn.initLogic();
        });

    }

    /**
     * Метод определяет обязательное ли это поле
     * @returns {boolean}
     */
    isRequired() {
        if (this.required) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Окрашиваем поле в зеленный цвет(успешная валидация)
     */
    showSuccess() {
        this.removeNotifications();
        this.box.classList.add('has-success');
    }

    /**
     * Окрашиваем поле в красный цвет(неуспешная валидация)
     */
    showError() {
        this.removeNotifications();
        this.box.classList.add('has-error');
    }

    /**
     * Убираем любое окрашивание
     */
    removeNotifications() {
        this.box.classList.remove('has-success');
        this.box.classList.remove('has-error');
    }

    initLogic() {

        // если до сих пор не определен контейнер box - значит мы работаем с кастомным шаблоном, а в нем по стандарту поле должно быть завернуто в div с [data-component = "field"]
        if (!this.box) {
            let input = this.parent.box.querySelector('#' + this.id);
            this.controlEl = input;
            this.box = input.closest('[data-component = "field"]');
        }

        this.buttons.forEach((btn) => {
            btn.initLogic();
        });

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


    enable() {
        this.buttons.forEach((btn) => {
            btn.enable();
        });
    }

    disable() {
        this.buttons.forEach((btn) => {
            btn.disable();
        });
    }

    setValue(newValue) {

    }

    getValue() {

    }

    getType() {
        return this.type;
    }


    /**
     * Генерирует DOM элемент с полем и возвращает его
     * @returns {object} - DOM элемент с формой
     */
    render() {

        this._generateHTML();

        return this.box;

    }

}