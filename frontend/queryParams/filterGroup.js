import FilterItem from './filterItem';

export default class FilterGroup {
    constructor(options) {
        this.type = options.type || 'and';
        this.elements = options.elements || [];
    }

    // устанавливает тип группы, может быть and или or
    setType(value) {
        this.type = value;
    }

    // добавляет элемент в группу (объект типа FilterItem или FilterGroup), аргумент может быть массивом или одним элементом
    add(element) {
        if (Array.isArray(element)) {
            element.forEach((filterItem) => {
                this.elements.push(filterItem);
            });
        } else {
            this.elements.push(element);
        }
    }
}