/**
 * Created by AHonyakov on 21.07.2017.
 * Данный класс представляет собой реализацию скелета одностраничного приложения
 */
export default class contentBuilder {
    constructor(param) {
        this.box = param.box;
        this.pageContainer = '';
        //какая страница открыта на данный момент
        this.current = -1;
        this.pages = [];//массив страниц
        this.children = [];//детки
        this.onHome = param.onHome || null;//что делать при нажатии кнопки домой
        this.render();
    }

    /**
     * Функция записывает в детки
     * @param child
     */
    addChildren(child) {
        this.children.push(child);
    }

    /**
     * Размещает на странице тулбар и контейнер для страниц
     */
    render() {
        let pageNavigator = document.createElement('div');
        pageNavigator.id = 'pageNavigator';
        pageNavigator.style.marginBottom = '5px';
        this.box.appendChild(pageNavigator);
        let pageContainer = document.createElement('div');
        pageContainer.id = 'pageContainer';
        this.box.appendChild(pageContainer);
        this.pageContainer = pageContainer;
        this.buildNavigatorToolbar(pageNavigator);
    }

    /**
     * Функция выполняет построение тулбара
     * @param place
     */
    buildNavigatorToolbar(place) {
        $(place).w2toolbar({
            name: 'navigatorToolbar',
            items: [
                {type: 'button', id: 'buttonNavigatorBack', tooltip: 'Back', icon: 'fa fa-arrow-left', disabled: true},
                {type: 'button', id: 'buttonNavigatorStr', tooltip: 'Up', icon: 'fa fa-arrow-right', disabled: true},
                {type: 'button', id: 'buttonNavigatorHome', tooltip: 'Home', icon: 'fa fa-home', disabled: true},
                {type: 'break'},
                {type: 'html', id: 'navigatorLabel', html: '<b><h3>Главная страница</h3></b>'},
                {type: 'spacer'}
            ],
            onClick: function (event) {
                if (event.item.id === 'buttonNavigatorBack') {
                    this.current--;
                    document.getElementById('boxForLayout' + this.pages[this.current + 1].id).style.display = 'none';
                    document.getElementById('boxForLayout' + this.pages[this.current].id).style.display = '';
                    w2ui.navigatorToolbar.set('navigatorLabel', {html: '<b><h3>' + this.pages[this.current].navigatorLabel + '</h3></b>'});
                    if (this.current === 0) {
                        w2ui.navigatorToolbar.set('buttonNavigatorBack', {disabled: true});
                        w2ui.navigatorToolbar.render();
                    }
                    w2ui.navigatorToolbar.set('buttonNavigatorStr', {disabled: false});
                    w2ui.navigatorToolbar.set('buttonNavigatorHome', {disabled: false});
                    w2ui.navigatorToolbar.render();
                    this.refresh();

                }
                if (event.item.id === 'buttonNavigatorStr') {
                    this.current++;
                    document.getElementById('boxForLayout' + this.pages[this.current - 1].id).style.display = 'none';
                    document.getElementById('boxForLayout' + this.pages[this.current].id).style.display = '';
                    w2ui.navigatorToolbar.set('navigatorLabel', {html: '<b><h3>' + this.pages[this.current].navigatorLabel + '</h3></b>'});
                    if (this.current === this.pages.length - 1) {
                        w2ui.navigatorToolbar.set('buttonNavigatorStr', {disabled: true});
                        w2ui.navigatorToolbar.render();
                    }
                    w2ui.navigatorToolbar.set('buttonNavigatorBack', {disabled: false});
                    w2ui.navigatorToolbar.set('buttonNavigatorHome', {disabled: false});
                    w2ui.navigatorToolbar.render();
                    this.refresh();
                }
                if (event.item.id === 'buttonNavigatorHome') {
                    if (this.onHome !== null) {
                        this.onHome(this);
                        w2ui.navigatorToolbar.set('buttonNavigatorHome', {disabled: true});
                    }
                }
            }.bind(this)
        });
    }

    /**
     * Выполняет обновление текущей страницы
     */
    refresh() {
        if (this.pages[this.current].object !== undefined)
            this.pages[this.current].object.refresh();
    }

    /**
     * Показывает страниу
     * @param id
     * @param caption
     * @returns {Element}
     */
    showElement(id, caption) {
        w2ui.navigatorToolbar.set('navigatorLabel', {html: '<b><h3>' + caption + '</h3></b>'});
        w2ui.navigatorToolbar.refresh();
        this.pageContainer.style.height = document.documentElement.clientHeight - 115 + 'px';
        this.pageContainer.style.marginBottom = '15px';
        let uniq = true;
        this.current++;
        if (this.current > 0) {
            document.getElementById('boxForLayout' + this.pages[this.current - 1].id).style.display = 'none';
            w2ui.navigatorToolbar.set('buttonNavigatorBack', {disabled: false});
            w2ui.navigatorToolbar.set('buttonNavigatorHome', {disabled: false});
            w2ui.navigatorToolbar.render();
        }
        if (this.pages.length >= 0) {
            //убираем повторы
            for (let i in this.pages) {
                if (this.pages[i].id === id) {
                    if (i <= this.current - 1) uniq = false;
                    this.pages.splice(i, 1);
                    document.getElementById('boxForLayout' + id).parentNode.removeChild(document.getElementById('boxForLayout' + id));
                    break;
                }
            }
        }
        if (!uniq) --this.current;
        let boxForElement = document.createElement('div');
        boxForElement.id = 'boxForLayout' + id;
        boxForElement.style.height = '100%';
        this.pageContainer.appendChild(boxForElement);
        this.pages.splice(this.current, 0, {id: id, navigatorLabel: caption});
        return boxForElement;
    }
}