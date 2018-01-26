import FilterGroup from './filterGroup';
import FilterItem from './filterItem';

let assert = require('chai').assert;

describe('FilterGroup', () => {
    it('setType', () => {
        let filterGroup = new FilterGroup({});
        filterGroup.setType('or');

        assert.equal(filterGroup.type, 'or', "Неверный результат после setType('or')");
    });

    it('add 1', () => {
        let filterGroup = new FilterGroup({});
        let filterItem = new FilterItem({});

        filterGroup.add(filterItem);

        assert.deepEqual(filterGroup.elements, [filterItem], "Неверный результат после add(filterItem);");
    });

    it('add 2', () => {
        let filterGroup = new FilterGroup({});
        let filterItem1 = new FilterItem({});
        let filterItem2 = new FilterItem({});

        filterGroup.add([filterItem1, filterItem2]);

        assert.deepEqual(filterGroup.elements, [filterItem1, filterItem2], "Неверный результат после add([filterItem1,filterItem2]);");
    });

    it('add 3', () => {
        let filterGroup = new FilterGroup({});
        let filterItem1 = new FilterItem({});
        let filterItem2 = new FilterItem({});
        let filterItem3 = new FilterItem({});

        filterGroup.add([filterItem1, filterItem2]);
        filterGroup.add(filterItem3);

        assert.deepEqual(filterGroup.elements, [filterItem1, filterItem2, filterItem3], "Неверный результат после последовательных вызовов add([filterItem1,filterItem2]) и add(filterItem3)");
    });
});