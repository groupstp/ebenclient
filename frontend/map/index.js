//подключаем стили
import '../libraries/fontawesome/css/font-awesome.css';
import '../libraries/gzm/gzm.css';
import '../libraries/gzm/leaflet.css';
console.log('9999999');
const leafletLib = require('imports-loader?jQuery=jquery!exports-loader?L!../libraries/gzm/leaflet-src.js');
window.L = leafletLib;
const gzmLib = require('imports-loader?jQuery=jquery!../libraries/gzm/gzm.js');
console.log(gzmLib);
import * as componentLib from '../component';
import * as tools from '../tools/index.js';

export class Map extends componentLib.Component {
    constructor(param) {
        super(param);
        this.gzmCore = '';
        this.map = '';
        this.editor = '';
        this.render();
        this.deployObjects();
    }

    deployObjects() {
        this.makeObjectsForMap();
    }

    connectToCore() {
        this.gzmCore.plugMap(this.map);
        this.gzmCore.plugEditor(this.editor);
    }

    /**
     * Создаем ядро редактора
     */
    createGzmCore() {
        this.gzmCore = new GeoZoneManager();
    }

    /**
     * Создаем редактор
     */
    createEditor() {
        this.editor = new Editor(this.gzmCore);
    }

    makeObjectsForMap() {
        let result = {};
        result.geoZones = [];
        let prepRecs = this.prepareData(this.content);
        let records = prepRecs.records;
        let fk = prepRecs.fk;
        for (let i in records) {
            let coords = [];
            let coordsStr = records[i].coords;
            coordsStr = coordsStr.slice(2);
            coordsStr = coordsStr.substr(0, coordsStr.length - 3);
            console.log(coordsStr);
            result.geoZones.push({
                uuid: records[i].ID,
                props: {test: {value: 'testValue'}},
            })
        }
        return result;
    }

    render() {
        let placeMap = document.createElement('div');
        placeMap.style.height = '100%';
        this.box.appendChild(placeMap);
        //создаем место для карты
        this.map = new LeafletStaticMap(placeMap);
        this.createGzmCore();
        this.createEditor();
        this.connectToCore();
    }
}