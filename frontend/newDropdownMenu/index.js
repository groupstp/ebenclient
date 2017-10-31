import template from './menu.tpl';
import './menu.css';

export default class DropDownMenu{
    constructor(options){
        this._key = options.key || 'undefined';
        this._title = options.title || '';
        this._items = options.items || []; // объекты {key : 'position', value : 'Заявка'}
    }

    render(){
        let liElem = document.createElement('li');
        liElem.classList.add('dropdown');
        liElem.style.cursor = 'pointer';

        liElem.innerHTML = template({
            menuKey : this._key,
            title : this._title,
            items : this._items
        });

        return liElem;
    }
}