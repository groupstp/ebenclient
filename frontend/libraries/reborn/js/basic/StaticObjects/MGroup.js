window.MGroup = class MGroup extends StaticObject{

	constructor(data, map, style){
		super(data, map, style);
		this.children = data.children;
		for (var i = 0; i < this.children.length; i++){
			this.children[i].group = this;
		}
	}

	/*
		Расформировывает группу без удаления чилдренов
	*/
	disband(){
		this.children.forEach(function(item){
			item.group = null;
		});
		this.children = [];
	}

	// будет доработан
	getCenter(){return [];}

	// будет доработан
	getBounds(){return null;}

	/*
		Методы, показывающие/прячущие/подсвечивающие объект обходят всех чилдренов и вызывают соответствующий метод у них
	*/
	show(){
		this.isVisible = true;
		for (var i in this.children){
			this.children[i].show();			
		}
	}

	hide(){
		// развыбираем объект
		if (this.isSelected){
			this.unselect();
		}
		this.isVisible = false;		
		this.fire('hideView', {objectID: this.objectID});		
		for (var i in this.children){
			this.children[i].hide();
		}
	}
	
	select(){
		this.isSelected = true;
		for (var objectID in this.children){
			this.children[objectID].select();
		}
	}

	unselect(){
		this.isSelected = false;
		for (var objectID in this.children){
			this.children[objectID].unselect();
		}
	}

	highlightOn(){		
		for (var i in this.children){
			this.children[i].highlightOn();			
		}		
	}

	highlightOff(){		
		for (var i in this.children){
			this.children[i].highlightOff();			
		}	
	}

	/*
		Добавляет объекту обработчики событий
	*/
	subscribe(){

	}

	/*
		Возвращает true если объект находится в стабильном состоянии и его можно в таком виде сохранить
	*/
	isComplete(){		
		return true;
	}

	freeze(){}

	/*
		Возвращает ID всех примитивов, из которых состоит объект
		Группа перебирает всех своих чилдренов и извлекает из них id, формируя большой массив и возвращает его.
	*/
	grabIDs(){
		var result = [], buf = [];
		/*for (var i in this.children){
			buf = this.children[i].grabIDs();
			for (var j in buf){
				result.push(buf[j]);
			}
			
		}*/
		return result;
	}

	/*
		Границ нет, маркеров нет, стретчеров нет, населена роботами.
	*/
	hasBorders(){return false;}

	hasMarkers(){return false;}

	hasStretchers(){return false;}	

	/*
		Т.к. группа, строго говоря, не имеет собственного визуального воплощения, то у неё не работают:
			методы редактирования статических объектов;
			методы, связанные с границами и стретчерами;
			методы, показывающие/скрывающие части объекта (маркеры, границы, стретчеры и проч.)
		Все эти методы заменены на заглушки.
	*/
	
	setLatLngs(ll){}	
	moveNodeTo(index, coords){}	
	removeNode(index){}
	getLatLngs(){return [];}	
	createMarkers(){}
	destroyMarkers(){}	
	adjustMarkers(){}
	showMarkers(){}
	hideMarkers(){}
	createBorders(){}
	destroyBorders(){}
	createBorder(i){}
	redrawBorders(){}
	showBorders(){}
	hideBorders(){}
	destroyStretchers(){}
	createStretchers(){}
	createStretcherPopup(index){return null}
	createStretcher(index){return null;}
	showStretchers(){}
	hideStretchers(){}
	addStretcher(position, node){}
	addStretcherPopup(position, node){}
	removeStretcher(index){}
	removeStretcherPopup(index){}
	setStyle(style){}
	pushPoint(coords, index){}
	stretch(){}
	getAdjacentBorders(index){return null;}
}