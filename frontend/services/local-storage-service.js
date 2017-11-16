export default class LocalStorageService{

    static get(name){
        return localStorage[name];
    }

    static set(name, value){
        localStorage[name] = value;
    }

    static delete(name){
        localStorage.removeItem(name);
    }

}