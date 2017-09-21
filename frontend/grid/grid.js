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
import {config} from '../config/config.js';

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
    addRecord(data) {
        let ID = data.content[0].records[0][this.PK];
        let recordRaw = this.makeAsos(data.content[0].records, this.PK);
        let fk = data.content[0].fk;
        //добавление для справочника без иерархии
        if (!this.hierachy && this.groupedBy.length === 0) {
            //записываем в поля объекта
            $.extend(this.recordsRaw, recordRaw);
            $.extend(true, this.fk, fk);
            //преобразуем запись
            let record = this.makeRecords(recordRaw, fk)[0];
            w2ui[this.id].add(record);
            //делаем выделение записи
            this.selectRecord(ID);
        }
        //добавление в сгуппированные данные
        if (this.groupedBy.length > 0) {
            //записываем в поля объекта
            $.extend(this.recordsRaw, recordRaw);
            $.extend(true, this.fk, fk);
            //групируем по-новой
            let groupedRecs = this.groupBy(this.recordsRaw, this.columnsRaw, this.groupedBy, this.showGroupCol);
            w2ui[this.id].clear();
            w2ui[this.id].records = groupedRecs;
            w2ui[this.id].refresh();
            //делаем выделение записи
            this.selectInTree(ID);
        }
        //добавление в подгружаемую иерархию
        if (this.hierachy && this.pagination && this.groupedBy.length === 0) {
            let recordRawWithoutKey = recordRaw[Object.keys(recordRaw)[0]];
            let record = this.makeRecords(recordRaw, fk)[0];
            //можем ли отобразить новую запись
            if (this.selectInTree(recordRawWithoutKey.parentID, false, false)) {
                if (w2ui[this.id].get(recordRawWithoutKey.parentID).w2ui !== undefined
                    && w2ui[this.id].get(recordRawWithoutKey.parentID).w2ui.children !== undefined
                    && w2ui[this.id].get(recordRawWithoutKey.parentID).w2ui.children[0].recid !== 'treeFake') {
                    //записываем в поля объекта
                    $.extend(this.recordsRaw, recordRaw);
                    $.extend(true, this.fk, fk);
                    //формируем запись для добавления
                    record.w2ui = {
                        children: [],
                        parent_recid: recordRawWithoutKey.parentID
                    }
                    //разворачиваем дерево
                    this.selectInTree(recordRawWithoutKey.parentID, true, false);
                    let children = w2ui[this.id].get(recordRawWithoutKey.parentID).w2ui.children;
                    children.push(record);
                    w2ui[this.id].set(recordRawWithoutKey.parentID, {w2ui: {children: children}});
                    //для обновления категории
                    w2ui[this.id].toggle(recordRawWithoutKey.parentID);
                    w2ui[this.id].toggle(recordRawWithoutKey.parentID);
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
    updateRecord(data) {
        let ID = data.content[0].records[0][this.PK];
        this.deleteRecords(ID);
        this.addRecord(data);
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
     * Делаем объект для в2уи
     * @returns {{name: *, show: {toolbar: boolean, footer: boolean}, recid: string, columns: Array, records: Array, toolbar: {items: Array, onClick: (function(this:grid))}, onMenuClick: (function()), menu: Array}}
     * @private
     */
    makew2uiobject() {
        let obj = {
            name: this.id,
            autoLoad: (this.pagination ? 'auto' : false),
            header: this.header,
            url: (this.pagination && !this.hierachy ? " " : ""),
            limit: (this.pagination && !this.hierachy ? this.limit : ""),
            show: {
                toolbar: true,
                footer: true,
                selectColumn: this.showSelectColumn
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
                    ;
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
            onDblClick: function (event) {
                if (this.handlers.onDblClick !== undefined) {
                    try {
                        w2ui[this.id].select(event.recid);
                        this.handlers.onDblClick();
                    } catch (err) {
                        console.log('SERVER CODE ERROR:' + err);
                        w2alert('Серевер вернул некорректное действие!');
                    }
                }
            }.bind(this),
            searches: this.makeSearches(this.columnsRaw)
        }
        if (this.handlers.onExpand !== undefined) {
            obj.onExpand = function (event) {
                this.handlers.onExpand(event);
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
        for (let i in columnsRaw) {
            if (columnsRaw[i].field === this.PK) continue;
            result.push({
                field: columnsRaw[i].field,
                caption: columnsRaw[i].caption,
                type: types[columnsRaw[i].type] || 'text',
                options: (types[columnsRaw[i].type] === 'date' ? /* {format: 'dd-mm-yyyy'}*/"" : "")
            })
        }
        return result;
    }

    /**
     * Перезагружет записи
     * @param data - данные с сервера
     */
    reloadRecords(data) {
        this.recordsRaw = data.content[0].records;
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
            let rec = {};
            rec.recid = recordsRaw[recid][this.PK];
            for (let col in recordsRaw[recid]) {
                if (this.columnsRaw[col] !== undefined) {
                    if (this.columnsRaw[col].type === 'reference') {
                        rec[col] = "";
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
            if (this.hierachy && this.pagination && recordsRaw[recid].isGroup !== undefined && recordsRaw[recid].isGroup) {
                rec.w2ui = {
                    children: [{recid: 'treeFake'}]
                };
            }
            records.push(rec);
        }
        if (this.hierachy && !this.pagination) {
            let recordsW = this.makeAsos(records, 'recid');

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

            showTree(null, 'parentID');
            records = [];
            for (let recid in recordsW) {
                if (recordsW[recid]['parentID'] === null) {
                    records.push(recordsW[recid]);
                }
            }

        }
        return records;
    }

    /**
     * Делаем колонки
     * @returns {Array} - массив колонок
     */
    makeColumns() {
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
        let renders = {
            "files": function (record, index, column_index) {
                if (record[this.columns[column_index].field] === undefined || record[this.columns[column_index].field] === null || record[this.columns[column_index].field].length === 0) {
                    return ('Нет файлов');
                } else {
                    return ('<button onclick=stpui.showFiles("' + record.recid
                    + '","' + this.columns[column_index].field + '",' + index
                    + ',' + column_index  + ',' + this.name + ')><i class="fa fa-link" aria-hidden="true"></i> Файлы</button>');
                }
            },
            "reference" : function (record, index, column_index) {
                let columnName = this.columns[column_index].field;
                let description = record[columnName] || '';
                let cellContent = '<a class = "link-in-grid" onclick  = stpui.showEditForm("' + record.recid + '","' + columnName + '","' + this.name + '")>' + description + '</a>';
                return cellContent;
            },
            'timestamp': function (record, index, column_index) {
                let fData = '';
                let ufData = record[this.columns[column_index].field];
                fData = w2utils.formatDateTime(ufData, 'dd-mm-yyyy|h:m');
                return fData;
            },
            'float': 'float:2',
            'date': /*function (record, index, column_index) {
             let fData = '';
             let ufData = record[this.columns[column_index].field];
             fData = w2utils.formatDate(ufData, 'dd-mm-yyyy');
             return fData;
             },*/ 'date:dd-mm-yyyy',
            'boolean': function (record, index, column_index) {
                let fData = '';
                let ufData = record[this.columns[column_index].field];
                fData = (ufData ? 'да' : 'нет');
                return fData;
            }
        }
        let columns = [];
        for (let i in this.columnsRaw) {
            if (this.columnsRaw[i].field === this.PK) continue;
            columns.push({
                field: this.columnsRaw[i].field,
                size: '10%',
                caption: this.columnsRaw[i].caption,
                sortable: this.columnsRaw[i].sortable,
                hidden: this.columnsRaw[i].hidden,
                render: renders[this.columnsRaw[i].type] || null
            })
        }
        console.log(columns);
        return columns;
    }


    /**
     * Формирование массива событий таблицы
     */
    setHandlers() {
        //преобразуем приходящий код
        for (let eventName in this.events) {
            this.handlers[eventName] = function (event) {
                let param = this;
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
                    w2alert('Серевер вернул некорректное действие!');
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
     * @param params - уровни
     * @param col - куда поместить
     * @param d - уровень
     * @returns {Array} - массив сгруппированных записей
     */
    groupBy(records, columns, params, col, d = 0) {
        let style = ['background-color: #F9FBBB', 'background-color: #DDFBBB'];
        let res = {};
        let keys = {};
        for (let recid in records) {
            var disp = "";
            var val = "";
            if (columns[params[d]].type !== 'reference') {
                val = records[recid][params[d]];
                disp = val;
            } else {
                val = records[recid][params[d]][0];
                disp = this.fk[params[d]][records[recid][params[d]][0]];
            }
            if (res[val] === undefined) {
                res[val] = [];
            }
            keys[val] = disp;
            var rec = {};
            for (var c in records[recid]) {
                if (params[d] !== c) {
                    rec[c] = records[recid][c];
                }
            }
            res[val].push(rec);
        }
        var resw2 = [];
        for (var i in res) {
            var rec = {
                "recid": 'group&' + i + Math.random(),
                "w2ui": {
                    "children": res[i],
                    "style": style[d]
                }
            };
            rec[col] = columns[params[d]].caption + ' : ' + keys[i];
            resw2.push(rec);
        }
        d++;
        if (d >= params.length) {
            for (var i in resw2) {
                resw2[i].w2ui.children = this.makeRecords(resw2[i].w2ui.children, this.fk);
            }
            return (resw2);
        } else {
            for (var i in resw2) {
                resw2[i].w2ui.children = this.groupBy(resw2[i].w2ui.children, columns, params, col, d);
            }
        }
        return (resw2);
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
                return (path);
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

}


export class Grid extends BasicGrid {
    setHandlers() {
        super.setHandlers();
        if (this.pagination && !this.hierachy) {
            //щит для пагинации
            this.handlers.onRequest = function (event) {
                event.url = config.testUrl;
                let limit = event.postData.limit;
                let offset = event.postData.offset;
                event.postData = {
                    path: this.path,
                    action: 'getContent',
                    data: {
                        type: 'gridRecords',
                        limit: limit,
                        offset: offset

                    }
                }

            }.bind(this)
            this.handlers.parser = function (responseText) {
                responseText = responseText.toString();
                responseText = JSON.parse(responseText);
                responseText = new tools.Unzipper(responseText).unzippedData;
                if (responseText.status === 'success') {
                    responseText = responseText.message;
                    let recs = this.makeRecords(responseText.content[0].records, responseText.content[0].fk);
                    console.log(recs);
                    return recs;
                }
            }.bind(this);
        }
        this.handlers.onSearch = function (event) {
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
                    //отсылаем запрос
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
        }.bind(this);
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
            if (!this.pagination) {
                w2ui[this.id].toggle(recid);
                return;
            }
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
                let groupedRecs = this.groupBy(this.recordsRaw, this.columnsRaw, groupies, showGroupCol);
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