/*
	Класс, отвечающий за манипулирование геообъектами;
	Управляющий объект, который эксплуатирует пользователь скрипта.
	Хранит ссылки на геообъекты.
*/
window.GeoZoneManager = class GeoZoneManager extends SmartObject{

	constructor(){
		super();
		// хэш, хранящий статические объекты
		this.staticObjects = {};
		// перечень объектов, записанных в бд (имеющих uuid)
		this.confirmedObjects = {};		
		// карта-болванка, заменяется через метод plugMap
		this.map = new StaticMap('');
		// слоты для обращения к карте, редактору и мониторингу
		this.staticMap = {};
		this.editor = {};
		this.monitoring = {};
		this.calculator = new Calculator();
	}


	
	/*
		Создает и выкладывает на карту 1 статический объект
	*/
	deployObject(className, data){		
		var view = null;
		// генерируем новый objectID, если он отсутствует
		// (это нужно для перехода со старой версии, где не было разделения на objectID и uuid)		
		if (!data.objectID){
			data.objectID = this.getNewID();
		}
		// если объект развертывается из бд, то пишем его в подтверждённые
		if (data.uuid){
			this.confirmedObjects[data.objectID] = data.uuid;
		}
		if (className !== 'Group'){
			view = this.map.addComplexObject(className, data);
			this.staticObjects[data.objectID] = eval('new '+className+'(data, view, this)');
			if (data.parentUUID || data.parentObjectID){
				let parentObjectID = data.parentObjectID || this.getObjectIDbyUUID(data.parentUUID);
				if (this.staticObjects[parentObjectID]){
					this.staticObjects[parentObjectID].addChild(this.staticObjects[data.objectID]);
				} else {
					// если родитель указан, но отсутствует, кидаем ошибку
					this.fire('invalidparent', {parentUUID: data.parentUUID, parentObjectID: data.parentObjectID});
				}
			}
		} else {			
 			let deployData = JSON.parse(JSON.stringify(data));
 			deployData.children = [];
			for (var i = 0; i < data.children.length; i++){				
				deployData.children.push(this.staticObjects[data.children[i]]);
			}

			view = this.map.addComplexObject('MGroup', data);
			this.staticObjects[data.objectID] = new Group(deployData, view, this);			
		}
		// кидаем событие о добавлении объекта, в котором передаём ссылку на выложенный объект
		this.fire('staticObjectDeploy', {link: this.staticObjects[data.objectID]});
	}	

	/*
		Создает и выкладывает на карту группу статических объектов
	*/
	deployObjects(data){
		// функция для рекурсивного выкладывания на карту вложенных геозон
			
		self = this;
		if ('geoZones' in data){
			function deployGeoZone(gz){
				let objectID = null, parentObjectID = null, parentUUID = null;
				// проверяем есть ли такой объект
				// находим его objectID
				objectID = gz.objectID || self.getObjectIDbyUUID(gz.uuid);
				// если такой объект уже есть, дальше не идём
				if (!self.staticObjects[objectID]){
					// если у ГЗ указан родитель, проверяем, добавлен ли он
					parentUUID = gz.parentUUID;
					parentObjectID = gz.parentObjectID || self.getObjectIDbyUUID(parentUUID);
					// если родитель указан, но отсутствует, перебираем все геозоны, ищем родителя текущей и выкладываем его					
					if ((gz.parentUUID || parentObjectID) && !self.staticObjects[parentObjectID]){
						let i = 0;
						while (i < data['geoZones'].length && !self.staticObjects[parentObjectID]){
							if (data['geoZones'][i].uuid === parentUUID || data['geoZones'][i].objectID === parentObjectID){
								deployGeoZone(data['geoZones'][i]);
							}
							i++;
						}											
					}
					// после того, как родитель добавлен (если он был), выкладываем сам объект
					self.deployObject('GeoZone', gz);
				}				
			}

			data['geoZones'].forEach(function(gz){
				//self.deployObject('GeoZone', gz);
				deployGeoZone(gz);
			});
		}
		if ('regions' in data){
			data['regions'].forEach(function(reg){
				self.deployObject('Region', reg);				
			});
		}
		if ('capitalPlaneObjects' in data){
			data['capitalPlaneObjects'].forEach(function(obj){
				self.deployObject('CapitalPlaneObject', obj);				
			});
		}
		if ('plannedRoutes' in data){
			data['plannedRoutes'].forEach(function(obj){
				self.deployObject('PlannedRoute', obj);				
			});
		}	
		if ('factRoutes' in data){
			data['factRoutes'].forEach(function(obj){
				self.deployObject('FactRoute', obj);				
			});
		}		
	}

	/*
		Удаляет статический объект по ID
	*/
	deleteStaticObject(ID){		
		// кидаем событие об удалении объекта
		this.fire('staticObjectDelete', {objectID: ID});
		//Перебираем чилдренов объекта, рекурсивно удаляем их
		for (var i = 0; i < this.staticObjects[ID].children.length; i++){
			this.deleteStaticObject(this.staticObjects[ID].children[i].objectID);
		}
		this.children = [];
		// Удаляем объект из списков ГЗМа
		this.staticObjects[ID] = null;
	}

	disbandGroup(objectID){
		this.staticObjects[objectID].disband();
		this.map.disbandGroup(objectID);
		this.staticObjects[objectID] = null;
	}

	/*
		Генератор uuid, используемых редактором; ID объекта в бд редактор не использует.
	*/
	getNewID() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x3|0x8)).toString(16);
		});
		return uuid;
	};

	/*
		Задает uuid статического объекта, если он ещё не задан
	*/
	setUUID(objectID, uuid){
		if (this.staticObjects[objectID] && !this.staticObjects[objectID].uuid){
			this.staticObjects[objectID].uuid = uuid;
			// записывает объект в подтверждённые
			this.confirmedObjects[objectID] = uuid;
		}
	}

	/*
		Массовое задание uuid'ов
	*/
	setUUIDs(data){
		for (let objectID in data){
			this.setUUID(objectID, data[objectID]);
		}
	}

	/*
		Возвращает objectID по uuid
	*/
	getObjectIDbyUUID(uuid){
		var id = null;
		for (var key in this.staticObjects){
			if (this.staticObjects[key].uuid === uuid) {
				id = key;
			}
		}
		return id;
	}

	/*
		Возвращает uuid по objectID
	*/
	getUUIDbyObjectID(objectID){
		var u = null;
		if (this.staticObjects[objectID] && this.staticObjects[objectID].uuid){
			u = this.staticObjects[objectID].uuid;
		}
		return u;
	}

	/*
		Возвращает хэш с соответствием всех ID'шников в обе стороны
	*/
	getIDMap(){
		var res = {
			uuid: {},
			objectID: {}
		};
		for (var objectID in this.staticObjects){
			res.objectID[objectID] = this.staticObjects[objectID].uuid || null;
			if (this.staticObjects[objectID].uuid){
				res.uuid[this.staticObjects[objectID].uuid] = objectID;
			}
		}
		return res;
	}

	deleteObject(id){}

	deleteObjects(ids){}

	deleteSelectedObjects(){
		this.deleteObjects(this.map.getSelectedObjects());
	}

	/*
		Выбирает целевой объект на карте по id, zoomIn - подгонять ли карту по размерам объекта при выделении
	*/
	selectObject(objectID, zoomIn){
		this.map.selectObject(objectID);
	}

	/*
		Дает карте команду сбросить выделение со всех объектов
	*/
	unfocus(){}

	freeze(){
		// убираем обработчики клика по карте, мы больше не получаем данные от кликов
		this.map.clearListeners('mapClick');
		// даем карте команду на выход из режима редактирования
		this.map.freeze();
	}	

	/*
		Возвращает true, если объект с id == child можно включить в объект с id == parent
	*/
	canInclude(parentID, child){
		var res = false;		
		if (this.staticObjects[parentID].getClassName() == 'GeoZone' && this.staticObjects[child].getClassName() == 'GeoZone') res = true;		
		return res;
	}

	/*
		Подключение карты и навешивание обработчиков
	*/
	plugMap(map){
		if (['Leaflet'].indexOf(map.getPlatform()) >= 0){
			this.map = map;
			var self = this;			
			// обработка перезаписи координат объекта
			this.addListener('latLngChange', function(context){
				this.map.staticObjects[context.objectID].setLatLngs(context.coords);
			});
			// обработка удаления вершины объекта
			this.addListener('removeNode', function(context){				
				this.map.staticObjects[context.objectID].removeNode(context.index);
			});
			// обработка перемещения вершины объекта
			this.addListener('moveNode', function(context){				
				this.map.staticObjects[context.objectID].moveNodeTo(context.index, context.coords);
			});			
			// обработка перемещения вершины объекта
			this.addListener('staticObjectDelete', function(context){
				this.map.eraseStaticObject(context.objectID);
			});
			// обработка перемещения вершины объекта
			this.addListener('pushPoint', function(context){				
				this.map.staticObjects[context.objectID].pushPoint(context.coords);
			});
			// обработка расщепления границы
			this.addListener('splitBorder', function(context){
				this.map.staticObjects[context.objectID].splitBorder(context.index, context.coords);
			});
			// обработка добавления точки в произвольную позицию
			this.addListener('addNode', function(context){
				this.map.staticObjects[context.objectID].addNode(context.index, context.coords);
			});
			// изменение радиуса окружности
			this.addListener('changeRadius', function(context){				
				this.map.staticObjects[context.objectID].setRadius(context.newRadius);
			});
			// перемещение центра окружности
			this.addListener('changeCenter', function(context){
				this.map.staticObjects[context.objectID].setCenter(context.newCenter);
			});
			// события карты, отправляемые наружу
			// перемещение курсора
			this.map.addListener('mousemove', function(context){
				self.fire('mapCursorMove', context);
			});
			// выбор объекта
			this.map.addListener('select', function(context){
				self.fire('mapSelect', context);
			});			
			// развыбор объекта
			this.map.addListener('unselect', function(context){
				self.fire('mapUnselect', context);
			});
			// нанесение разметки для разбивки линейных объектов
			// один маркер поставлен
			this.map.addListener('markPlaced', function(context){
				self.fire('markPlaced', context);
			});
			// разметка нанесена
			this.map.addListener('markupComplete', function(context){
				self.fire('markupComplete', context);
			});
		}
	}

	plugEditor(editor){
		this.editor = editor;
		this.editor.master = this;
		var self = this;
		// обработка визуального растягивания объекта на карте
		this.map.addListener('moveNodeVisual', function(context){			
			self.editor.moveNodeVisual(context);
		});
		this.map.addListener('radiusChange', function(context){			
			self.editor.radiusChange(context);
		});
		// обработка директивного растягивания через плашку
		this.map.addListener('moveNodeDirect', function(context){			
			self.editor.moveNodeDirect(context);
		});
		// обработка директивного удаления через плашку
		this.map.addListener('removeNode', function(context){		
			self.editor.removeNode(context);
		});
		// обработка расщепления границы
		this.map.addListener('splitBorderVisual', function(context){			
			self.editor.splitBorderVisual(context);
		});
		this.map.addListener('objectDragEnd', function(context){
			self.editor.transpose(context);
		});
	}

	plugMonitor(monitor){
		this.monitor = monitor;
	}

	/*
		Переводит прямоугольные координаты в широту и долготу
	*/
	xyToLatLng(xy){}

	/*
		Переводит широту и долготу в прямоугольные координаты
	*/
	latLngToXY(ll){}

	/*
		Возвращает копию объекта source
	*/
	cloneObject(source){}

	isMajorObject(id){}

	/*
		Подгоняет зум карты, центрируя её на координатах latlng и задавая радиус охвата в километрах;
		Вызов перенаправляется к карте, возможен вызов без параметров, в этом случае центровка карты производится по статическим объектам на ней.
	*/
	fitMap(latlng, radius){
		if (latlng){			
			this.map.setView(latlng, radius);
		} else {
			this.map.fitByObjects();
		}
		
	}

	/*
		Проверяет объект obj на конфликты с другими объектами на карте
	*/
	noConflicts(obj){}

	/*
		Кидает ошибку
	*/
	throwError(errorName, context){}

	placeMarker(coords){
		var point = coords.split(',');
		point[0] = parseFloat(point[0], 6);
		point[1] = parseFloat(point[1], 6);
		this.map.createMarker1(point);
	}

	static getCalculator(){
		return new Calculator();
	}
}