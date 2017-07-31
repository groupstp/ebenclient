/*
	Фактический маршрут с указанием остановок.
	Создание: развертывание (через мониторинг);
	ФМ нельзя растягивать, выделять и удалять, но можно скрыть.
	Имеет стрелки, указывающие направление, которые можно показать или скрыть;
	Не взаимодействует с другими объектами.
*/
window.MFactRoute = class MFactRoute extends MSimpleRoute{
	constructor(data, map){
		// создаём маршрут как стандартный линейный объект
		super(data, map);
		this.stops = null;
		this.stopHints = null;
		// если переданы остановки, создаём их
		if (data.stops){
			this.createStops(data.stops);
			this.showStops();
		}		
	}

	createArea(coords){
		// создаем область стандартно
		super.createArea(coords);
		// создаем стрелки
		this.createArrows();
		// показываем стрелки
		this.showArrows();
	}

	/* Создаёт маркеры остановок */
	createStops(data){
		var self = this;
		this.stops = [];
		this.stopHints = [];
		data.forEach(function(item){
			// в зависимости от статуса маркера правим его стиль
			var style = StaticMap.getStyleCollection().markers.defaultMarker;			
			switch (item.status){
				case 'ok':
					style.color = '#008000';
					break;
				case 'badTiming':
					style.color = '#ffa500';
					break;
				case 'alarm':
					style.color = '#FF0000';
					break;
			}
			// добавляем новый остановочный маркер
			self.stops.push(self.map.createMarker(item.coords, self, style, false));
			// задаем ему индекс
			self.stops[self.stops.length-1].index = self.stops.length-1;
			// добавляем плашку-подсказку, содержащую описание			
			self.stopHints.push(self.map.createPopup(item.coords, self, item.descr, StaticMap.getStyleCollection().popups.popupOffsets.bigOffset));			
			// вешаем обработчик клика на маркер остановки, после клика вылазит соответствующая подсказка
			self.stops[self.stops.length-1].addListener('click', function(context){				
				self.stopHints[this.index].show();
			});			
		});
	}

	addPoint(coords){
		if (this.Area){
			this.Area.pushPoint(coords);
		}
	}

	showStops(){
		if (this.stops){
			this.stops.forEach(function(item){
				item.show();
			});
		}
	}

	hideStops(){
		if (this.stops){
			this.stops.forEach(function(item){
				item.hide();
			});
		}
	}

	grabIDs(){
		let res = super.grabIDs();
		for (var i in this.stops){
			res.push(this.stops[i].objectID);
			res.push(this.stopHints[i].objectID);
		}
		return res;
	}
}