import FilterItem from './filterItem';

let assert = require('chai').assert;

describe('FilterItem', () => {
    it('setLeft', () => {
        let filterItem = new FilterItem({});
        filterItem.setLeft('value', 'date');

        assert.deepEqual(filterItem.left, {type: 'value', value: 'date'}, "Неверный результат после setLeft('value', 'date')");
    });

    it('setRight', () => {
        let filterItem = new FilterItem({});
        filterItem.setRight('field', 'organization.INN');

        assert.deepEqual(filterItem.right, {
            type: 'field',
            value: 'organization.INN'
        }, "Неверный результат после setRight('field', 'organization.INN')");
    });

    it('setSign', () => {
        let filterItem = new FilterItem({});
        filterItem.setSign('greater');

        assert.equal(filterItem.sign, "greater", "Неверный результат после setSign('greater')");
    });
});