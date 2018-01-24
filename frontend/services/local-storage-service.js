export default class LocalStorageService{

    static get(name){
        let value = localStorage[name];
        if (value) {
            return JSON.parse(value);
        } else {
            return null;
        }
    }

    static set(name, value){
        localStorage[name] = JSON.stringify(value);
    }

    static delete(name){
        localStorage.removeItem(name);
    }

}