import template from './template.tpl';
import './style.css';

export default class ObjViewSelection {
    constructor(options) {
        this._el = options.el;
        this._objViews = options.objViews || [];
        this.on('click', this._onClick.bind(this));
    }

    render() {
        this._el.innerHTML = template({
            objViews: this._objViews
        });
    }

    addObjectView(objView){
        if (!objView) return;
        if (Array.isArray(objView)) {
            objView.forEach((item)=>{
                this._objViews.push(item);
            });
        } else {
            this._objViews.push(objView);
        }
    }

    hide(){
        this._el.style.display = 'none';
    }

    show(){
        this._el.style.display = '';
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

    _onClick(event){
        const target = event.target;

        if (target.closest('.objViews-list-element')) {
            this.trigger('objViewSelected', {
                name : target.dataset.name
            });
        }

    }
}