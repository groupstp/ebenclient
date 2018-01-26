import FilterItem from './filterItem';
import FilterGroup from './filterGroup';
import Params from './params';

let assert = require('chai').assert;

describe('Params', () => {
    it('addRootGroup 1', () => {
        let params = new Params();
        let filterItem = new FilterItem({});
        filterItem.setLeft('value', 'date');

        assert.throws(function () {
            params.addRootGroup(filterItem);
        }, 'Параметр должен быть типа FilterGroup', null, 'Функция не выбрасывает исключение, если получила параметр не типа FilterGroup');
    });

    it('addRootGroup 2', () => {
        let params = new Params();
        let filterGroup = new FilterGroup({});

        assert.doesNotThrow(function () {
            params.addRootGroup(filterGroup);
        }, 'Параметр должен быть типа FilterGroup', null, 'Функция выбрасывает исключение, если получила параметр правильного типа FilterGroup');
    });

    it('addRootGroup 3', () => {
        let params = new Params();
        let filterItem = new FilterItem({
            name: 'state'
        });
        filterItem.setLeft('field', 'state');
        filterItem.setRight('value', 'finished');
        filterItem.setSign('equal');
        let filterGroup = new FilterGroup({
            type: 'and'
        });
        filterGroup.add(filterItem);
        params.addRootGroup(filterGroup);

        let result = {
            comparisons: {
                state: {
                    left: {
                        type: 'field',
                        value: 'state'
                    },
                    right: {
                        type: 'value',
                        value: 'finished'
                    },
                    sign: 'equal'
                }
            },
            tree: {
                and: ['state']
            }
        };

        assert.deepEqual(params.comparisons, result.comparisons, 'Неверный результат после добавления группы and из одного элемента');
        assert.deepEqual(params.tree, result.tree, 'Неверный результат после добавления группы and из одного элемента');
    });

    it('addRootGroup 4', () => {
        // опишем такое условие (date === 01.01.2017 || (date >= 01.02.2017 || date <= 01.07.2017)) && state === 'done')
        let params = new Params();

        // 1. опишем условие (date >= 01.02.2017 || date <= 01.07.2017)
        let dateBetweenGroup = new FilterGroup({type: 'or'});

        let dateBetweenGreaterItem = new FilterItem({name: 'date-greater'});
        dateBetweenGreaterItem.setLeft('field', 'date');
        dateBetweenGreaterItem.setRight('value', '01.02.2017');
        dateBetweenGreaterItem.setSign('greaterEqual');

        let dateBetweenLessItem = new FilterItem({name: 'date-less'});
        dateBetweenLessItem.setLeft('field', 'date');
        dateBetweenLessItem.setRight('value', '01.07.2017');
        dateBetweenLessItem.setSign('lessEqual');

        dateBetweenGroup.add([dateBetweenGreaterItem, dateBetweenLessItem]);

        // 2. опишем условие date === 01.01.2017
        let dateEqualItem = new FilterItem({name: 'date-equal'});
        dateEqualItem.setLeft('field', 'date');
        dateEqualItem.setRight('value', '01.01.2017');
        dateEqualItem.setSign('equal');

        // 3. соединим пункты 1 и 2, поместив их в группу or
        let dateGroup = new FilterGroup({type: 'or'});
        dateGroup.add([dateEqualItem, dateBetweenGroup]);

        // 4. опишем условие state === 'done'
        let stateEqualItem = new FilterItem({name: 'state'});
        stateEqualItem.setLeft('field', 'state');
        stateEqualItem.setRight('value', 'done');
        stateEqualItem.setSign('equal');

        // 5. соединим пункты 3 и 4, поместив их в группу and
        let rootGroup = new FilterGroup({type: 'and'});
        rootGroup.add([dateGroup, stateEqualItem]);

        params.addRootGroup(rootGroup);

        let result = {
            comparisons: {
                "date-greater": {
                    left: {
                        type: 'field',
                        value: 'date'
                    },
                    right: {
                        type: 'value',
                        value: '01.02.2017'
                    },
                    sign: 'greaterEqual'
                },
                "date-less": {
                    left: {
                        type: 'field',
                        value: 'date'
                    },
                    right: {
                        type: 'value',
                        value: '01.07.2017'
                    },
                    sign: 'lessEqual'
                },
                "date-equal": {
                    left: {
                        type: 'field',
                        value: 'date'
                    },
                    right: {
                        type: 'value',
                        value: '01.01.2017'
                    },
                    sign: 'equal'
                },
                state: {
                    left: {
                        type: 'field',
                        value: 'state'
                    },
                    right: {
                        type: 'value',
                        value: 'done'
                    },
                    sign: 'equal'
                }
            },
            tree: {
                and: [
                    {
                        or: [
                            'date-equal',
                            {
                                or: ['date-greater', 'date-less']
                            }
                        ]
                    },
                    'state'
                ]
            }
        };

        assert.deepEqual(params.comparisons, result.comparisons, 'Неверный результат после добавления сложного условия');
        assert.deepEqual(params.tree, result.tree, 'Неверный результат после добавления сложного условия');
    });

    it('addLimit ', () => {
        let params = new Params();
        params.addLimit(5);
        assert.equal(params.pagination.limit, 5, 'Неверный результат после задания параметра limit для пагинации');
    });

    it('addOffset ', () => {
        let params = new Params();
        params.addOffset(100);
        assert.equal(params.pagination.offset, 100, 'Неверный результат после задания параметра offset для пагинации');
    });

    it('addOrderBy 1', () => {
        let params = new Params();
        params.addOrderBy('organization');
        assert.deepEqual(params.orderBy, ['organization'], "Неверный результат после выполнения метода addOrderBy('organization')");
    });

    it('addOrderBy 2', () => {
        let params = new Params();
        params.addOrderBy(['organization','date']);
        assert.deepEqual(params.orderBy, ['organization','date'], "Неверный результат после выполнения метода addOrderBy(['organization','date']");
    });

});

