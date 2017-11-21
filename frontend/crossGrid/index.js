import * as component from '../component'
import './style.css';

const mockColumns = [
    {
        name: 'object',
        caption: 'object'
    },
    {
        name: 'get',
        caption: 'get'
    },
    {
        name: 'add',
        caption: 'add'
    },
    {
        name: 'update',
        caption: 'update'
    }
];

const mockRecords = [
    {
        object: {
            name: 'query'
        },
        get: {
            actionID: '123-4556-789-1',
            recID: 'recID-1'
        },
        add: {
            actionID: '123-4556-789-2',
            recID: 'recID-2'
        },
        update: {
            actionID: '123-4556-789-3',
            recID: 'recID-3'
        }
    },
    {
        object: {
            name: 'position'
        },
        get: {
            actionID: '123-4556-789-4',
            recID: 'recID-4'
        },
        add: {
            actionID: '123-4556-789-5',
            recID: 'recID-5'
        }
    },
    {
        object: {
            name: 'bill'
        },
        add: {
            actionID: '123-4556-789-8'
        },
        update: {
            actionID: '123-4556-789-9'
        }
    }
];

export class CrossGrid extends component.Component {
    constructor(options) {
        super(options);
        this.columns = options.columns || mockColumns;
        this.records = options.records || mockRecords;
        this.changedRecords = {};
        this.filterID = options.headID || '';
        this.saveInWindow();
    }

    save() {
        let count = Object.keys(this.changedRecords).length;
        if (!count) return;

        if (!this.filterID) {
            twoBe.showMessage(0, 'Не задан id главного объекта!');
            return;
        }

        // разделим записи который надо добавлять и те который надо удалить
        // массового добавления нет, поэтому на каждое добавление шлем отдельный запрос, но все для удаления можно обработать одним запросом
        let splittedRecs = this._splitChangedRecords();
        let forAdd = splittedRecs.forAdd;
        let forDelete = splittedRecs.forDelete;

        this.lock();

        let promiseAdd = this._sendForAdd(forAdd);
        let promiseDelete = this._sendForDelete(forDelete);

        let finalPromise = Promise.all([promiseAdd, promiseDelete]);
        finalPromise.then(() => {
            this.unlock();
        }).catch(() => {
            twoBe.showMessage(0, 'Что-то пошло не так, не все записи сохранились!');
            this.unlock();
        });


    }

    hasChanges() {
        let result = false;
        let changesAmount = Object.keys(this.changedRecords).length;
        if (changesAmount) {
            result = true;
        }
        return result;
    }

    lock() {
        let popup = twoBe.getById('currentPopup');
        if (popup) {
            popup.lock('Сохраняем...');
        }
    }

    unlock() {
        let popup = twoBe.getById('currentPopup');
        if (popup) {
            popup.unlock();
        }
    }

    check() {
        let tdElems = this.box.querySelectorAll('[data-action="toggleValue"]');
        tdElems.forEach((td) => {
            let input = td.querySelector('input');
            if (!input.checked) {
                input.checked = true;
                this._handleCheckBoxClick(input);
            }
        });
    }

    unCheck() {
        let tdElems = this.box.querySelectorAll('[data-action="toggleValue"]');
        tdElems.forEach((td) => {
            let input = td.querySelector('input');
            if (input.checked) {
                input.checked = false;
                this._handleCheckBoxClick(input);
            }
        });
    }

    checkLine(tr) {
        let inputs = tr.querySelectorAll('input');
        inputs.forEach((input) => {
            if (!input.checked) {
                input.checked = true;
                this._handleCheckBoxClick(input);
            }
        });
    }

    unCheckLine(tr) {
        let inputs = tr.querySelectorAll('input');
        inputs.forEach((input) => {
            if (input.checked) {
                input.checked = false;
                this._handleCheckBoxClick(input);
            }
        });
    }

    deleteFromChanged(index) {
        delete this.changedRecords[index];
    }

    _splitChangedRecords() {
        let forAdd = [];
        let forDelete = [];
        for (let index in this.changedRecords) {
            let record = this.changedRecords[index];
            let requestAction = record.action;
            if (requestAction === 'add') {
                forAdd.push(record);
            } else {
                forDelete.push(record);
            }
        }
        return {
            forAdd: forAdd,
            forDelete: forDelete
        }
    }

    _sendForAdd(recordsArr) {
        let promiseArr = [];
        let recsData = [];
        recordsArr.forEach((record) => {
            let {recID, actionID, description, element} = record;
            let values = {
                actionID: actionID,
                description: description,
                filterID: this.filterID
            };
            recsData.push(values);
        });
        let request = twoBe.createRequest();
        request
            .addParam('action', 'add')
            .addParam('path', 'ref-filters_actions')
            .addData('record', recsData)
            .addSuccess((data) => {
                data.content[0].records.forEach((rec) => {
                    let actionID = rec.actionID[0];
                    // удалим из измененных элементов
                    this.deleteFromChanged(actionID);
                    // добавим id нового элемента в таблицу
                    for (let i = 0; i < recordsArr.length; i++) {
                        if (recordsArr[i].actionID === actionID) {
                            recordsArr[i].element.dataset.recid = rec.ID;
                            break;
                        }
                    }
                });
            });

        return request.send();
    }

    _sendForDelete(recordsArr) {
        let IDs = [];
        recordsArr.forEach((record) => {
            IDs.push(record.recID);
        });

        if (!IDs.length) return;

        let request = twoBe.createRequest();
        request
            .addParam('action', 'delete')
            .addParam('path', 'ref-filters_actions')
            .addFilterParam('ID', IDs, 'in')
            .addSuccess((data) => {
                recordsArr.forEach((record) => {
                    record.element.dataset.recid = '';
                    this.deleteFromChanged(record.actionID);
                });
            });

        let promise = request.send();
        return promise;
    }

    _onCheckBoxClick(event) {
        let target = event.target;
        let td = target.closest('[data-action="toggleValue"]');
        if (td) {
            let input = td.querySelector('input');
            if (input) {
                // инпут сам себя изменит, если кликнули куда-то еще в ячейке то меняем сами
                if (target !== input) {
                    input.checked = !input.checked;
                }
                this._handleCheckBoxClick(input);
            }
        }
    }

    _onSaveClick(event) {
        let target = event.target;
        if (target.dataset.action && target.dataset.action === 'save') {
            this.save();
        }
    }

    _onCheckAllClick(event) {
        let target = event.target;
        if (target.dataset.action && target.dataset.action === 'checkAll') {
            this.check();
        }
    }

    _onUncheckAllClick(event) {
        let target = event.target;
        if (target.dataset.action && target.dataset.action === 'uncheckAll') {
            this.unCheck();
        }
    }

    _onCheckLineClick(event) {
        let target = event.target;
        let btn = target.closest('[data-action="checkLine"]');
        if (btn) {
            let tr = target.closest('tr');
            if (tr) {
                this.checkLine(tr);
            }
        }
    }

    _onUnCheckLineClick(event) {
        let target = event.target;
        let btn = target.closest('[data-action="unCheckLine"]');
        if (btn) {
            let tr = target.closest('tr');
            if (tr) {
                this.unCheckLine(tr);
            }
        }
    }

    _handleCheckBoxClick(target) {
        let value = target.checked;
        let recID = target.dataset.recid;
        let actionID = target.dataset.actionid;
        let objectName = target.dataset.object;
        let actionName = target.dataset.actionname;

        let requestAction = value ? 'add' : 'delete';

        if (this.changedRecords[actionID]) {
            delete this.changedRecords[actionID];
        } else {
            this.changedRecords[actionID] = {};
            this.changedRecords[actionID]['action'] = requestAction;
            this.changedRecords[actionID]['recID'] = recID;
            this.changedRecords[actionID]['actionID'] = actionID;
            this.changedRecords[actionID]['description'] = `${objectName}--${actionName}`;
            this.changedRecords[actionID]['element'] = target;
        }
        console.log(this.changedRecords);
    }

    _setHandlers() {
        this.box.addEventListener('click', this._onCheckBoxClick.bind(this));
        this.box.addEventListener('click', this._onSaveClick.bind(this));
        this.box.addEventListener('click', this._onCheckAllClick.bind(this));
        this.box.addEventListener('click', this._onUncheckAllClick.bind(this));
        this.box.addEventListener('click', this._onCheckLineClick.bind(this));
        this.box.addEventListener('click', this._onUnCheckLineClick.bind(this));
    }

    render() {

        let element = document.createElement('div');

        let tableWrapper = document.createElement('div');

        let table = document.createElement('table');
        table.classList.add('table');
        table.classList.add('table-bordered');

        tableWrapper.appendChild(table);

        let tHead = this._renderHead(table);
        table.appendChild(tHead);

        let tBody = this._renderBody(table);
        table.appendChild(tBody);

        let btnsWrapper = document.createElement('div');
        btnsWrapper.classList.add('crossGrid-btnWrapper');

        btnsWrapper.innerHTML = `
            <button class = "btn btn-success" data-action = "save">Сохранить</button>
            <button class = "btn btn-info" data-action = "checkAll">Выделить все</button>
            <button class = "btn btn-info" data-action = "uncheckAll">Снять выделение</button>
        `;

        element.appendChild(btnsWrapper);
        element.appendChild(tableWrapper);

        this.box = element;

        this._setHandlers();

        return element;
    }

    _renderHead(table) {
        let tHead = document.createElement('thead');

        // рисуем шапку
        let tr = document.createElement('tr');
        // первый столбец пустой
        this.columns.forEach((col) => {
            let th = document.createElement('th');
            th.innerHTML = col.caption;
            tr.appendChild(th);
        });
        tHead.appendChild(tr);

        return tHead;
    }

    _renderBody(table) {
        let tBody = document.createElement('tbody');
        this.records.sort(sortByObjName);
        this.records.forEach((item) => {
            let tr = document.createElement('tr');
            this.columns.forEach((col) => {
                let td = document.createElement('td');

                if (col.name === 'object') {
                    td.innerHTML = `<div>${item[col.name].name}
                                        <div style = "float:right">
                                            <button class="btn btn-info" data-action = "checkLine"><i class="fa fa-check-square-o" aria-hidden="true"></i></button>
                                            <button class="btn btn-info" data-action = "unCheckLine"><i class="fa fa-square-o" aria-hidden="true"></i></button>
                                        </div>
                                    </div>`;
                } else if (item[col.name]) {
                    let recID = item[col.name].recID || '';
                    let actionID = item[col.name].actionID || '';
                    let checked = recID ? 'checked' : '';
                    td.dataset.action = "toggleValue";
                    td.innerHTML = `<input type="checkbox" ${checked} data-object = "${item.object.name}" data-actionName = "${col.name}" data-recID = "${recID}" data-actionID = "${actionID}">`;
                }

                tr.appendChild(td);
            });
            tBody.appendChild(tr);
        });

        return tBody;

        function sortByObjName(a,b){
            if (a.object.name > b.object.name) {
                return 1
            } else {
                return -1;
            }
        }
    }

}