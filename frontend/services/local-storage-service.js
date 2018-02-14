export default class LocalStorageService{

    static get(name){
        console.log("ObjectView name: " + name);
        let value = localStorage[name];
        console.log("Current value (JSON): " + value);
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