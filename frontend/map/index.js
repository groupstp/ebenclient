//подключаем стили
import '../libraries/fontawesome/css/font-awesome.css';
import '../libraries/gzm/gzm.css';
import '../libraries/gzm/leaflet.css';
console.log('9999999');
const leafletLib = require('imports-loader?jQuery=jquery!exports-loader?L!../libraries/gzm/leaflet-src.js');
window.L = leafletLib;
const gzmLib = require('imports-loader?jQuery=jquery!../libraries/gzm/gzm.js');
console.log(gzmLib);