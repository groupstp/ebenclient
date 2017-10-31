import TopMenu from './newTopMenu';
import DropDownMenu from './newDropdownMenu';

export default class Controller {
    constructor() {
        this.topMenu = null;
    }

    init() {
        this.topMenu = new TopMenu({
            el : document.querySelector('#topMenu')
        });
        this.topMenu.render();

        this.topMenu.addDropDownMenu(new DropDownMenu({
            key : 'reference',
            title : 'Справочники',
            items : [{key : 'query', value : 'Заявки'},{key : 'position', value : 'Позиции'}]
        }));
        this.topMenu.addDropDownMenu(new DropDownMenu({
            key : 'stages',
            title : 'Этапы'
        }));
        this.topMenu.renderDDMenus();

    }
}

