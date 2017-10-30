import tempalate from './template.tpl';
import './style.css';

export default class ObjViewSelection{
    constructor(options){
        this._el = options.el;
        this._possibleObjViews = options.possibleObjViews || [];
        this._el.addEventListener('click',this._onObjViewCardClick);
        this.render();
    }

    render(){
        this._el.innerHTML = tempalate({
            possibleObjViews: this._possibleObjViews
        });
    }

    _onObjViewCardClick(event) {
        const target = event.target;
        const element = target.closest('.objViewElement');

        if (!element) return;

        localStorage['currentObjectView'] = element.dataset.objview;
        document.location.href = 'main.html';
    }
}