import FilterItem from './filterItem';
import FilterGroup from './filterGroup';

export default class Params {
    constructor() {
        // параметры фильтра
        this.comparisons = {};
        this.tree = {};
        // параметры пагинации
        this.pagination = {};
        // параметры сортировки
        this.orderBy = [];
    }

    // добавяет группу в параметры формирую свойства comparisons и tree, добавить можно только одну группу, повторное добавление затирает предыдущее
    addRootGroup(group) {
        if (!(group instanceof FilterGroup)) {
            throw new Error('Параметр должен быть типа FilterGroup');
        }
        // обнулим состояниe фильтра, на случай повторного вызова addRootGroup(), что является неправильным использованием этого метода
        this.comparisons = {};
        this.tree = {};

        // обработаем корневую группу
        let root = this.tree[group.type] = [];
        // рекурсивно обработаем вложенные элементы
        this._handleGroupElements(group.elements, root);
    }

    // устанавливает лимит для пагинации
    addLimit(value) {
        this.pagination.limit = value;
    }

    // устанавливает параметр отступа при пагинации
    addOffset(value) {
        this.pagination.offset = value;
    }

    // добавляет объект поля { field: имя поля, sort: направление сортировки(asc|desc)} для сортировки, можно передавать массив полей
    addOrderBy(value) {
        if (Array.isArray(value)) {
            value.forEach((field) => {
                this.orderBy.push(field);
            });
        } else {
            this.orderBy.push(value);
        }
    }

    _handleGroupElements(elements, currentGroup) {
        elements.forEach((item) => {
            if (item instanceof FilterItem) {
                this.comparisons[item.name] = {
                    left: item.left,
                    right: item.right,
                    sign: item.sign
                };
                currentGroup.push(item.name);
            } else if (item instanceof FilterGroup) {
                // если добавляем группу, то это всегда {}, где ключ это тип группы, а значение это массив для элементов группы
                let newGroup = {};
                newGroup[item.type] = [];
                currentGroup.push(newGroup);
                this._handleGroupElements(item.elements, newGroup[item.type]);
            }
        });
    }

}