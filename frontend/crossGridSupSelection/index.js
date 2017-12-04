import * as tools from '../tools/index.js';
import * as component from '../component'
import * as layout from '../layout'
import config from '../config/config.js';
//import {_} from 'lodash';
const _ = require('lodash');

export class CrossGrid extends component.Component {
    constructor(options) {
        super(options);

        this.header = "";
        this.toolbar = {};
        this.btns = {};
        this.handlers = {};
        this.PK = '';

        this.fk = [];
        this.columnsRaw = [];
        this.recordsRaw = {};
        this._groupColName = null;
        this._colsInGroup = null;

        this.saveInWindow();
        this.getAttributes(options.element);
        this.render();
    }

    getAttributes(attributes) {
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
        this._groupColName = attributes.properties.groupColName || '';
        this._colsInGroup = attributes.properties.colsInGroup || 1;
        this.PK = attributes.properties.PK || 'ID';
        this.columnsRaw = this.makeAsos(this.columnsRaw, 'field');
        let prepContent = this.prepareData(this.content);
        this.recordsRaw = this.makeAsos(prepContent.records, this.PK);
        this.fk = prepContent.fk;
        this.setButtons();
        //this.setHandlers();

    }

    setButtons() {
        for (let i in this.toolbar.elements) {
            this.btns[this.toolbar.elements[i].id] = this.toolbar.elements[i].properties;
            this.btns[this.toolbar.elements[i].id].id = this.toolbar.elements[i].id;
            //обработчики нажатий на кнопку
            this.btns[this.toolbar.elements[i].id].onClick = function (element, remoteFuncName) {
                try {
                    this.code[this.toolbar.elements[i].events.onClick].apply(this, [element, remoteFuncName]);
                } catch (err) {
                    console.log('SERVER CODE ERROR:' + err);
                    w2alert('Сервер вернул некорректное действие!');
                }

            }.bind(this)
        }
    }

    makeToolbar() {
        let tlb = {
            items: [],
            onClick: function (event) {
                if (event.subItem === undefined) {
                    if (this.btns[event.item.id] !== undefined) {
                        try {
                            this.btns[event.item.id].onClick.apply(this, [this, event.item.id]);
                        } catch (err) {
                            console.log('SERVER CODE ERROR:' + err);
                            w2alert('Серевер вернул некорректное действие!');
                        }
                    }
                } else {
                    if (this.btns[event.subItem.id] !== undefined) {
                        try {
                            this.btns[event.subItem.id].onClick.apply(this, [this, event.item.id]);
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

    // TODO вынести в utils
    makeAsos(array, key) {
        let res = {};
        for (let i in array) {
            res[array[i][key]] = array[i];
        }
        return res;
    }

    prepareData(contentArr) {
        let content = {};
        contentArr.forEach((item) => {
            item.forId.forEach((id) => {
                if (id === this.id) {
                    content.records = item.records || [];
                    content.fk = item.fk || {};
                    content.summary = item.summary || [];
                }
            })
        });
        return content;
    }

    _getUniqueGroupValues(groupColName) {
        let uniqueGroupValues = {};
        for (let colName in this.fk) {
            let colNameShort = colName.split('-')[0];
            if (colNameShort === this._groupColName) {
                for (let id in this.fk[colName]) {
                    uniqueGroupValues[id] = this.fk[colName][id];
                }
            }
        }
        return uniqueGroupValues;
    }

    _extendColumns(groupValues) {
        let newColumns = [];
        for (let colName in this.columnsRaw) {
            let colNameShort = colName.split('-')[0];
            let col = this.columnsRaw[colName];
            let clonedCol = _.cloneDeep(col);
            clonedCol.size = '10%';
            if (colNameShort !== 'description' && colNameShort !== this._groupColName) {
                clonedCol.hidden = true;
            }
            if (colNameShort == this._groupColName) {
                //let transformedCol = this._colTransformation(col, colName);
                clonedCol.editable = {type: 'checkbox'};
            }
            newColumns.push(clonedCol);
        }
        return newColumns;
    }

    _changeRecords() {
        let w2records = [];
        for (let recid in this.recordsRaw) {
            let rec = this.recordsRaw[recid];
            let w2rec = {};
            w2rec.recid = rec[this.PK];
            for (let colName in rec) {
                let colNameShort = colName.split('-')[0];
                let value = rec[colName];
                if (colNameShort === this._groupColName) {
                    value = value[0];
                    if (value) {
                        w2rec[colName] = true;
                    }
                } else {
                    w2rec[colName] = value;
                }
            }
            w2records.push(w2rec);
        }
        return w2records;
    }

    addColumn(value) {
        let id = value.id;
        let description = value.name;

        let newColName = `supplier-${id}`;
        // проверить если ли в columnsRaw поле supplier c префиксом value.id
        if (this.columnsRaw[newColName]) return;

        // если нет то добавляем в this.columnsRaw новую колонку
        this.columnsRaw[newColName] = {
            field: newColName,
            caption: description,
            size: '10%',
            hidden: false,
            editable: {type: 'checkbox'}
        };
        // добавляем новое значение в this.fk
        this.fk[newColName] = {};
        this.fk[newColName][id] = description;

        // формируем новые колонки и записи для w2ui
        let uniqueGroupValues = this._getUniqueGroupValues();
        let columns = this._extendColumns(uniqueGroupValues);
        // заменяем текущие колонки и записи
        w2ui[this.id].columns = columns;

        // обновляем таблицу w2ui
        w2ui[this.id].refresh();
    }

    _makeW2uiObject() {
        let uniqueGroupValues = this._getUniqueGroupValues();
        let сolumns = this._extendColumns(uniqueGroupValues);
        let records = this._changeRecords();

        let stpgrid = this;
        let obj = {
            name: this.id,
            header: this.header,
            show: {
                toolbar: true,
                footer: true
            },
            columns: сolumns,
            records: records,
            toolbar: this.makeToolbar()
        };
        return obj;
    }

    getChanges() {
        let listForAdd = [];
        let listForDelete = [];
        let w2grid = w2ui[this.id];
        let w2changes = w2grid.getChanges();
        w2changes.forEach((change) => {
            let mainID = change.recid;
            let recordRaw = this.recordsRaw[mainID];
            for (let col in change) {
                if (col === 'recid') continue;
                let changedValue = change[col];
                // если изменили на ложь, то передаем запись на удаление только если там вообще изначально что-то было
                if (!changedValue) {
                    if (recordRaw[col]) {
                        let supID = col.replace('supplier-','');
                        if (supID) {
                            let childID = recordRaw.childID[supID];
                            if (childID) listForDelete.push(childID);
                        }
                    }
                } else { // если изменили на истина, то это по-любому запись на добавление
                    let supID = col.replace('supplier-','');
                    if (supID) {
                        let values = {
                            supSelectionID: mainID,
                            supplier: supID
                        };
                        listForAdd.push(values);
                    }
                }
            }


        });
        return {
            listForAdd : listForAdd,
            listForDelete : listForDelete
        }
    }

    refresh() {
        w2ui[this.id].refresh();
        for (var i in this.children) {
            this.children[i].refresh();
        }
    }

    render(place) {
        if (w2ui[this.id] !== undefined) {
            w2ui[this.id].destroy();
        }
        let objForW2 = this._makeW2uiObject();
        if (place === undefined) {
            $(this.box).w2grid(objForW2);
        } else {
            $(place).w2grid(objForW2);
        }
        w2ui[this.id].refresh();
    }

}
