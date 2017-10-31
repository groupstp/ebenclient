import template from './menu.tpl';
import './menu.css';

export default class TopMenu {
    constructor(options) {
        this._el = options.el;
        this._title = options.title || 'Hello, world!';
        this._user = options.user || 'Hodor';
        this._dropDownMenus = [];

        this._el.addEventListener('click', this._onMenuItemClick.bind(this));
        this._el.addEventListener('click', this._onObjViewSelectionClick.bind(this));
        this._el.addEventListener('click', this._onExitClick.bind(this));
    }

    render() {
        this._el.innerHTML = template({
            name: this._title,
            user: this._user
        });
    }

    renderDDMenus() {
        const divForMenus = this._el.querySelector('#dropdown-menus');
        if (divForMenus && this._dropDownMenus.length) {
            let DDMenuHTML = '';
            this._dropDownMenus.forEach((menuItem) => {
                DDMenuHTML += menuItem.render();
            });
            divForMenus.innerHTML = DDMenuHTML;
        }
    }

    on(event, handler) {
        this._el.addEventListener(event, handler);
    }

    off() {
        this._el.removeEventListener(event, handler);
    }

    trigger(event, data) {
        let customEvent = new CustomEvent(event, {detail: data});
        this._el.dispatchEvent(customEvent);
    }

    addDropDownMenu(menu) {
        this._dropDownMenus.push(menu);
    }

    _onMenuItemClick(event) {
        // определяем ближайший элемент с доступной обработкой клика
        const target = event.target;
        let elem = target.closest('[data-action=getObjectForm]');
        if (!elem) return;
        let dataset = elem.dataset;
        // при необходимости выделяем
        if (dataset.sel === 'true') {
            //this._setSelection(elem)
        }

        this.trigger('menuItemSelected', dataset);
    }

    _onObjViewSelectionClick(event) {
        const target = event.target;
        let elem = target.closest('[data-action=toObjViewSelection]');
        if (!elem) return;
        this.trigger('toObjViewSelection');
    }

    _onExitClick(event) {
        const target = event.target;
        let elem = target.closest('[data-action = exit]');
        if (!elem) return;
        this.trigger('exit');
    }


}
