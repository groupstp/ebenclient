import tempalate from './menu.tpl';
import './menu.css';

export default class TopMenu {
    constructor(options) {
        this._el = options.el;
        this._title = options.title || 'Hello, world!';
        this._user = options.user || 'Hodor';
        this._dropDownMenus = [];
    }

    render() {
        this._el.innerHTML = tempalate({
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

    addDropDownMenu(menu) {
        this._dropDownMenus.push(menu);
    }
}
