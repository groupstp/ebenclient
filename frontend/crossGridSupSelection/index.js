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
        //this.setButtons();
        //this.setHandlers();

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
            }
            records.push(rec);
        }
        return records;
    }

    makeColumns() {

        let grid = this;
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

            let options = {
                field: rawColumn.field,
                size: '10%',
                caption: rawColumn.caption,
                sortable: rawColumn.sortable,
                hidden: rawColumn.hidden,

            };
            let serverType = rawColumn.type;

            // определим тип подставляемый в редактирование
            let editableType = types[serverType];
            if (editableType !== undefined) {
                options.editable = {
                    type: editableType
                };
            }

            columns.push(options)
        }
        return columns;
    }

    _getUniqueGroupValues(groupColName) {
        /*let uniqueGroupValues = {};
        this.records.forEach((rec) => {
            let groupValue = rec[groupColName];
            if (!uniqueGroupValues[groupValue]) {
                uniqueGroupValues[groupValue] = 1;
            }
        });
        return uniqueGroupValues;*/
        return this.fk[this._groupColName];
    }

    _extendColumns(groupValues) {
        let newColumns = [];

        for (let colName in this.columnsRaw) {
            let col = this.columnsRaw[colName];
            let clonedCol = _.cloneDeep(col);
            clonedCol.size = '10%';
            if (colName !== 'description') {
                clonedCol.hidden = true;
            }
            if (colName !== this._groupColName) {
                //let transformedCol = this._colTransformation(col, colName);
                newColumns.push(clonedCol);
            }
        }

        for (let id in groupValues) {
            for (let colName in this.columnsRaw) {
                if (colName !== this._groupColName) continue;
                let col = this.columnsRaw[colName];
                let newName = `${colName}-${id}`;
                let clonedCol = _.cloneDeep(col);
                clonedCol.field = newName;
                clonedCol.editable = {type : 'checkbox'};
                clonedCol.size = '10%';
                clonedCol.caption = groupValues[id];
                //let transformedCol = this._colTransformation(clonedCol, newName);
                newColumns.push(clonedCol);
            }
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
                let value = rec[colName];
                let groupNameValue = rec[this._groupColName][0];
                if (colName === this._groupColName && groupNameValue) {
                    let newColName = `${colName}-${groupNameValue}`;
                    w2rec[newColName] = true;
                } else {
                    w2rec[colName] = value;
                }
            }
            w2records.push(w2rec);
        }
        return w2records;
    }


    _makeW2uiObject() {
        let uniqueGroupValues = this._getUniqueGroupValues();
        let сolumns = this._extendColumns(uniqueGroupValues);
        //let w2uiColumns = this._columnsChangeToW2UI(newColumns);
        //let columnsGroups = this._makeColumnsGroups(uniqueGroupValues, this._colsInGroup);
        let records = this._changeRecords();

        /*this._renderGrid({
            columnsGroups: columnsGroups,
            columns: w2uiColumns,
            records: records
        });*/

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
            //toolbar: this.makeToolbar(),
            //onMenuClick: this.makeMenu().onClick,
            //menu: this.makeMenu().items,
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
            parser: this.handlers.parser || ""
            //searches: this.makeSearches(this.columnsRaw)
        };
        return obj;
    }

    _makeColumnsGroups() {

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
