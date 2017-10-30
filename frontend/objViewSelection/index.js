import tempalate from './template.tpl';
import './style.css';
import CookieService from '../services/cookie-service';

export default class ObjViewSelection{
    constructor(options){
        this._el = options.el;
        this._possibleObjViews = options.possibleObjViews || [];
        this._el.addEventListener('click',this._onObjViewCardClick.bind(this));
        this.render();
    }

    render(){
        this._el.innerHTML = tempalate({
            possibleObjViews: this._possibleObjViews
        });
    }

    show(){
        this._el.style.display = '';
    }

    hide(){
        this._el.style.display = 'none';
    }

    _onObjViewCardClick(event) {
        const target = event.target;
        const element = target.closest('.objViewElement');

        if (!element) return;

        CookieService.setCookie('currentObjectView',element.dataset.objview);
        this.hide();
    }
}