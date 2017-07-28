/**
 * Created by AHonyakov on 15.06.2017.
 */
import tempalate from './mainPage.tpl';
export class mainPage{
    constructor(options){
        this._place = options.place;
        document.getElementById(this._place).innerHTML = tempalate();
    }
}
