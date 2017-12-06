/**
 * Модуль для построения форм
 * @module form
 * @requires simpleField
 * @requires button
 * @requires dropdownField
 * @requires component
 */

import {Component} from '../component';
import {SimpleField} from '../simpleField';
import {DropdownField} from '../dropdownField';
import {Button} from '../button';
import template from './template.hbs';

/**
 * @extends module:component.Component
 */
export class Form extends Component {
    constructor(options) {
        super(options);
        // флаг того что форма уже сформирована
        this.rendered = false;

        this.template = options.element.properties.template || false;

        // поля формы
        this.fields = [];
        // кнопки формы, но не кнопки относящиеся конкретно к полям
        this.buttons = [];

        /**
         * Поле, являющаяся первичным ключом
         * @member
         * @type {string}
         */
        this.PK = '';

        /**
         * Имя поля в котором хранится id главного элемента (если это поле заполнено, то это форма редактирования ТЧ)
         * @type {string}
         */
        this.refID = '';
        /**
         * id главного элемента
         * @type {string}
         */
        this.headID = '';

        // данные полей и внешние ключи
        this.data = this.prepareData(options.content);
        this.object = "";
        this.name = "";
        this._initForm(options.element.elements);
        this.saveInWindow();
        this.getAttributes(options.element);
    }

    getAttributes(attributes) {
        this.object = attributes.properties.object;
        this.name = attributes.properties.name;
        this.PK = attributes.properties.PK || 'ID';
        this.refID = attributes.properties.refID || '';
        this.headID = attributes.properties.headID || '';
        this.parentTableID = attributes.properties.parentTableID || '';
    }

    ////////// Private methods //////////

    /**
     * Инициализация формы, выделение колонок и кнопок из elements
     * @private
     */
    _initForm(elements = []) {
        extractElements.call(this, elements);

        function extractElements(elements) {

            elements.forEach((el) => {
                searchForFormElements.call(this, el);
            });

        }

        function searchForFormElements(el) {

            let type = el.type;

            switch (type) {
                case 'field' :
                    this.fields.push(new SimpleField({
                        "element": el,
                        "code": this.prepareCode(this.code),
                        "parent": this
                    }));
                    break;
                case 'dropList' :
                    this.fields.push(new DropdownField({
                        "element": el,
                        "code": this.prepareCode(this.code),
                        "parent": this
                    }));
                    break;
                case 'button' :
                    this.buttons.push(new Button({
                        "element": el,
                        "code": this.prepareCode(this.code),
                        "parent": this
                    }));
                    break;
            }

        }

    }

    _loadData() {
        let records = this.data.records;
        let fk = this.data.fk;

        // заполнить значения полей
        if (records && records.length) {
            // должна придти только 1 строка
            let record = records[0];
            for (let fieldName in record) {
                let field = this.getField(fieldName);
                if (field) {
                    // если значение есть, то нужно его использовать, возможно эта форма рендерится повторно
                    if (this.rendered) {
                        field.setValue(field.value);
                    } else { // загружаем то, что пришло с сервера
                        // если это ссылочный тип, то нужно взять значение для отображения из this.data.fk
                        if (this._itsForeignKeyField(fieldName)) {
                            // для ссылочного типа может быть массив значений
                            // TODO
                            let arrOfValues = createArrOfValues(this.data.fk[fieldName], record[fieldName]);
                            field.setValue(arrOfValues);
                        } else {
                            field.setValue(record[fieldName]);
                        }
                    }
                }
            }
        }

        // заполнить списки выбора
        if (fk) {
            for (let fieldName in fk) {
                let field = this.getField(fieldName);
                if (field) {
                    let arrOfValues = createArrOfValues(fk[fieldName]);
                    // задаем значения и для списка выбора
                    field.setListData(arrOfValues);
                }
            }
        }
        //  если это форма редактирования записи табличной записи
        if (this.refID) {
            let ownerIDField = this.getField(this.refID);
            if (ownerIDField) {
                ownerIDField.setValue(this.headID);
            }
        }

        /**
         * Функция возвращает массив объектов для загрузки в список выбора или в виде значения поля
         * @param values {object} - значения внешних ключей, id и value
         * @param ids {array} - id внешних ключей для которых нужно получить значения из fk
         * @returns {Array}
         */
        function createArrOfValues(values, ids) {

            let resultArr = [];

            // задаем значения списка выбора
            if (arguments.length === 1) {
                for (let key in values) {
                    resultArr.push({
                        "id": key,
                        "name": values[key]
                    });
                }
            } else if (arguments.length === 2) { // задаем значение поля
                ids.forEach((id) => {
                    let fkValue = values[id];
                    if (fkValue !== undefined) {
                        resultArr.push({
                            "id": id,
                            "name": fkValue
                        });
                    }
                });
            }

            return resultArr;
        }
    }

    /**
     * Проверяем поле на ссылочный тип
     * @private
     */
    _itsForeignKeyField(fieldName) {
        return this.data.fk[fieldName];
    }

    /**
     * Заполняет контейнер html содержимым (используется стандартный макет)
     * @private
     */
    _generateHtml() {

        if (!this.box) {
            this.box = document.createElement('div');
        }

        if (this.template) { // кастомный шаблон
            this.box.innerHTML = document.querySelector("#" + this.template).innerHTML;
        } else { // стандартный шаблон
            this.box.innerHTML = template();
            renderFields.call(this);
            renderButtons.call(this);
        }

        function renderFields() {
            let fieldsWrapper = this.box.querySelector('.fields-wrapper');

            this.fields.forEach((field) => {
                fieldsWrapper.appendChild(field.render());
            });
        }

        function renderButtons() {
            let btnsWrapper = this.box.querySelector('.form-btns-wrapper');

            this.buttons.forEach((btn) => {
                btnsWrapper.appendChild(btn.render());
            });
        }

    }

    _setupLogic() {

        this.fields.forEach((field) => {
            field.initLogic();
        });

        this.buttons.forEach((btn) => {
            btn.initLogic();
        });

    }


    /**
     * Валидация всех полей формы
     * @returns {array} || false
     */
    validate() {
        let result = {};
        let errors = false;

        this.fields.forEach((field) => {
            let value = field.getValue();
            // если получили массив, значит имеем дело с dropList и нас интересует его свойство id
            if (value && typeof value === 'object') {
                if (value.length) {
                    value = value[0].id;
                } else {
                    value = '';
                }

            }

            result[field.name] = value;

            if (field.isRequired()) {
                if (value === '') {
                    field.showError();
                    errors = true;
                } else {
                    field.showSuccess();
                }
            }
        });

        return (errors) ? null : result;
    }

    /**
     * Функция воозвращает данные в формате queryString
     */
    getData() {
        let formData = this.validate();
        if (!formData) {
            return null;
        } else {
            // let modifiedArr = formData.map((item) => {
            //     return item.name + '=' + item.value;
            // });
            //
            // return modifiedArr.join('&');
            return formData;
        }
    }


    ////////// Public methods //////////

    /**
     * Получить field по имени
     * @param name
     */
    getField(name) {

        let result = null;

        this.fields.forEach((field) => {
            if (field.name === name) {
                result = field;
            }
        });

        return result;
    }

    /**
     * Получить все поля
     * @returns {Array}
     */
    getFields() {
        return this.fields;
    }

    /**
     * Получает все поля с типом reference(то есть dropList'ы)
     * @returns {Array}
     */
    getDroplists() {
        let droplists = [];
        let fields = this.getFields();
        fields.forEach((field) => {
            let type = field.getType();
            if (type === 'reference') {
                droplists.push(fields);
            }
        });
        return droplists;
    }

    _setInternalHandlers() {
        this.box.addEventListener('changeValue', (event) => {
            this._onFieldValueChanged(event.detail);
        });
    }

    _onFieldValueChanged(field) {
        // обнулим все поля которые зависят от изменившегося поля
        let fieldsToClear = [];
        let fields = this.getFields();
        fields.forEach((fld) => {
            fld.filterFields.forEach((filterFld) => {
                if (filterFld.filterBy === field.name) {
                    fieldsToClear.push(fld);
                }
            });
        });
        fieldsToClear.forEach((fld) => {
            fld.clear();
        });
    }

    /**
     * Генерирует DOM элемент с формой и возвращает его
     * @returns {object} - DOM элемент с формой
     */
    render() {
        // если форма уже формировалась, то заного генерировать html и задавать логику не нужно
        if (!this.rendered) {
            // генерируем html
            this._generateHtml();
            // устанавливаем логику полей и кнопок
            this._setupLogic();
        }

        // загружаем данные которые пришли с сервера, либо обновляем из значений которые уже есть в fields
        this._loadData();

        this.addHandlers();

        this._setInternalHandlers();


        // вызываем событие "rendered"
        this.trigger('rendered');
        // ставим флаг, чтобы при повторном render'e брать данные уже с формы
        this.rendered = true;

        return this.box;

    }

}

