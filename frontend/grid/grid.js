/**
 * Модуль для построения таблиц
 * @module grid
 * @requires tools
 * @requires component
 */
import * as tools from '../tools/index.js';

import * as component from '../component'
import * as layout from '../layout'

//подключаем конфиг
import config from '../config/config.js';

let isEqual = require('lodash').isEqual;
let values = require('lodash').values;

//подключаем стили
import './grid.css';

/**
 * @classdesc Класс представляет собой компонент таблицы
 * @extends module:component.Component
 */
class BasicGrid extends component.Component {
    constructor(params) {
        super(params);
        /**
         * Пагинация
         * @member
         * @type {boolean}
         */
        this.pagination = false;
        /**
         * Иерархия
         * @member
         * @type {boolean}
         */
        this.hierachy = false;
        /**
         * Лимит подгружения
         * @member
         * @type {boolean}
         */
        this.limit = false;
        /**
         * Заголовок таблицы
         * @member
         * @type {string}
         */
        this.header = "";
        /**
         * Колонки таблицы в сыром виде
         * @member
         * @type {array}
         */
        this.columnsRaw = [];
        /**
         * Тулбар таблицы
         * @member
         * @type {object}
         */
        this.toolbar = {};
        /**
         * Cтроки таблицы до поиска
         * @member
         * @type {array}
         */
        this.recordsBS = [];
        /**
         * Строки таблицы из формата
         * @member
         * @type {object}
         */
        this.recordsRaw = {};//строки таблицы из формата
        /**
         * Внешние ключи
         * @member
         * @type {array}
         */
        this.fk = [];
        /**
         * Кнопки таблицы
         * @member
         * @type {object}
         */
        this.btns = {};
        /**
         * Массив обработчиков событий таблицы
         * @member
         * @type {object}
         */
        this.handlers = {};
        /**
         * Колонки по которым группируются записи
         * @member
         * @type {array}
         */
        this.groupedBy = [];
        /**
         * Колонка в которую выводится результат группировки
         * @member
         * @type {string}
         */
        this.showGroupCol = '';
        /**
         * Колонка, являющаяся первичным ключом
         * @member
         * @type {string}
         */
        this.PK = '';
        this.selectedRecs = [];
        this.multiselect = false;
        this.showSelectColumn = false;
        this.headID = '';
        this.refCol = '';
        this.sortBy = [];
        this.saveInWindow();
        this.getAttributes(params.element);
        this.render();
    }

    getAttributes(attributes) {
        this.pagination = attributes.properties.pagination || false;//пагинация
        this.hierachy = attributes.properties.hierachy || false;//иерархия
        this.limit = attributes.properties.limit;
        this.header = attributes.properties.header || "";
        for (let i in attributes.elements) {
            if (attributes.elements[i].type === 'column') {
                this.columnsRaw.push(attributes.elements[i].properties);
            }
            if (attributes.elements[i].type === 'toolbar') {
                //описание кнопок таблицы из формата
                this.toolbar = attributes.elements[i];
            }
        }
        this.PK = attributes.properties.PK || 'ID';
        this.columnsRaw = this.makeAsos(this.columnsRaw, 'field');
        let prepContent = this.prepareData(this.content);
        this.recordsRaw = this.makeAsos(prepContent.records, this.PK);
        this.fk = prepContent.fk;
        this.selectedRecs = attributes.properties.selectedRecords;
        this.multiselect = attributes.properties.multiselect || false;
        this.showSelectColumn = attributes.properties.showSelectColumn || false;
        this.headID = attributes.properties.headID || '';
        this.refCol = attributes.properties.refCol || '';
        this.sortBy = attributes.properties.sortBy || [];
        this.groupedBy = attributes.properties.groupBy || [];
        this.showGroupCol = attributes.properties.showGroupCol || null;
        // объект который отвечает за сохранение пагинации при поиске
        this.gridSearchParams = new GridSearchStructure();
        // имя табличной части которую нужно разворачивать в форме списка
        this.refToExpand = attributes.properties.refToExpand;
        this.setButtons();
        this.setHandlers();

    }

    /**
     * Размещает таблицу на странице
     * @param place - дом-объект
     * @private
     */
    render(place) {
        if (w2ui[this.id] !== undefined) {
            w2ui[this.id].destroy();
        }
        let objForW2 = this.makew2uiobject();
        if (place === undefined) {
            $(this.box).w2grid(objForW2);
        } else {
            $(place).w2grid(objForW2);
        }
        // Для ТЧ загрузим значения ссылочных полей
        if (this.refCol) {
            this._getValuesFromServer();
        }
        if (this.showGroupCol && this.groupedBy) {
            let groupedRecs = this.getGroupedRecords(this.recordsRaw, this.columnsRaw, this.groupedBy, this.showGroupCol);
            w2ui[this.id].clear();
            for (let i in this.groupedBy) {
                w2ui[this.id].removeColumn(this.groupedBy[i]);
            }
            w2ui[this.id].records = groupedRecs;
            for (let i in this.selectedRecs) {
                w2ui[this.id].select(this.selectedRecs[i]);
            }
        }
        w2ui[this.id].refresh();
        for (let i in this.selectedRecs) {
            w2ui[this.id].select(this.selectedRecs[i]);
        }
    }

    refresh() {
        w2ui[this.id].refresh();
        for (var i in this.children) {
            this.children[i].refresh();
        }
    }


    /**
     * Функция выделяет запись в таблице
     * @param id - идентификатор
     * @param scroll - нужно ли сделать наведение фокуса
     */
    selectRecord(id, scroll = true) {
        for (var i in w2ui[this.id].records)
            w2ui[this.id].unselect(w2ui[this.id].records[i].recid)
        if (!this.hierachy && this.groupedBy.length === 0) {
            w2ui[this.id].select(id);
        }
        if (this.groupedBy.length > 0) {
            this.selectInTree(id);
        }
        if (scroll) {
            w2ui[this.id].scrollIntoView();
        }
    }

    /**
     * Функция выполняет добавление записи в таблицу
     * @param data - данные с сервера при добавлении
     */
    addRecord(rec, fk) {
        //let ID = data.content[0].records[0][this.PK];
        let ID = rec[this.PK];
        //let recordRaw = this.makeAsos(data.content[0].records, this.PK);
        let recordRaw = this.makeAsos([rec], this.PK);
        //let fk = data.content[0].fk;
        //добавление для справочника без иерархии
        if (!this.hierachy && this.groupedBy.length === 0) {
            //записываем в поля объекта
            $.extend(this.recordsRaw, recordRaw);
            $.extend(true, this.fk, fk);
            //преобразуем запись
            let record = this.makeRecords(recordRaw, fk)[0];
            w2ui[this.id].add(record, true);
            if (!this.pagination) {
                w2ui[this.id].localSort();
                w2ui[this.id].refresh();
            }
            //делаем выделение записи
            this.selectRecord(ID);
        }
        //добавление в сгуппированные данные
        if (this.groupedBy.length > 0) {
            //записываем в поля объекта
            $.extend(this.recordsRaw, recordRaw);
            $.extend(true, this.fk, fk);
            //групируем по-новой
            let groupedRecs = this.getGroupedRecords(this.recordsRaw, this.columnsRaw, this.groupedBy, this.showGroupCol);
            w2ui[this.id].clear();
            w2ui[this.id].records = groupedRecs;
            w2ui[this.id].refresh();
            //делаем выделение записи
            this.selectInTree(ID);
        }
        //добавление в подгружаемую иерархию
        if (this.hierachy /*&& this.pagination*/ && this.groupedBy.length === 0) {
            let recordRawWithoutKey = recordRaw[Object.keys(recordRaw)[0]];
            let record = this.makeRecords(recordRaw, fk)[0];
            //можем ли отобразить новую запись
            let parentID = Array.isArray(recordRawWithoutKey.parentID) ? recordRawWithoutKey.parentID[0] : recordRawWithoutKey.parentID;
            // если добавялем на самый верхний уровень
            if (!parentID) {
                //записываем в поля объекта
                $.extend(this.recordsRaw, recordRaw);
                $.extend(true, this.fk, fk);

                // если это группа добавим что-то несуществующее в children чтобы появился символ того что это группа
                let fakeChildren = [];
                if (record.isGroup) {
                    fakeChildren = [{'recid': 'treeFake'}];
                }
                // формируем запись для добавления
                record.w2ui = {
                    children: fakeChildren
                };
                w2ui[this.id].add(record);

            } else if (this.selectInTree(parentID, false, false)) { // если добавляем куда-то в дереве
                let parentRec = w2ui[this.id].get(parentID);
                if (parentRec.w2ui !== undefined && parentRec.w2ui.children !== undefined /*&& parentRec.w2ui.children[0].recid !== 'treeFake'*/) {
                    //записываем в поля объекта
                    $.extend(this.recordsRaw, recordRaw);
                    $.extend(true, this.fk, fk);

                    // если это группа добавим что-то несуществующее в children чтобы появился символ того что это группа
                    let fakeChildren = [];
                    if (record.isGroup) {
                        fakeChildren = [{'recid': 'treeFake'}];
                    }
                    //формируем запись для добавления
                    record.w2ui = {
                        children: fakeChildren,
                        parent_recid: parentID
                    };
                    // если добавляем в пустую группу (например которую только что создали) то уберем фейковые данные
                    if (parentRec.w2ui.children[0].recid === 'treeFake') {
                        parentRec.w2ui.children = [];
                    }
                    // разворачиваем дерево
                    this.selectInTree(parentID, true, false);
                    let children = w2ui[this.id].get(parentID).w2ui.children;
                    children.push(record);
                    w2ui[this.id].set(parentID, {w2ui: {children: children}});
                    //для обновления категории
                    w2ui[this.id].toggle(parentID);
                    //w2ui[this.id].toggle(parentID);
                    //подсвечиваем добавленную запись
                    this.selectInTree(ID);
                } else {
                    //что-нибудь написать
                }
            } else {
                //что-нибудь написать
            }
        }
    }

    /**
     * Функция удаляет данные
     * @param id - идентифкатор записи
     */
    deleteRecords(id) {
        if (typeof (id) === 'object') {
            for (let i in id) {
                this.deleteRecords(id[i]);
            }
        } else {
            this.selectInTree(id, true, false);
            let record = w2ui[this.id].get(id);
            if (record !== null) {
                if (record.w2ui === undefined) {
                    w2ui[this.id].unselect(id);
                    w2ui[this.id].remove(id);
                } else {
                    if (record.w2ui.parent_recid !== undefined) {
                        var parent_recid = record.w2ui.parent_recid;
                        var parent_record = w2ui[this.id].get(parent_recid);
                        for (var i in parent_record.w2ui.children) {
                            if (parent_record.w2ui.children[i].recid === id) {
                                w2ui[this.id].unselect(id);
                                w2ui[this.id].remove(id);
                                parent_record.w2ui.children.splice(i, 1);
                                w2ui[this.id].refresh();
                            }
                        }
                    } else {
                        w2ui[this.id].unselect(id);
                        w2ui[this.id].remove(id);
                    }
                }
            }
        }
    }

    /**
     * Функция выполняет изменение записи в таблице
     * @param data - данные с сервера
     */
    updateRecords(data) {
        let records = data.content[0].records;
        let fk = data.content[0].fk;
        records.forEach((rec) => {
            let ID = rec[this.PK];
            this.deleteRecords(ID);
            this.addRecord(rec, fk);
        });

    }

    /**
     * Преобразует формат в массив кнопок таблицы
     */
    setButtons() {
        for (let i in this.toolbar.elements) {
            this.btns[this.toolbar.elements[i].id] = this.toolbar.elements[i].properties;
            this.btns[this.toolbar.elements[i].id].id = this.toolbar.elements[i].id;
            //обработчики нажатий на кнопку
            this.btns[this.toolbar.elements[i].id].onClick = function (element) {
                try {
                    this.code[this.toolbar.elements[i].events.onClick].call(this, element);
                } catch (err) {
                    console.log('SERVER CODE ERROR:' + err);
                    w2alert('Серевер вернул некорректное действие!');
                }

            }.bind(this)
        }
    }

    /**
     * Фризит таблицу
     * @param msg - выводимое сообщение
     */
    lock(msg = '') {
        w2ui[this.id].lock(msg, true);
    }

    /**
     * Размораживает таблицу
     */
    unlock() {
        w2ui[this.id].unlock();
    }

    /**
     * Делaем тулбар
     * @returns {{items: Array, onClick: (function(this:Grid))}}
     */
    makeToolbar() {
        let tlb = {
            items: [],
            onClick: function (event) {
                if (event.subItem === undefined) {
                    if (this.btns[event.item.id] !== undefined) {
                        try {
                            this.btns[event.item.id].onClick.call(this, this);
                        } catch (err) {
                            console.log('SERVER CODE ERROR:' + err);
                            w2alert('Серевер вернул некорректное действие!');
                        }
                    }


                } else {
                    if (this.btns[event.subItem.id] !== undefined) {
                        try {
                            this.btns[event.subItem.id].onClick.call(this, this);
                        } catch (err) {
                            console.log('SERVER CODE ERROR:' + err);
                            w2alert('Серевер вернул некорректное действие!');
                        }
                    }

                }

            }.bind(this)
        };
        for (let name in this.btns) {
            if (name === 'refreshGrid') {
                continue;
            }
            if (!this.btns[name].more)
                tlb.items.push({
                    type: 'button',
                    id: this.btns[name].id,
                    icon: this.btns[name].icon,
                    text: this.btns[name].caption,
                    disabled: (this.btns[name].needOnceSelected || this.btns[name].needSelected ? true : false)
                })
        }
        let menuItems = [];
        for (let name in this.btns) {
            if (this.btns[name].more)
                menuItems.push({
                    type: 'button',
                    id: this.btns[name].id,
                    icon: this.btns[name].icon,
                    text: this.btns[name].caption,
                    disabled: (this.btns[name].needOnceSelected || this.btns[name].needSelected ? true : false)
                })
        }
        if (menuItems.length > 0) {
            tlb.items.push({
                type: 'menu',
                id: 'moreMenu',
                text: 'Ещё',
                items: menuItems
            });
        }
        return tlb;
    }

    /**
     * Получает идентификатор выделенной записи
     * @returns {}
     */
    getSelectedID() {
        return (w2ui[this.id].getSelection()[0] || null);
    }

    /**
     * Получает идентификаторы выделенных записей
     * @returns {}
     */
    getSelectedIDs() {
        return (w2ui[this.id].getSelection()[0] === null ? null : w2ui[this.id].getSelection())
    }

    /**
     * Делаем контекстное меню
     * @returns {{items: Array, onClick: (function(this:grid))}}
     * @private
     */
    makeMenu() {
        let pkm = {
            items: [],
            onClick: function (event) {
                if (this.btns[event.menuItem.id] !== undefined)
                    try {
                        this.btns[event.menuItem.id].onClick.call(this, this);
                    } catch (err) {
                        console.log('SERVER CODE ERROR:' + err);
                        w2alert('Серевер вернул некорректное действие!');
                    }

            }.bind(this)
        };
        for (let name in this.btns) {
            pkm.items.push({
                type: 'button',
                id: this.btns[name].id,
                icon: this.btns[name].icon,
                text: this.btns[name].caption
            })
        }
        return pkm;

    }

    /**
     * Функция получает на вход массив id записей, возвращает true если все обязательные поля заполнены и false если есть пустые обязательные поля
     * @param idsArr - входящий массив id
     */
    validateData(idsArr) {
        // получим объект w2ui по id Grid'a
        let w2grid = w2ui[this.id];
        // для каждой записи
        for (let i = 0; i < idsArr.length; i++) {
            let id = idsArr[i];
            //let record = this.recordsRaw[id];
            let columns = this.columnsRaw;
            // для каждого столбца
            for (let col in columns) {
                // булево значение не интересует так как по умолчанию оно всегда заполнено (не важно true или false)
                if (columns[col].type === 'boolean') continue;
                // если столбец обязательный тогда
                if (this.isColumnRequired(col)) {
                    // получить значение в ячейке
                    let value = this.getCellValue(w2grid.get(id), col);
                    // если значение пустое тогда прерываем выполение и возвращаем ложь
                    if (this.isCellEmpty(value)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Делаем объект для в2уи
     * @returns {{name: *, show: {toolbar: boolean, footer: boolean}, recid: string, columns: Array, records: Array, toolbar: {items: Array, onClick: (function(this:grid))}, onMenuClick: (function()), menu: Array}}
     * @private
     */
    makew2uiobject() {
        var stpgrid = this;
        let obj = {
            name: this.id,
            autoLoad: (this.pagination ? 'auto' : false),
            header: this.header,
            url: (this.pagination && !this.hierachy ? " " : ""),
            limit: (this.pagination && !this.hierachy ? this.limit : ""),
            show: {
                toolbar: true,
                footer: true,
                selectColumn: this.showSelectColumn,
                toolbarSave: true
            },
            columns: this.makeColumns(),
            records: this.makeRecords(),
            toolbar: this.makeToolbar(),
            multiSelect: this.multiselect,
            onMenuClick: this.makeMenu().onClick,
            menu: this.makeMenu().items,
            onSelect: function (event) {
                event.onComplete = function () {
                    let selected = w2ui[this.id].getSelection();
                    if (selected.length === 1) {
                        for (let btn in this.btns) {
                            if (this.btns[btn].needOnceSelected || this.btns[btn].needSelected) {
                                let btnId = (this.btns[btn].more ? 'moreMenu:' : '') + btn;
                                w2ui[this.id + '_toolbar'].enable(btnId);
                            }
                        }
                    } else {
                        for (let btn in this.btns) {
                            if (this.btns[btn].needOnceSelected) {
                                let btnId = (this.btns[btn].more ? 'moreMenu:' : '') + btn;
                                w2ui[this.id + '_toolbar'].disable(btnId);
                            }
                        }
                    }
                    if (this.handlers.onSelect !== undefined) {
                        try {
                            this.handlers.onSelect();
                        } catch (err) {
                            console.log('SERVER CODE ERROR:' + err);
                            w2alert('Серевер вернул некорректное действие!');
                        }
                    }

                }.bind(this)
            }.bind(this),
            onUnselect: function (event) {
                event.onComplete = function () {
                    let selected = w2ui[this.id].getSelection();
                    if (selected.length === 1) {
                        for (let btn in this.btns) {
                            if (this.btns[btn].needOnceSelected) {
                                let btnId = (this.btns[btn].more ? 'moreMenu:' : '') + btn;
                                w2ui[this.id + '_toolbar'].enable(btnId);
                            }
                        }
                    } else {
                        for (let btn in this.btns) {
                            if (this.btns[btn].needOnceSelected) {
                                let btnId = (this.btns[btn].more ? 'moreMenu:' : '') + btn;
                                w2ui[this.id + '_toolbar'].disable(btnId);
                            }
                            if (this.btns[btn].needSelected && selected.length <= 0) {
                                let btnId = (this.btns[btn].more ? 'moreMenu:' : '') + btn;
                                w2ui[this.id + '_toolbar'].disable(btnId);
                            }
                        }
                    }
                }.bind(this)
            }.bind(this),
            onReload: function (event) {
                if (this.btns['refreshGrid'] !== undefined)
                    try {
                        this.btns['refreshGrid'].onClick.call(this, this);
                    } catch (err) {
                        console.log('SERVER CODE ERROR:' + err);
                        w2alert('Серевер вернул некорректное действие!');
                    }

                w2ui[this.id + '_toolbar'].render();
            }.bind(this),
            // TODO пока убираю чтобы не мешало редактированию в таблице
            // onDblClick: function (event) {
            //     if (this.handlers.onDblClick !== undefined) {
            //         try {
            //             w2ui[this.id].select(event.recid);
            //             this.handlers.onDblClick();
            //         } catch (err) {
            //             console.log('SERVER CODE ERROR:' + err);
            //             w2alert('Серевер вернул некорректное действие!');
            //         }
            //     }
            // }.bind(this),
            onRequest: function (event) {
                console.log(event, this.handlers.onRequest);
                if (this.handlers.onRequest !== undefined) {
                    this.handlers.onRequest(event);
                }
            }.bind(this),
            // событие нажатия на кнопку сохранить в тулбаре ТЧ
            onSave: function (event) {
                // по нажатию на кнопку Сохранить в тулбаре ТЧ необходимо выполнить проверку заполненности данных и сформировать запрос на сервере

                // отменить действие по умолчанию
                event.preventDefault();

                // получить объект Grid по имени объекта w2ui
                let grid = stpui[this.name];
                let w2grid = this;

                // получаем все измененные строки
                let changesRecs = w2grid.getChanges();

                // образуем массив id для передачи в функцию validateData
                let idsArr = changesRecs.map((item) => {
                    return item.recid;
                });

                // проверяем на заполненность
                let dataIsValid = grid.validateData(idsArr);

                // если какие-то данные не заполнены уведомляем пользователя и прекращаем выполнение
                if (!dataIsValid) {
                    twoBe.showMessage(0, 'Не все обязательные поля заполнены! Данные не могут быть сохранены!');
                    return;
                }

                // определим массив запросов, для конечного callback'a
                let requestsArr = [];

                // если все обязательные данные заполнены то
                // для каждой измененной строки формируем запрос к серверу на update
                changesRecs.forEach((rec) => {
                    let id = rec.recid;
                    // подготовим данные для отправки на сервер
                    let data = grid._prepareRecordsForSaving(rec);
                    let request = twoBe.createRequest();
                    request.addParam('action', 'update').addParam('path', grid.path).addData('record', data).addFilterParam(grid.PK, id)
                        .addBefore(function () {
                            grid.lock('Подождите...');
                        })
                        .addSuccess(function (data) {
                            // убрать метки у изменнных ячеек
                            w2grid.mergeRecordChanges(id);
                            // обновляем recordsRaw
                            let updatedRecord = {};
                            updatedRecord[id] = data.content[0].records[0];
                            $.extend(grid.recordsRaw, updatedRecord);
                            // выделить успешно обновленную запись
                            w2grid.set(id, {w2ui: {style: "background-color : rgba(54, 191, 61, 0.65)"}});
                            // снять выделение через 5 секунд
                            setTimeout(() => {
                                w2grid.set(id, {w2ui: {style: ""}});
                            }, 5000);

                        })
                        .addError(function (msg) {
                            // выделить запись которую не удалось обновить
                            w2grid.set(id, {w2ui: {style: "color : red"}});
                            // снять выделение через 5 секунд
                            setTimeout(() => {
                                w2grid.set(id, {w2ui: {style: ""}});
                            }, 5000);
                        });
                    requestsArr.push(request.send());
                });

                // итоговый callback
                Promise.all(requestsArr).then((data) => {
                    grid.unlock();
                }).catch((err) => {
                    twoBe.showMessage(0, 'Ошибка при обновлении записей табличной части!');
                    grid.unlock();
                });

            },
            onSearch: function (event) {
                if (/*this.pagination*/true) {
                    //был ли сброс поиска
                    if (!event.reset) {
                        event.preventDefault();
                        w2ui[this.id].searchClose();
                        //нужен адрес и сообщение
                        let filter = {};
                        let relation = {
                            or: [],
                            and: []
                        };
                        let actions = {
                            contains: 'consist',
                            is: 'equal',
                            between: 'between',
                            less: 'less',
                            more: 'greater'
                        };
                        for (let i in event.searchData) {
                            let nameCol = event.searchData[i].field.split('*').join('.');
                            if (this.fk[nameCol] !== undefined) {
                                nameCol += '.description';
                            }
                            let value = event.searchData[i].value;
                            if (event.searchData[i].type === 'date') {
                                if (typeof(event.searchData[i].value) !== 'string') {
                                    value = [];
                                    for (let j in event.searchData[i].value) {
                                        value[j] = event.searchData[i].value[j];
                                    }
                                } else {
                                    value = event.searchData[i].value
                                }
                                if (typeof(value) === 'object') {
                                    for (let j in value) {
                                        value[j] = tools.utils.getISODate(value[j], '/');
                                    }
                                } else {
                                    value = tools.utils.getISODate(value, '/');
                                }
                            }
                            filter[nameCol] = {
                                value: value,
                                sign: actions[event.searchData[i].operator] || 'consist'
                            }
                            relation.or.push(nameCol);
                        }
                        //для табличных частей
                        if (this.headID !== '') {
                            filter[this.refCol] = {
                                value: this.headID,
                                sign: 'equal'
                            }
                            relation.and.push(this.refCol);
                        }
                        //шлем запрос
                        let searchQuery = new tools.AjaxSender({
                            url: config.testUrl,
                            msg: JSON.stringify({
                                path: this.path,
                                action: 'getContent',
                                data: {
                                    type: 'gridRecords',
                                    filter: filter,
                                    relation: relation
                                }
                            }),
                            before: function () {
                                w2ui[this.id].lock('Поиск', true);
                            }.bind(this)
                        })
                        //в случае успеха
                        searchQuery.sendQuery()
                            .then(
                                response => {
                                    w2ui[this.id].unlock();
                                    if (this.recordsBS[0] === undefined) {
                                        this.recordsBS = w2ui[this.id].records;
                                    }
                                    w2ui[this.id].records = this.makeRecords(response.content[0].records, response.content[0].fk);
                                    w2ui[this.id].searchData = [];
                                    for (let searchInd in event.searchData) {
                                        if (event.searchData[searchInd].operator !== 'between') {
                                            w2ui[this.id].searchData.push(event.searchData[searchInd]);
                                        }

                                    }
                                    w2ui[this.id].localSearch();
                                    w2ui[this.id].refresh();
                                },
                                error => {
                                    w2ui[this.id].unlock();
                                    w2alert(error);
                                });
                    }
                    else {
                        if (w2ui[this.id].searchData.length === 0) return;
                        if (this.pagination && !this.hierachy) {
                            w2ui[this.id].reload();
                        } else {
                            w2ui[this.id].clear();
                            w2ui[this.id].records = this.recordsBS;
                        }
                        w2ui[this.id].searchClose();
                        w2ui[this.id].refresh();
                    }

                }
            }.bind(this),
            onRender: function (event) {
                // на этом этапе можем вмешаться в процесс отображения
                if (stpgrid.handlers.beforeRender !== undefined) {
                    let event = {
                        w2grid: this,
                        stpgrid: stpgrid
                    };
                    stpgrid.handlers.beforeRender(event);
                }
            },
            parser: this.handlers.parser || "",
            searches: this.makeSearches(this.columnsRaw)

        }
        for (let i in this.sortBy) {
            this.sortBy[i].direction = this.sortBy[i].sort;
        }
        obj.sortData = this.sortBy;
        if (this.handlers.onExpand !== undefined) {
            obj.onExpand = function (event) {
                this.handlers.onExpand(event);
            }.bind(this)
        }
        if (this.handlers.onTreeExpand !== undefined) {
            // TODO старые поделки Антона, это событие вызывается не так как остальные
            obj.onTreeExpand = function (name, recid) {
                this.handlers.onTreeExpand(name, recid);
            }.bind(this)
        }
        return obj;
    }

    makeSearches(columnsRaw) {
        let result = [];
        //переводчик типов
        let types = {
            'string': 'text',
            'date': 'date',
            'float': 'float',
            'integer': 'int'
        }
        let operators = {
            'string': ['is', 'contains'],
            'date': ['is', 'between'],
            'float': ['is', 'between', 'less than', 'more than'],
            'integer': ['is', 'between', 'less than', 'more than']
        }
        for (let i in columnsRaw) {
            if (columnsRaw[i].field === this.PK) continue;
            result.push({
                field: columnsRaw[i].field,
                caption: columnsRaw[i].caption,
                type: types[columnsRaw[i].type] || 'text',
                options: (types[columnsRaw[i].type] === 'date' ? /* {format: 'dd-mm-yyyy'}*/"" : ""),
                operators: operators[columnsRaw[i].type] || ['contains']
            })
        }
        return result;
    }

    /**
     * Перезагружет записи
     * @param data - данные с сервера
     */
    reloadRecords(data) {
        //this.recordsRaw = data.content[0].records;
        let prepContent = this.prepareData(data.content);
        this.recordsRaw = this.makeAsos(prepContent.records, this.PK);
        this.fk = data.content[0].fk;
        let recs = this.makeRecords(data.content[0].records, data.content[0].fk);
        w2ui[this.id].clear();
        w2ui[this.id].records = recs;
        this.refresh();
    };

    /**
     * Подготоваливаем записи для в2грид
     * @param recordsRaw - записи
     * @param fk - внешние ключи
     * @returns {Array} - массив записей
     */
    makeRecords(recordsRaw, fk) {
        if (recordsRaw === undefined) {
            recordsRaw = this.recordsRaw;
        }
        if (fk === undefined) {
            fk = this.fk;
        }
        let records = [];
        for (let recid in recordsRaw) {
            // TODO костыль потому что с сервера приходит null
            if (recid === 'null') {
                continue;
            }
            let rec = {};
            rec.recid = recordsRaw[recid][this.PK];
            for (let col in recordsRaw[recid]) {
                if (this.columnsRaw[col] !== undefined) {
                    if (this.columnsRaw[col].type === 'reference') {
                        if (recordsRaw[recid][col].length) {
                            rec[col] = "";
                        } else {
                            rec[col] = null;
                        }
                        for (let j in recordsRaw[recid][col]) {
                            rec[col] += fk[col][recordsRaw[recid][col][j]] + '; '
                        }
                    } else if (this.columnsRaw[col].type === 'date') {
                        rec[col] = Date.parse(recordsRaw[recid][col]);

                    } else {
                        rec[col] = recordsRaw[recid][col];
                    }
                } else {
                    if (col === 'style') {
                        rec.w2ui = {
                            style: recordsRaw[recid][col]
                        }
                    }
                }
                /*if (this.columnsRaw[col] !== undefined && this.columnsRaw[col].type === 'reference') {
                 rec[col] = "";
                 for (let j in recordsRaw[recid][col]) {
                 rec[col] += fk[col][recordsRaw[recid][col][j]] + '; '
                 }
                 } else if (col === 'style') {
                 rec.w2ui = {
                 style: recordsRaw[recid][col]
                 }
                 } else {
                 rec[col] = recordsRaw[recid][col];
                 }*/
            }
            if (this.hierachy /*&& this.pagination*/ && recordsRaw[recid].isGroup !== undefined && recordsRaw[recid].isGroup) {
                rec.w2ui = {
                    children: [{recid: 'treeFake'}]
                };
            }
            records.push(rec);
        }
        /*if (this.hierachy && !this.pagination) {
            let recordsW = this.makeAsos(records, 'recid');

            //showTree(null, 'parentID');
            records = [];
            for (let recid in recordsW) {
                let record = recordsW[recid];
                if (record['isGroup']) {
                    if (!record.w2ui) record.w2ui = {};
                    record.w2ui.children = [];
                }

                records.push(record);

                // if (recordsW[recid]['parentID'] === null) {
                //     records.push(recordsW[recid]);
                // }
            }

            function showTree(parent, tree) {
                for (let i in recordsW) {
                    if (recordsW[i][tree] === parent) {
                        showTree(i, tree);
                        if (parent !== null) {
                            if (recordsW[parent]['w2ui'] === undefined) {
                                recordsW[parent]['w2ui'] = new Array();
                                recordsW[parent]['w2ui']['children'] = new Array();
                            }
                            recordsW[parent]['w2ui']['children'].push(recordsW[i]);
                        }
                    }
                }
            }

        }*/
        return records;
    }

    /**
     * Формирует ключ для кэша
     * @returns {string}
     * @private
     */
    _getCacheKey(link) {
        return 'dropList-' + link;
    }


    /**
     * Функция устанавливает список выбора для ссылочного типа в колонке ТЧ
     * @param columnName - имя колонки
     * @param valuesArr  - массив со значениями {id : ''; text : ''}
     * @private
     */
    _setListData(columnName, valuesArr) {
        let w2grid = w2ui[this.id];
        if (w2grid) {
            let w2col = w2grid.getColumn(columnName);
            if (w2col.editable) {
                w2col.editable.items = valuesArr;
            }
        }
    }

    /**
     * Функция подготавливает данные пришедшие с сервера в формат, который понимает w2ui
     * @param data - данные с сервера
     * @returns {Array} - массив со значениями {id : ''; text : ''}
     * @private
     */
    _prepareDataForList(columnName, data) {
        let result = [];
        let link = this.columnsRaw[columnName].link;
        // делаем в попытке, потому что мало ли что нам придет в data
        try {
            let values = data.content[0].fk[link];
            if (values) {
                let ids = Object.keys(values);
                ids.forEach((id) => {
                    result.push({
                        "id": id,
                        "text": values[id]
                    });
                });
            }
        }
        catch (err) {
            console.log(err);
        }

        return result;

    }

    /**
     * Дополняет свойство fk данными пришедшими с сервера для конкретной колонки
     * @param columnName - имя колонки
     * @param data - массив со значениями {id : ''; name : ''}
     * @private
     */
    _extendsFKWithDataForList(columnName, data) {
        let link = this.columnsRaw[columnName].link;
        let values = data.content[0].fk[link];

        if (!this.fk[columnName]) {
            this.fk[columnName] = {};
        }

        for (let id in values) {
            this.fk[columnName][id] = values[id];
        }
    }

    /**
     * Подгружает все данные для колонок типа reference со свойствам static === true, если их нет в кэше
     * @private
     */
    _getValuesFromServer() {

        // для каждой колоки
        let columns = this.columnsRaw;

        for (let colName in columns) {
            let column = columns[colName];
            // если в колонке содержатся значения ссылочного типа и поле является перечислением (свойство static === true)
            if (column.type === 'reference' && column.static) {
                let link = column.link;
                // создать запрос
                let request = twoBe.createRequest();
                let grid = this;
                let cacheKey = this._getCacheKey(link);

                request.addParam('action', 'getContent');
                request.addParam('path', 'ref-' + link);
                request.addData('type', 'getFieldValues');
                request.addCacheKey(cacheKey);
                request.addBefore(function () {
                }).addSuccess(function (data) {
                    // закэшировать данные
                    twoBe.cacheData(data, cacheKey);
                    grid._extendsFKWithDataForList(colName, data);
                    // проверить существует ли еще объект w2ui
                    let w2grid = w2ui[grid.id];
                    if (w2grid) {
                        // подготовить данные для подстановки в качестве значений выбора
                        let suggestion = grid._prepareDataForList.call(grid, colName, data);
                        // загрузить значения в колонку w2ui
                        grid._setListData(colName, suggestion);
                    }
                }).addError(function (msg) {
                    twoBe.showMessage(0, msg);
                }).send();
            }
        }
    }

    /**
     * Функция получает на вход объект, полученный вызовом w2ui getChanges() и изменяет значения на корректные для сервера. Возвращает новый объект.
     * @param rec
     * @private
     */
    _prepareRecordsForSaving(rec) {
        let columns = this.columnsRaw;
        for (let colName in rec) {
            let colRaw = columns[colName];
            if (!colRaw) continue;
            // дату в формате dd-mm-yyyy пропустим через специальный форматер
            if (colRaw.type === 'date') {
                rec[colName] = this._preformatDate(rec[colName]);
            }
        }

        // посылаем на сервер данные без id
        let data = {};
        $.extend(data, rec);
        delete data.recid;

        return data;
    }


    /**
     * Проверяет является ли колонка обязательной
     * @param columnName
     * @returns {boolean|*}
     */
    isColumnRequired(columnName) {
        return this.columnsRaw[columnName].required || false;
    }

    /**
     * Проверяет является ли колонка пустой
     * @param record
     * @param columnName
     * @returns {boolean}
     */
    isCellEmpty(description) {
        return !description;
    }

    getCellValue(record, columnName) {
        let value;
        if (record.w2ui && record.w2ui.changes) {
            value = (record.w2ui.changes[columnName] !== undefined) ? record.w2ui.changes[columnName] : record[columnName] || '';
        } else {
            value = record[columnName] || '';
        }
        return value;
    }

    /**
     * Возвращает HTML для подсветки пустой обязательной колонки
     * @returns {string}
     * @private
     */
    _highlightEmtyRequiredCell() {
        return '<div class = "required-cell"></div>';
    }

    // функция изменяет стиль ячейки(добавляет красное подчеркивние) значение в которой обязательное но пустое, если значение не пустое
    // отрабатывает функция customRenderFunction, в качестве customRenderFunction можно передать строку форматирования для w2ui
    _renderRecordCell(record, index, column_index, customRenderFunction) {

        let columnName = this.columns[column_index].field;
        let stpObject = stpui[this.name];
        let cellValue = stpObject.getCellValue(record, columnName);

        // пока считаем что группировочные поля искуственные и их подсвечивать не надо
        let chidrenExist = record.w2ui && record.w2ui.children && record.w2ui.children.length;
        if (!chidrenExist) {
            // если поле обязательное и пустое то стандартно его подсветим
            if (stpObject.isColumnRequired(columnName) && stpObject.isCellEmpty(cellValue)) {
                return stpObject._highlightEmtyRequiredCell();
            }
        }

        // если поле необязательное и для его типа определена кастомная функция, то вызовем ее
        if (customRenderFunction) {
            //if (typeof customRenderFunction === 'function') {
            //return customRenderFunction.apply(this, [record, index, column_index]);
            //} else if (typeof customRenderFunction === 'string') {
            // ВНИМАНИЕ!!! Грязное вторжение в работу w2ui!!! Не знаю как сделать по другому, чтобы форматировалось как надо!
            //this.columns[column_index].render = customRenderFunction;
            //}
            return customRenderFunction.apply(this, [record, index, column_index]);
        } else {
            return cellValue;
        }

    }

    /**
     * Делаем колонки
     * @returns {Array} - массив колонок
     */
    makeColumns() {

        let grid = this;

        window.stpui.showFiles = function (recid, col, index, column_index, gridID) {
            /*console.log(recid, col);
             console.log(w2ui[this.id].getCellHTML(index, column_index));
             console.log('gird_' + this.id + '_data_' + index + '_' + column_index);*/
            // нужно для правильного контекста
            let self = stpui[gridID];
            let links = '';
            for (let i in w2ui[self.id].get(recid)[col]) {
                links += '<p><a target="_blank" href="' + w2ui[self.id].get(recid)[col][i] + '">Файл ' + i + '</a></p>'
            }
            $('#' + 'grid_' + self.id + '_data_' + index + '_' + column_index).w2overlay({
                openAbove: false,
                align: 'none',
                html: '<div style="padding: 10px; line-height: 150%">'
                + '<p>Ссылки на файлы</p><br>'
                + links
                + '</div>'
            });
        };
        window.stpui.showEditForm = function (recID, columnName, gridID) {
            // нужно для правильного контекста
            let self = stpui[gridID];
            let link = self.columnsRaw[columnName].link;
            let id = self.recordsRaw[recID][columnName][0];
            let type = 'elementForm';
            let path = 'ref-' + link;
            let PK = self.getProperties().PK;
            let url = twoBe.getDefaultParams().url;
            let grid = self;
            twoBe.createRequest().addUrl(url).addParam('action', 'get').addParam('path', path).addData('type', type).addFilterParam(PK, id).addBefore(function () {
                grid.lock('Идет загрузка..');
            }).addSuccess(function (data) {
                twoBe.buildView(data, path + type);
                grid.unlock();
            }).addError(function (msg) {
                twoBe.showMessage(0, msg);
                grid.unlock();
            }).addCacheKey(path + type).send();
        };

        // массив кастомных рендер функций
        let renders = {
            "files": function (record, index, column_index) {
                if (record[this.columns[column_index].field] === undefined || record[this.columns[column_index].field] === null || record[this.columns[column_index].field].length === 0) {
                    return ('Нет файлов');
                } else {
                    return ('<button onclick=stpui.showFiles("' + record.recid
                        + '","' + this.columns[column_index].field + '",' + index
                        + ',' + column_index + ',' + this.name + ')><i class="fa fa-link" aria-hidden="true"></i> Файлы</button>');
                }
            },
            "reference": function (record, index, column_index) {
                let columnName = this.columns[column_index].field;
                let stpGrid = stpui[this.name];
                let value = stpGrid.getCellValue(record, columnName);
                // нам может вернуться как текст который был в ячейке на момент редактирования, так и id выбранного элемента, чтобы определить поищем в fk
                // TODO костыльное условие потому что сервер теперь присылает null
                if (typeof value === 'string' && value.indexOf('null') !== -1) {
                    value = "";
                }
                if (stpGrid.fk[columnName] !== undefined) {
                    let valueFromFK = stpGrid.fk[columnName][value];
                    if (valueFromFK !== undefined) {
                        // еще надо изменить recordsRaw, хотя не очень конечно выглядит менять их здесь
                        stpGrid.recordsRaw[record.recid][columnName][0] = [value];
                        // и изменим id на наименование
                        value = valueFromFK;
                    }
                }
                let cellContent = '<a class = "link-in-grid" onclick  = stpui.showEditForm("' + record.recid + '","' + columnName + '","' + this.name + '")>' + value + '</a>';
                return cellContent;
            },
            'timestamp': function (record, index, column_index) {
                let fData = '';
                let ufData = record[this.columns[column_index].field];
                fData = w2utils.formatDateTime(ufData, 'dd-mm-yyyy|h:m');
                return fData;
            },
            'boolean': function (record, index, column_index) {
                let fData = '';
                let ufData = record[this.columns[column_index].field];
                fData = (ufData ? 'да' : 'нет');
                return fData;
            },
            'date': function (record, index, column_index) {
                let fData = '';
                let stpGrid = stpui[this.name];
                //let ufData = record[this.columns[column_index].field];
                let columnName = this.columns[column_index].field;
                let ufData = stpGrid.getCellValue(record, columnName);
                ufData = stpGrid._preformatDate(ufData);
                fData = w2utils.formatDate(ufData, 'dd-mm-yyyy');
                return fData;
            }
        };
        let columns = [];

        // объект для сопоставления типов сервера и w2ui
        let types = {
            'string': 'text',
            'date': 'date',
            'float': 'float',
            'integer': 'int',
            'boolean': 'checkbox',
            'reference': 'select'
        };
        for (let i in this.columnsRaw) {
            let rawColumn = this.columnsRaw[i];
            if (rawColumn.field === this.PK) continue;

            // Определим функцию которая рендерит значение ячейки в зависимости от типа ячейки
            let customRenderFunction = renders[rawColumn.type];

            let options = {
                field: rawColumn.field,
                size: '10%',
                caption: rawColumn.caption,
                sortable: rawColumn.sortable,
                hidden: rawColumn.hidden,

            };
            let serverType = rawColumn.type;

            options.render = function (record, index, column_index) {
                let renderedValue = grid._renderRecordCell.apply(this, [record, index, column_index, customRenderFunction]);
                return renderedValue;
            };

            // редактирование в таблице делаем только для ТЧ
            if (this.refCol) {
                // определим тип подставляемый в редактирование
                let editableType = types[serverType];
                if (editableType !== undefined) {
                    options.editable = {
                        type: editableType
                    };

                    // пока не редактируем поля ссылочного типа которые не являются перечислениями (static === true)
                    if (serverType === 'reference' && !rawColumn.static) {
                        delete options.editable;
                    }
                }
                if (serverType === 'boolean') {
                    // функция рендера есть для каждой ячейки(кроме булева значения так как для них всегда должны показываться чекбоксы), это нужно для того чтобы подсвечивать незаполненные обязательные ячейки при
                    // редактировании строк в ТЧ
                    delete options.render;
                }
            }

            columns.push(options)
        }
        //console.log(columns);
        return columns;
    }

    /**
     * Функция должны корректно обрабатывать дату формата dd-mm-yyyy и возвращать объект Date. Используется для передачи результата в w2ui.formatDate
     * @param data - строковая дата в формате dd-mm-yyyy
     * @private
     */
    _preformatDate(dateStr) {
        // проверить что переданный параметр это именно не пустая строка
        if (typeof dateStr !== 'string' || dateStr === '') return dateStr;

        // проверить что в переданной строке есть ровно 2 знака "-"
        let arr = dateStr.split('-');
        if (arr.length !== 3) return '';
        // выделить день, месяц и год
        let day = arr[0];
        let month = arr[1] - 1;
        let year = arr[2];

        // сформировать дату
        let date = new Date(year, month, day);
        if (String(date) === 'Invalid Date') return '';

        return date;
    }

    /**
     * Формирование массива событий таблицы
     */
    setHandlers() {
        //преобразуем приходящий код
        for (let eventName in this.events) {
            this.handlers[eventName] = function (event) {
                let param = this;
                // TODO костыль
                if (this.id === 'ref-stages_billBinding-grid-listForm') {
                    param = event;
                }
                try {
                    //если делаем экспанд нужно сделать предварительные действия, можно убрать в пользовательский код
                    if (eventName === 'onExpand') {
                        $("#" + event.box_id).css({
                            margin: "0px",
                            padding: "0px",
                            width: "100%"
                        }).animate({height: "300px"}, 100);
                        $("#" + event.fbox_id).css({
                            margin: "0px",
                            padding: "0px",
                            width: "100%"
                        }).animate({height: "300px"}, 100);
                        $("#" + event.box_id).append("<div id='subgrid-body-" + event.recid + "'></div>");
                        $("#subgrid-body-" + event.recid).height(300);
                        w2ui[this.id].resize();
                        param = {
                            box: document.getElementById("subgrid-body-" + event.recid),
                            id: event.recid,
                            grid: this
                        }
                    }
                    //вызываем соответсвующий обработчик, передаем нужный параметр
                    this.code[this.events[eventName]].call(this, param);
                } catch (err) {
                    console.log('SERVER CODE ERROR:' + err);
                    w2alert('Сервер вернул некорректное действие!');
                }

            }.bind(this)
        }
    }

    buildInExpand(id, data) {
        let container = document.getElementById("subgrid-body-" + id);
        new layout.Layout({
                box: container,
                element: data.elements[0],
                content: data.content,
                code: data.code,
                parent: this
            }
        );
    }

    /**
     * Группирует записи
     * @param records - записи
     * @param columns - колонки
     * @param groupedColumns - массив колонок по которым происходит группировка
     * @param summaryColumn - колонка в которую помещается представление сгруппированого значения
     * @param grpLevel - уровень группировки
     * @returns {Array} - массив сгруппированных записей
     */
    getGroupedRecords(records, columns, groupedColumns = [], summaryColumn = "", grpLevel = 0) {
        // если summaryColumn не задано - выводим в первое поле по которому группируем
        if (!summaryColumn && groupedColumns.length) {
            summaryColumn = groupedColumns[0];
        }
        // стили для уровней группировки, пока для 2-ух
        let style = ['background-color: #F9FBBB', 'background-color: #DDFBBB'];
        // объект для хранения сгруппированых записей, ключ - значения поля группировки, значение массив записей
        let groupedRecords = {};
        // ключ - значение группировочного поля, значение - представление группировочного поля. Для ссылочных полей может быть что-то вроде {123-456-789 : "Стол"}
        let keys = {};
        // колонка, по которой проводится группировка
        let currentGrouppingCol = groupedColumns[grpLevel];
        for (let recid in records) {

            let recordInfo = this._getRecordValueAndDisplay(records[recid], currentGrouppingCol);
            let value = recordInfo.value;
            let display = recordInfo.display;

            if (groupedRecords[value] === undefined) {
                groupedRecords[value] = [];
            }

            keys[value] = display;
            // формируем запись но уже без колонки по которой группируем
            let rec = {};
            for (let colName in records[recid]) {
                // if (currentGrouppingCol !== colName) {
                rec[colName] = records[recid][colName];
                // }
            }
            // и добавляем в объект для хранения сгруппированных записей
            groupedRecords[value].push(rec);
        }

        // массив сгруппированных записей в формате w2ui
        let w2uiGroupedRecords = [];
        for (let nodeRecName in groupedRecords) {
            let childrenRecords = groupedRecords[nodeRecName];
            // преобразуем сгруппированные записи в формат w2ui
            // let rec = {
            //     "recid": 'group&' + nodeRecName + Math.random(),
            //     "w2ui": {
            //         "children": childrenRecords,
            //         "style": style[grpLevel]
            //     }
            // };

            let rec = {};

            // выведем в группировочную строку значение, если оно одинаково для все группируемых строк
            for (let col in columns) {
                if (col === currentGrouppingCol) {
                    //continue;
                }

                // считаем что изначально все значения одинаковы
                let valueEquals = true;
                let recordInfo = this._getRecordValueAndDisplay(childrenRecords[0], col);
                // значение для сравнения
                let valueForCheck = recordInfo.value;
                let displayForGrouping = recordInfo.display;

                // цикл по записям
                for (let i = 1; i < childrenRecords.length; i++) {
                    let recordInfo = this._getRecordValueAndDisplay(childrenRecords[i], col);
                    let recordValue = recordInfo.value;
                    // если значения не одинаковы - прекращаем цикл
                    if (recordValue !== valueForCheck) {
                        valueEquals = false;
                        break;
                    }
                }
                // Функция makeRecords работает с ссылочным типом как с массивом
                if (this.columnsRaw[col].type === 'reference') {
                    valueForCheck = [valueForCheck];
                }

                // если все значения одиннаковы выыведем его в группировочную строку
                if (valueEquals) {
                    rec[col] = valueForCheck;
                }

            }

            // в summaryColumn добавляем представление для сгруппированых записей
            //rec[summaryColumn] = columns[currentGrouppingCol].caption + ' : ' + (keys[nodeRecName] ? keys[nodeRecName] : 'Пустое значение');

            let w2uiRec = this.makeRecords([rec])[0];
            w2uiRec.recid = 'group-' + nodeRecName + Math.random();
            w2uiRec.w2ui = {
                "children": childrenRecords,
                "style": style[grpLevel]
            };

            w2uiGroupedRecords.push(w2uiRec);
        }
        // изменяем счетчик пройденных группировок
        grpLevel++;
        // если закончили группировки по всем колонкам, то все дочерние записи преобразуем в формат w2ui
        if (grpLevel >= groupedColumns.length) {
            for (let nodeRecName in w2uiGroupedRecords) {
                w2uiGroupedRecords[nodeRecName].w2ui.children = this.makeRecords(w2uiGroupedRecords[nodeRecName].w2ui.children, this.fk);
            }
            return w2uiGroupedRecords;
            // если есть еще колонки для группировки, то для записей в каждой сгруппированной секции проведем еще одну группировку
        } else {
            for (let nodeRecName in w2uiGroupedRecords) {
                w2uiGroupedRecords[nodeRecName].w2ui.children = this.getGroupedRecords(w2uiGroupedRecords[nodeRecName].w2ui.children, columns, groupedColumns, summaryColumn, grpLevel);
            }
        }
        return w2uiGroupedRecords;

    }

    // Метод скрывает записи, но они по прежнему хранятся в объекте
    hideRecords(w2grid) {
        //let w2grid = w2ui[this.id];
        //if (w2grid) {
        w2grid.clear();
        //}
    }

    group() {
        let groupedRecs = this.getGroupedRecords(this.recordsRaw, this.columnsRaw, this.groupedBy, '', 0);
        w2ui[this.id].records = groupedRecs;
        w2ui[this.id].refresh();
    }

    ungroup() {
        let w2Grid = w2ui[this.id];
        if (!w2Grid) return;
        let records = w2Grid.records;
        let chidlrenRecords = {};

        getChildrenRecords(records);
        // объект в массив
        chidlrenRecords = _.values(chidlrenRecords);
        // и удаляем упоминания о иерархии, которые могли остаться
        chidlrenRecords.forEach((rec) => {
            delete rec.w2ui;
        });
        w2ui[this.id].records = chidlrenRecords;
        w2ui[this.id].refresh();

        // функция получает на вхлд массив записей w2ui и заполняет массив chidlrenRecords(берется из замыкания) только конечными записями(не группировками)
        function getChildrenRecords(records) {
            records.forEach((rec) => {
                let chidrenExist = rec.w2ui && rec.w2ui.children && rec.w2ui.children.length;
                if (chidrenExist) {
                    getChildrenRecords(rec.w2ui.children);
                } else {
                    chidlrenRecords[rec.recid] = rec;
                }
            });
        }
    }

    // Функция получает на вход объект записи и название колонки. Возвращает значение поля и его представление.
    _getRecordValueAndDisplay(record, col) {
        let value = '';
        let display = '';
        if (this.columnsRaw[col].type === 'reference') {
            value = record[col][0];
            display = this.fk[col][record[col][0]];
        } else if (this.columnsRaw[col].type === 'date') {
            value = record[col];
            display = w2utils.date(value);
        } else {
            value = record[col];
            display = value;
        }
        return {
            value: value,
            display: display
        }
    }

    /**
     * Выделяет строку в иеарахическом справочнике, который подгружается сразу
     * @param id - что выделить
     * @param expand - нужно ли разворачивать дерево
     * @param light - нужно ли подсвечивать
     * @return {boolean} - резульат выделения
     */
    selectInTree(id, expand = true, light = true) {
        let path = this.findPathInTree(id, w2ui[this.id].records, [], 0);
        if (path === null) {
            return false;
        }
        if (expand) {
            for (let i in path) {
                w2ui[this.id].expand(path[i]);
            }
        }
        if (light) {
            w2ui[this.id].select(id);
        }
        return true;
    }

    /**
     * Формирует путь до искомой записи в дереве (рекурсия)
     * @param id - что выделить
     * @param records - строки в формате в2уи
     * @param path - путь
     * @param deep - глубина поиска
     * @returns {array}  - путь жо искомой записи

     */
    findPathInTree(id, records, path, deep) {
        for (let i in records) {
            if (records[i].recid === id) {
                return path;
            }
        }
        for (let i in records) {
            if (records[i].w2ui !== undefined && records[i].w2ui.children !== undefined) {
                let newPath = path.slice(0);
                newPath.push(records[i].recid);
                let res = this.findPathInTree(id, records[i].w2ui.children, newPath, deep + 1);
                if (res != null) return res;
            }
        }
        return null;//path doesn't exist
    }


    /**
     * Отправляет запрос за записями и обновляет таблицу при успешном выполнении
     */
    reloadGrid() {
        let path = this.getProperties().path;
        let headID = this.getProperties().headID;
        let refCol = this.getProperties().refCol;
        let grid = this;
        let selectedID = this.getSelectedID();

        let request = twoBe.createRequest();
        request.addParam('action', 'getContent').addParam('path', path).addData('type', 'gridRecords').addBefore(function () {
            grid.lock('Идет загрузка..');
        }).addSuccess(function (data) {
            grid.reloadRecords(data);
            if (selectedID) {
                grid.selectRecord(selectedID);
            }
            grid.unlock();
        }).addError(function (msg) {
            twoBe.showMessage(0, msg);
            grid.unlock();
        });
        if (headID !== "" && refCol !== "") {
            let filter = {};
            filter[refCol] = {
                value: headID,
                sign: 'equal'
            };
            request.addData('filter', filter);
        }
        // Проверим кэш на наличие дополнительных полей которые надо вернуть с запросом
        let cacheKey = 'customFieldsFor-' + this.path + '-grid-listForm';
        let additionalFields = twoBe.getCache(cacheKey);
        // И добавим их в данные запроса
        if (additionalFields) request.addData('additionalFields', additionalFields);

        request.send();
    }

}


export class Grid extends BasicGrid {
    setHandlers() {
        super.setHandlers();
        if (this.pagination && !this.hierachy) {
            //щит для пагинации
            this.handlers.onRequest = function (event) {
                event.url = config.testUrl;
                let requestParams = {
                    path: this.path,
                    action: 'getContent',
                    data: {
                        type: 'gridRecords'
                    }
                };
                let limit = event.postData.limit;
                let offset = event.postData.offset;
                let sort = event.postData.sort;
                let orderBy = [];
                for (let i in sort) {
                    orderBy.push({
                        field: sort[i].field,
                        sort: sort[i].direction.toUpperCase()
                    })
                }
                if (this.gridSearchParams.isActive()) {
                    let newOffset = this.gridSearchParams.getOffset() + this.limit;
                    this.gridSearchParams.setOffset(newOffset);
                    offset = newOffset;
                    // при поиске сортировку не передаем, используем стандартную, которую нам предоставляет сервер
                    orderBy = [];
                }

                // берем текущие данные поиска из таблицы
                let w2grid = w2ui[this.id];
                let searchData = {};
                if (w2grid) {
                    searchData = w2grid.searchData;
                }
                // преобразуем параметры поиска w2ui в формат, который понимает сервер
                let paramsForServer = this._parseSearchData(searchData);

                requestParams.data.limit = limit;
                requestParams.data.offset = offset;
                requestParams.data.orderBy = orderBy;
                requestParams.data.filter = paramsForServer.filter;
                requestParams.data.relation = paramsForServer.relation;
                event.postData = requestParams;

            }.bind(this)
            this.handlers.parser = function (responseText) {
                responseText = responseText.toString();
                responseText = JSON.parse(responseText);
                responseText = new tools.Unzipper(responseText).unzippedData;
                if (responseText.status === 'success') {
                    responseText = responseText.message;
                    let recs = this.makeRecords(responseText.content[0].records, responseText.content[0].fk);
                    return recs;
                } else {
                    w2alert(responseText.message);
                    return [];
                }
            }.bind(this);
        }
        this.handlers.onSearch = function (event) {
            //был ли сброс поиска
            if (!event.reset) {
                event.preventDefault();
                w2ui[this.id].searchClose();
                // преобразуем параметры поиска w2ui в формат, который понимает сервер
                let paramsForServer = this._parseSearchData(event.searchData);

                let queryOptions = {
                    path: this.path,
                    action: 'getContent',
                    data: {
                        type: 'gridRecords',
                        filter: paramsForServer.filter,
                        relation: paramsForServer.relation
                    }
                };

                if (this.pagination) {
                    // если поиск изменился тогда нужно обнулить offset
                    if (this.gridSearchParams.isSearchChanged(event.searchData)) {
                        this.gridSearchParams.setOffset(0);
                    }
                    queryOptions.data.offset = this.gridSearchParams.getOffset();
                    queryOptions.data.limit = this.limit;
                    // отмечаем что поиск теперь активен
                    this.gridSearchParams.setActive(true);
                    this.gridSearchParams.setCurrentSearch(event.searchData);
                }

                //отсылаем запрос
                let searchQuery = new tools.AjaxSender({
                    url: config.testUrl,
                    msg: JSON.stringify(queryOptions),
                    before: function () {
                        w2ui[this.id].lock('Поиск', true);
                    }.bind(this)
                })
                //в случае успеха
                searchQuery.sendQuery()
                    .then(
                        response => {
                            w2ui[this.id].unlock();
                            if (this.recordsBS[0] === undefined) {
                                this.recordsBS = w2ui[this.id].records;
                            }
                            w2ui[this.id].records = this.makeRecords(response.content[0].records, response.content[0].fk);
                            w2ui[this.id].searchData = [];
                            for (let searchInd in event.searchData) {
                                if (/*event.searchData[searchInd].operator !== 'between'*/true) {
                                    w2ui[this.id].searchData.push(event.searchData[searchInd]);
                                }
                            }
                            w2ui[this.id].localSearch();
                            w2ui[this.id].refresh();
                        },
                        error => {
                            w2ui[this.id].unlock();
                            w2alert(error);
                        });
            }
            else {
                this.gridSearchParams.setDefaults();
                if (w2ui[this.id].searchData.length === 0) return;
                if (this.pagination && !this.hierachy) {
                    w2ui[this.id].reload();
                } else {
                    w2ui[this.id].clear();
                    w2ui[this.id].records = this.recordsBS;
                }
                w2ui[this.id].searchClose();
                w2ui[this.id].refresh();
            }
        }.bind(this);
        this.handlers.onTreeExpand = function (name, recid) {
            /*if (!this.pagination) {
                w2ui[this.id].toggle(recid);
                return;
            }*/
            // TODO костыль переделать
            if (typeof name === 'object') {
                return;
            }

            //исключаем повторную подгрузку
            if (w2ui[this.id].get(recid).w2ui !== undefined && w2ui[this.id].get(recid).w2ui.children !== undefined && w2ui[this.id].get(recid).w2ui.children[0].recid !== 'treeFake') {
                w2ui[this.id].toggle(recid);
                return;
            }

            let grid = this;
            let path = this.path;
            let request = twoBe.createRequest();
            request.addParam('action', 'getContent').addData('type', 'gridRecords').addParam('path', path).addFilterParam('parentID', recid).addBefore(function () {
                grid.lock('Идет загрузка..');
            }).addSuccess(function (response) {
                w2ui[grid.id].unlock();
                // нам может придти и сам элемент раскрываемой группы, отследим это и удалим его
                response.content[0].records = response.content[0].records.filter((rec) => {
                    return recid !== rec.ID;
                });
                let expRecs = grid.makeRecords(response.content[0].records, response.content[0].fk);
                //add info to object
                w2ui[grid.id].set(recid, {w2ui: {children: expRecs}});
                $.extend(grid.recordsRaw, grid.makeAsos(response.content[0].records, 'ID'));
                $.extend(grid.fk, response.content[0].fk);
                w2ui[grid.id].toggle(recid);
                grid.unlock();
            }).addError(function (msg) {
                twoBe.showMessage(0, msg);
                grid.unlock();
            }).send();


            /*var type = 'elementForm';
            var path = grid.getProperties().path;
            var PK = grid.getProperties().PK;
            // id таблицы для которой запрашиваем форму элемента
            var gridID = grid.getProperties().id;
            var request = twoBe.createRequest();
            request.addParam('action', 'get').addParam('path', path).addData('type', type).addData('parentTableID', gridID).addFilterParam(PK, grid.getSelectedIDs()[0]).addBefore(function () {
                grid.lock('Идет загрузка..');
            }).addSuccess(function (data) {
                twoBe.buildView(data, path + type);
                grid.unlock();
            }).addError(function (msg) {
                twoBe.showMessage(0, msg);
                grid.unlock();
            }).addCacheKey(path + type).send();*/

            /* w2ui[this.id].lock('Загружаем', true);
             let expandQuery = new tools.AjaxSender({
                 url: 'search.json',
                 msg: ''
             })*/
            /*expandQuery.sendQuery()
                .then(
                    response => {
                        w2ui[this.id].unlock();
                        let expRecs = this.makeRecords(response.content[0].records, response.content[0].fk);
                        //add info to object
                        w2ui[this.id].set(recid, {w2ui: {children: expRecs}});
                        $.extend(this.recordsRaw, this.makeAsos(response.content[0].records, 'ID'));
                        $.extend(this.fk, response.content[0].fk);
                        console.log(this);
                        w2ui[this.id].toggle(recid);
                    },
                    error => {

                    }
                )*/
        }.bind(this);
    }

    /**
     * По объекту searchData функция формирует объект со свойствами filter и relation, которые понимает сервер
     * @param searchData - свойство searchData из объекта w2ui.grid
     * @returns {{filter: {}, relation: {and: Array, or: Array}}}
     * @private
     */
    _parseSearchData(searchData) {

        let result = {
            filter: {},
            relation: {
                and: [],
                or: []
            }
        };

        let filter = result.filter;
        let relation = result.relation;

        let actions = {
            contains: 'consist',
            is: 'equal',
            between: 'between',
            less: 'less',
            more: 'greater'
        };
        for (let i in searchData) {
            let nameCol = searchData[i].field.split('*').join('.');
            if (this.fk[nameCol] !== undefined) {
                nameCol += '.description';
            }
            let value = searchData[i].value;
            if (searchData[i].type === 'date') {
                if (typeof(searchData[i].value) !== 'string') {
                    value = [];
                    for (let j in searchData[i].value) {
                        value[j] = searchData[i].value[j];
                    }
                } else {
                    value = searchData[i].value
                }
                if (typeof(value) === 'object') {
                    for (let j in value) {
                        value[j] = tools.utils.getISODate(value[j], '/');
                    }
                } else {
                    value = tools.utils.getISODate(value, '/');
                }
            }
            filter[nameCol] = {
                value: value,
                sign: actions[searchData[i].operator] || 'consist'
            };
            relation.or.push(nameCol);
        }
        //для табличных частей
        if (this.headID !== '') {
            filter[this.refCol] = {
                value: this.headID,
                sign: 'equal'
            };
            relation.and.push(this.refCol);
        }

        return result;

    }

    makew2uiobject() {

        let obj = super.makew2uiobject();

        obj.onSearch = function (event) {
            this.handlers.onSearch(event);
        }.bind(this);
        obj.onRequest = function (event) {
            console.log(event, this.handlers.onRequest);
            if (this.handlers.onRequest !== undefined) {
                this.handlers.onRequest(event);
            }
        }.bind(this);

        obj.parser = this.handlers.parser || "";
        return obj;
    }
}

/**
 * Класс для тестирования возможностей таблиц - скорее всего не работает((
 * @extends module:grid.Grid
 */
export class GridNew
    extends Grid {
    setHandlers() {
        super.setHandlers();
        /*обработчик поиска в таблице*/
        this.handlers.onSearch = function (event) {
            event.preventDefault();
            if (event.searchValue === undefined) {
                return;
            }
            //нужен адрес и сообщение
            let searchQuery = new tools.AjaxSender({
                url: 'search.json',
                msg: '',
                before: function () {
                    w2ui[this.id].lock('Поиск', true);
                    let searchNotification = new tools.BrowserNotification(
                        'Поиск',
                        {body: 'Поиск по запросу ' + event.searchValue}
                    )
                }.bind(this)
            })
            searchQuery.sendQuery()
                .then(
                    response => {
                        w2ui[this.id].unlock();
                        if (this.recordsBS[0] === undefined) {
                            this.recordsBS = w2ui[this.id].records;
                        }
                        w2ui[this.id].records = this.makeRecords(response.content[0].records, response.content[0].fk);
                        w2ui[this.id].refresh();
                        document.getElementById('grid_' + this.id + '_search_all').value = event.searchValue;
                        console.log(this);
                        if (w2ui[this.id + '_toolbar'].get('undoSearch') === null) {
                            w2ui[this.id + '_toolbar'].add([
                                {
                                    type: 'button',
                                    id: 'undoSearch',
                                    text: 'Выйти из поиска',
                                    icon: 'fa fa-times',
                                    onClick: function () {
                                        if (this.pagination && !this.hierachy) {
                                            w2ui[this.id].reload();
                                        } else {
                                            w2ui[this.id].clear();
                                            w2ui[this.id].records = this.recordsBS;
                                        }
                                        w2ui[this.id + '_toolbar'].remove('undoSearch');
                                        w2ui[this.id].refresh();
                                        w2ui[this.id].searchReset();
                                    }.bind(this)
                                }
                            ])
                        }
                    },
                    error => {

                    }
                )

        }.bind(this);
        if (this.pagination && !this.hierachy) {
            //щит для пагинации
            this.handlers.onRequest = function (event) {
                console.log(event);
                event.url = 'search.json';

            }
            this.handlers.parser = function (responseText) {
                responseText = responseText.toString();
                responseText = JSON.parse(responseText);
                responseText = new tools.Unzipper(responseText).unzippedData;
                if (responseText.status === 'success') {
                    responseText = responseText.message;
                    let recs = this.makeRecords(responseText.content[0].records, responseText.content[0].fk);
                    return recs;
                }
            }.bind(this);
        }
        //обработка разворачивания элемента дерева
        this.handlers.onTreeExpand = function (name, recid) {
            /*if (!this.pagination) {
                w2ui[this.id].toggle(recid);
                return;
            }*/
            //исключаем повторную подгрузку
            if (w2ui[this.id].get(recid).w2ui !== undefined && w2ui[this.id].get(recid).w2ui.children !== undefined && w2ui[this.id].get(recid).w2ui.children[0].recid !== 'treeFake') {
                w2ui[this.id].toggle(recid);
                return;
            }
            w2ui[this.id].lock('Загружаем', true);
            let expandQuery = new tools.AjaxSender({
                url: 'search.json',
                msg: ''
            })
            expandQuery.sendQuery()
                .then(
                    response => {
                        w2ui[this.id].unlock();
                        let expRecs = this.makeRecords(response.content[0].records, response.content[0].fk);
                        //add info to object
                        w2ui[this.id].set(recid, {w2ui: {children: expRecs}});
                        $.extend(this.recordsRaw, this.makeAsos(response.content[0].records, 'ID'));
                        $.extend(this.fk, response.content[0].fk);
                        console.log(this);
                        w2ui[this.id].toggle(recid);
                    },
                    error => {

                    }
                )
        }.bind(this);
    }

    setButtons() {
        super.setButtons();
        this.btns.edit.onClick = function (event) {
            let response = {
                "content": [
                    {
                        "records": [
                            {
                                "ID": "5",
                                "name": "Petya",
                                "mark": 3,
                                "subject": [
                                    "6"
                                ],
                                "parentID": "1-1"
                            }
                        ],
                        "fk": {
                            "subject": {
                                "6": "ОБЖ"
                            }
                        }
                    }
                ]
            };
            this.editRecord(response);
        }
        this.btns.group = {
            id: 'group',
            caption: 'Группировать',
            more: true,
            icon: 'fa fa-object-group',
            onClick: function (event) {
                let groupies = ['mark'];
                this.groupedBy = groupies;
                let showGroupCol = 'name';
                this.showGroupCol = showGroupCol;
                let groupedRecs = this.getGroupedRecords(this.recordsRaw, this.columnsRaw, groupies, showGroupCol);
                w2ui[this.id].clear();
                for (let i in groupies) {
                    w2ui[this.id].removeColumn(groupies[i]);
                }
                w2ui[this.id].records = groupedRecs;
                w2ui[this.id].refresh();
            }.bind(this)
        }
        this.btns.sel = {
            id: 'sel',
            caption: 'Выделить 1-3',
            more: true,
            icon: 'fa  fa-tty',
            onClick: function () {
                this.selectInTree("1-3");
            }.bind(this)
        }
    }
}

// класс для добавления в Grid и согласования работы пагинации при поиске
class GridSearchStructure {
    constructor() {
        // отступ который надо делать при нажатии пагинации при активном поиске
        this._offset = 0;
        // признак того что поиск используется
        this._active = false;
        // информация о текущем поисковом отборе
        this._currentSearch = {};
    }

    getOffset() {
        return this._offset;
    }

    setOffset(value) {
        this._offset = value;
    }

    getActive() {
        return this._active;
    }

    setActive(value) {
        this._active = value;
    }

    getCurrentSearch() {
        return this._currentSearch;
    }

    setCurrentSearch(value) {
        this._currentSearch = value;
    }

    isActive() {
        return this.getActive();
    }

    isSearchChanged(searchStructure) {
        // используем lodash
        return !isEqual(this.getCurrentSearch(), searchStructure);
    }

    // Инициализирует внутрение структуры по поиску значениями по умолчанию
    setDefaults() {
        this.setOffset(0);
        this.setActive(false);
        this.setCurrentSearch({});
    }

}