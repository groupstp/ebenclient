/*
	База
		SmartObject, калькулятор, абстрактные ГО, ГЗМ
*/
require('./basic/SmartObject.js');
require('./basic/Calculator');
require('./basic/GeoObject.js');
require('./basic/AbstractObjects');
require('./basic/Group');
require('./basic/GeoZoneManager.js');
// редактирование
require('./editor/editor.js');
require('./editor/commands.js');
require('./editor/History.js');
// примитивы (основа)
require('./basic/primitives/ComplexArea.js');
require('./basic/primitives/LinearObjectComplexArea.js');
require('./basic/primitives/MapObject.js');
require('./basic/primitives/PopupField.js');
// статическая карта (родительский класс)
require('./basic/StaticMap.js');
// лифлетная реализация
require('./leaflet/LeafletMap.js');
// обработка границ объектов
require('./basic/GzmBounds.js');
require('./leaflet/LeafletBounds.js');
// Статические объекты
require('./basic/StaticObjects/StaticObject.js');
// Полигональные объекты
require('./basic/StaticObjects/MGeoZone.js');
require('./basic/StaticObjects/MPicket.js');
require('./basic/StaticObjects/MRegion.js');
require('./basic/StaticObjects/MCapitalPlaneObject.js');
// Точечные объекты
require('./basic/StaticObjects/MPointObject.js');
require('./basic/StaticObjects/MCapitalPointObject.js');
// Линейные объекты
require('./basic/StaticObjects/MLinearObject.js');
require('./basic/StaticObjects/MRoad.js');
require('./basic/StaticObjects/MSimpleRoute.js');
require('./basic/StaticObjects/MFactRoute.js');
require('./basic/StaticObjects/MPlannedRoute.js');
// круги
require('./basic/StaticObjects/MCircleObject.js');
require('./basic/StaticObjects/MCircleGeoZone.js');
// группировка
require('./basic/StaticObjects/MGroup.js');
// мониторинг
require('./monitoring/monitoring.js');
require('./monitoring/DynamicObject.js');
require('./monitoring/DTruck.js');