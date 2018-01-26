export default class FilterItem {
    constructor(options) {
        this.name = options.name;
        this.left = options.left || {};
        this.right = options.right || {};
        this.sign = options.sign || 'equal'; // "equal"|"unEqual"|"less"|"greater"|"consist"|"greaterEqual"|"lessEqual"|"in"|"rin"
    }

    // устанавливает левую часть равенства
    setLeft(type, value) {
        this.left = {
            type: type,
            value: value
        };
    }

    // устанавливает правую часть равенства
    setRight(type, value) {
        this.right = {
            type: type,
            value: value
        };
    }

    // устанавливает знак
    setSign(value) {
        this.sign = value;
    }
}