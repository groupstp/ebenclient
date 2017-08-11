/**
 * Модуль для построения карт
 * @module map
 * @requires {@link leaflet}
 * @requires {@link gzm}
 * @requires component
 * @requires tools
 * */
//подключаем стили
import '../libraries/fontawesome/css/font-awesome.css';
import '../libraries/gzm/gzm.css';
import '../libraries/gzm/leaflet.css';
//подключаем leaflet
const leafletLib = require('imports-loader?jQuery=jquery!exports-loader?L!../libraries/gzm/leaflet-src.js');
window.L = leafletLib;
//подключаем gzm
const gzmLib = require('imports-loader?jQuery=jquery!../libraries/gzm/gzm.js');
import * as component from '../component';
import * as tools from '../tools/index.js';
/**
 * Заготовка для отображения карт - будет еще серьезно дополняться и модернизироваться
 * @extends module:component.Component
 */
export class Map extends component.Component {
    constructor(param) {
        super(param);
        this.gzmCore = '';
        this.map = '';
        this.editor = '';
        this.staticObjects = {};
        this.saveInWindow();
        this.render();
        this.deployObjects();
        this.addListeners()
    }

    /**
     * Добавляет слушателей карты
     */
    addListeners() {
        if (this.events.mapSelected !== undefined) {
            this.gzmCore.addListener('mapSelect', function (event) {
                /*
                 TODO
                 getUUIDbyObjectID(objectID)
                 */
                let uuid = '';
                for (let i in this.staticObjects.geoZones) {
                    if (this.staticObjects.geoZones[i].objectID === event.objectInfo.objectID) {
                        uuid = this.staticObjects.geoZones[i].uuid;
                        break;
                    }
                }
                this.code[this.events.mapSelected].call(this, uuid);
            }.bind(this))
        }
    }

    /**
     * Разворчивает объекты на карте
     */
    deployObjects() {
        this.makeObjectsForMap();
        this.gzmCore.deployObjects(this.staticObjects);
        this.gzmCore.fitMap();

    }

    /**
     * Соединяем все с ядром
     */
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

    /**
     * Создаем объект для размещения на карте
     */
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
            coordsStr = coordsStr.split('),(');
            for (let j in coordsStr) {
                coords.push([parseFloat(coordsStr[j].split(',')[0]), parseFloat(coordsStr[j].split(',')[1])]);
            }
            result.geoZones.push({
                uuid: records[i].ID,
                props: {test: {value: 'testValue'}},
                nodes: coords
            })
        }
        this.staticObjects = result;
    }

    /**
     * Выделяет объект на карте
     * @param {string} uuid - идентификатор
     */
    setSelection(uuid) {
        /*
         TODO
         getObjectIDbyUUID(uuid)
         */
        for (let i in this.staticObjects.geoZones) {
            if (this.staticObjects.geoZones[i].uuid === uuid) {
                this.gzmCore.map.focus(this.staticObjects.geoZones[i].objectID);
                break;
            }
        }
    }

    /**
     * Размещает карту на странице в боксе
     */
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