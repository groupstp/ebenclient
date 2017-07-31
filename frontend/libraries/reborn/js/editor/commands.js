window.Command = class Command {

	constructor(receiver, context){
		this.receiver = receiver;
	}
	
	execute(){}

	undo(){}
}

/*
	Команда для работы с геообъектами (абстрактная)
	Все подклассы этой команды в прямом методе выделяют изменяемый объект и переводят его в режим растягивания перед выполнением действия;
	Затем действие выполняется, после чего нужно показать изменённый объект на карте, если изменённая часть не попадает в область обзора;
*/
window.GzmCommand = class GzmCommand extends Command{
	constructor(receiver, context, needsStretching = true, needsSelection = true){
		super(receiver, context);
		this.objectID = context.objectID;
		this.needsStretching = needsStretching;
		this.needsSelection = needsSelection;
	}

	/*
		Выделяет изменяемый объект и переводит его в режим растягивания, если это не сделано
	*/
	prepareObject(){		
		// выделяем объект, если он не выделен
		if (this.needsSelection && !this.receiver.map.staticObjects[this.objectID].isSelected){
			this.receiver.map.selectObject(this.objectID, false);
		}
		// Если объект не в режиме растягивания, перевести его в этот режим
		if (this.needsStretching && !this.receiver.map.staticObjects[this.objectID].isStretching){
			this.receiver.editor.stretchObject(this.objectID);
		}
	}

	/*
		Наводит карту на изменённый объект, если изменённая часть не попадает в область обзора
	*/
	locateMap(location){
		/*
		Как проверить, является ли аргумент экземпляром нативных границ?
		(Если арг является нативной границей И hasFullVisionOn) ИЛИ (арг является массивом И hasVisionOn)
		то позиционируем карту на объект
		*/
		/*if ((location.radius && !this.receiver.map.hasFullVisionOn(location)) || !this.receiver.map.hasVisionOn(location)){
			this.receiver.map.goToObject(this.objectID);
		}*/
		let
			invisiblePoint = (location instanceof Array && !this.receiver.map.hasVisionOn(location)),
			invisibleArea = (this.receiver.map.checkNativeBounds(location) && !this.receiver.map.hasFullVisionOn(location));
		if (invisiblePoint || invisibleArea){ this.receiver.map.goToObject(this.objectID); }
	}

	/* Развыделяет объект и отключает ему растягивание */
	dropObject(){
		// развыделяем объект, если он выделен
		if (this.receiver.map.staticObjects[this.objectID].isSelected){
			this.receiver.map.dropSelection();
		}
		// Если объект в режиме растягивания, отключаем этот режим
		if (this.receiver.map.staticObjects[this.objectID].isStretching){
			this.receiver.map.staticObjects[this.objectID].freeze();
		}
	}
}

/*
	Команда удаления объекта
*/
window.DeleteCommand = class DeleteCommand extends GzmCommand {

	constructor(receiver, context){
		super(receiver, context, false, true);		
		this.imprint = JSON.parse(JSON.stringify(context));		
	}

	execute(){		
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		this.dropObject();
		// стираем объект с карты и из хранилища ГЗМ
		this.receiver.deleteStaticObject(this.objectID);		
	}

	undo(){		
		var self = this;
		// функция, рекурсивно выкладывающая на карту объекты из слепка
		function restoreObject(obj){
			let uuid = self.receiver.confirmedObjects[obj.objectID];
			if (uuid && !obj.uuid){
				obj.uuid = uuid;
			}
			self.receiver.deployObject(obj.className, obj);
			if (obj.children.length > 0){
				for (let i = 0; i < obj.children.length; i++){
					restoreObject(obj.children[i]);
				}
			}
		}
		// возвращаем объект с помощью слепка
		restoreObject(this.imprint)		
		//this.receiver.deployObject(this.imprint.className, this.imprint);
		this.prepareObject();		
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());			
	}
}

/*
	Команда быстрого создания объекта по шаблону
*/
window.QuickCreateCommand = class QuickCreateCommand extends GzmCommand{

	constructor(receiver, context, needsStretching = true, needsSelection = true){
		super(receiver, context, needsStretching, needsSelection);		
		this.imprint = context;
		//this.objectID = this.imprint.objectID;
	}

	execute(){		
		// кладем объект на карту
		this.receiver.deployObject(this.imprint.className, this.imprint);
		this.prepareObject();
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		// отключаем у редактора точкособирательный обработчик
		if (this.receiver.editor.getStatus() !== this.receiver.editor.statuses.idle){
			this.receiver.editor.switchStatus(this.receiver.editor.statuses.idle);
		}
	}

	undo(){
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		this.dropObject();
		// удаляем объект
		this.receiver.deleteStaticObject(this.objectID);
		// отключаем у редактора точкособирательный обработчик
		if (this.receiver.editor.getStatus() !== this.receiver.editor.statuses.idle){
			this.receiver.editor.switchStatus(this.receiver.editor.statuses.idle);
		}
	}
}

/*
	Команда, начинающая поточечное создание объекта
*/
window.CreateCommand = class CreateCommand extends GzmCommand{

	constructor(receiver, context, needsStretching = true, needsSelection = true){
		super(receiver, context, needsStretching, needsSelection);		
		this.imprint = context;		
	}

	execute(){
		// кладем объект на карту
		this.receiver.deployObject(this.imprint.className, this.imprint);
		this.prepareObject();
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		// даем редактору новый обработчик клика по карте, чтобы он мог собирать объект по точкам
		if (this.receiver.editor.getStatus() !== this.receiver.editor.statuses.waitForNext){
			this.receiver.editor.switchStatus(this.receiver.editor.statuses.waitForNext);
		}
	}

	undo(){		
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		this.dropObject();
		// удаляем объект
		this.receiver.deleteStaticObject(this.objectID);
		// отключаем у редактора точкособирательный обработчик
		if (this.receiver.editor.getStatus() !== this.receiver.editor.statuses.idle){
			this.receiver.editor.switchStatus(this.receiver.editor.statuses.idle);
		}
	}
}

/*
	Команда визуального редактирования.
	Помимо перехода на изменяемый объект, этот тип команд переводит карту в тот режим работы, который был активен в момент создания команды.
*/
window.VisualEditCommand = class VisualEditCommand extends GzmCommand{
	constructor(receiver, context, status){
		super(receiver, context);
		this.status = status;
	}

	// переключение статуса
	switchStatus(){
		if (this.receiver.editor.getStatus() !== this.status){
			this.receiver.editor.switchStatus(this.status);
		}
	}
}

/*
	Команда растягивания, передвигающая одну из вершин объекта в новую позицию
*/
window.StretchCommand = class StretchCommand extends VisualEditCommand{

	constructor(receiver, context, status){		
		super(receiver, context, status);		
		this.nodeIndex = context.nodeIndex;
		this.oldCoords = context.oldCoords;
		this.newCoords = context.newCoords;		
	}

	execute(){		
		this.prepareObject();
		// Вызвать метод перетаскивания вершины из старой позиции в новую
		this.receiver.staticObjects[this.objectID].moveNodeTo(this.nodeIndex, this.newCoords);
		this.locateMap(this.newCoords);
		this.switchStatus();
	}

	undo(){		
		this.prepareObject();
		// Вызвать метод перетаскивания вершины из новой позиции в старую
		this.receiver.staticObjects[this.objectID].moveNodeTo(this.nodeIndex, this.oldCoords);
		this.locateMap(this.oldCoords);
		this.switchStatus();	
	}
}

window.ChangeRadiusCommand = class ChangeRadiusCommand extends VisualEditCommand{
	constructor(receiver, context, status){		
		super(receiver, context, status);		
		this.oldRadius = context.oldRadius;
		this.newRadius = context.newRadius;		
	}

	execute(){		
		this.prepareObject();
		// Вызвать метод перетаскивания вершины из старой позиции в новую
		this.receiver.staticObjects[this.objectID].setRadius(this.newRadius);
		this.locateMap(this.newCoords);
		this.switchStatus();
	}

	undo(){		
		this.prepareObject();
		// Вызвать метод перетаскивания вершины из новой позиции в старую
		this.receiver.staticObjects[this.objectID].setRadius(this.oldRadius);
		this.locateMap(this.oldCoords);
		this.switchStatus();	
	}
}

/*
	Команда расщепления границы, добавляющая новую точку в контур объекта
*/
window.SplitBorderCommand = class SplitBorderCommand extends VisualEditCommand{

	constructor(receiver, context, status){		
		super(receiver, context);		
		this.coords = context.coords;
		this.borderIndex = context.borderIndex;
		this.nodeIndex = context.nodeIndex;		
	}

	execute(){
		this.prepareObject();
		// расщепляем границу объекта
		this.receiver.staticObjects[this.objectID].splitBorder(this.borderIndex, this.coords);
		this.locateMap(this.coords);
		this.switchStatus();
	}

	undo(){
		this.prepareObject();
		// удаляем точку из объекта, чтобы схлопнуть 2 границы в 1
		this.receiver.staticObjects[this.objectID].removeNode(this.nodeIndex);
		this.locateMap(this.coords);
		this.switchStatus();
	}
}

/*
	Команда удаления точки из контура
*/
window.RemoveNodeCommand = class RemoveNodeCommand extends VisualEditCommand{

	constructor(receiver, context, status){		
		super(receiver, context);
		this.nodeIndex = context.nodeIndex;
		this.coords = context.coords;
	}

	execute(){
		this.prepareObject();
		// удаляем точку из объекта
		this.receiver.staticObjects[this.objectID].removeNode(this.nodeIndex);
		this.locateMap(this.coords);
		this.switchStatus();
	}

	undo(){
		this.prepareObject();
		// возвращаем точку в объект
		this.receiver.staticObjects[this.objectID].addNode(this.nodeIndex, this.coords);
		this.locateMap(this.coords);
		this.switchStatus();
	}
}

/*
	Команда добавления точки в конец, используется при поточечном создании
*/
window.PushCommand = class PushCommand extends VisualEditCommand{

	constructor(receiver, context, status){
		super(receiver, context);
		this.newCoords = context.newCoords;
	}

	execute(){
		this.prepareObject();
		this.receiver.staticObjects[this.objectID].pushPoint(this.newCoords);
		this.locateMap(this.newCoords);
		this.switchStatus();		
	}

	undo(){
		this.prepareObject();
		this.receiver.staticObjects[this.objectID].removeNode(this.receiver.staticObjects[this.objectID].getLatLngs().length-1);
		this.locateMap(this.newCoords);
		this.switchStatus();		
	}
}



/*
	Команда редактирования невизуальных свойств объекта (плашка)
*/
window.EditCommand = class EditCommand extends VisualEditCommand{

	constructor(receiver, context, status){
		super(receiver, context);
		this.oldProps = context.oldProps;
		this.newProps = context.newProps;
		// растягивание не нужно
		this.needsStretching = false;
	}	

	execute(){
		this.prepareObject();
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		// меняем свойства со старых на новые
		this.receiver.staticObjects[this.objectID].props = this.newProps;
		this.switchStatus();
	}

	undo(){
		this.prepareObject();
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		// меняем свойства с новых на старые
		this.receiver.staticObjects[this.objectID].props = this.oldProps;
		this.switchStatus();
	}
}

/*
	Команда полного переноса объекта
*/
window.TransposeCommand = class TransposeCommand extends VisualEditCommand{

	constructor(receiver, context, status){
		super(receiver, context);
		this.oldCenter = context.oldCenter;
		this.newCenter = context.newCenter;
	}

	execute(){		
		// перетаскиваем объект из старой позиции в новую
		this.receiver.staticObjects[this.objectID].transpose(this.newCenter);
		this.prepareObject();
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		this.switchStatus();
	}

	undo(){		
		// перетаскиваем объект из новой позиции в старую
		this.receiver.staticObjects[this.objectID].transpose(this.oldCenter);
		this.prepareObject();
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		this.switchStatus();
	}
}

window.GroupCommand = class GroupCommand extends GzmCommand{

	constructor(receiver, context){
		super(receiver, context, false, true);		
		this.imprint = context;				
	}
	
	execute(){		
		// кладем объект на карту
		this.receiver.deployObject(this.imprint.className, this.imprint);		
		this.prepareObject();
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());		
		if (this.receiver.editor.getStatus() !== this.receiver.editor.statuses.idle){
			this.receiver.editor.switchStatus(this.receiver.editor.statuses.idle);
		}
	}

	undo(){
		this.locateMap(this.receiver.map.staticObjects[this.objectID].getBounds());
		this.dropObject();
		// расформировываем группу
		this.receiver.disbandGroup(this.imprint.objectID);
		if (this.receiver.editor.getStatus() !== this.receiver.editor.statuses.idle){
			this.receiver.editor.switchStatus(this.receiver.editor.statuses.idle);
		}
		for (var i in this.imprint.children) {
			this.receiver.map.selectObject(this.imprint.children[i], true);
		}
		
	}	
}

window.UngroupCommand = class UngroupCommand extends GzmCommand{

	constructor(receiver, context){
		super(receiver, context, false, true);		
		this.imprint = context;		
	}
	
	execute(){		
		this.locateMap(this.receiver.map.staticObjects[this.imprint.objectID].getBounds());
		this.dropObject();
		// расформировываем группу
		this.receiver.disbandGroup(this.imprint.objectID);
		if (this.receiver.editor.getStatus() !== this.receiver.editor.statuses.idle){
			this.receiver.editor.switchStatus(this.receiver.editor.statuses.idle);
		}
		for (var i in this.imprint.children) {
			this.receiver.map.selectObject(this.imprint.children[i], true);
		}
	}

	undo(){
		// кладем объект на карту
		this.receiver.deployObject(this.imprint.className, this.imprint);		
		this.prepareObject();
		this.locateMap(this.receiver.map.staticObjects[this.imprint.objectID].getBounds());		
		if (this.receiver.editor.getStatus() !== this.receiver.editor.statuses.idle){
			this.receiver.editor.switchStatus(this.receiver.editor.statuses.idle);
		}
	}	
}

/*
	Команда перезаписи контура объекта (переопределение)
*/
/*
class RewriteCommand extends VisualEditCommand{

	constructor(receiver, context){
		super();
		this.oldLatLngs = context.oldLatLngs;
		this.newLatLngs = context.newLatLngs;
	}

	execute(){
		this.receiver.setLatLngs(this.newLatLngs);
	}

	undo(){
		this.receiver.setLatLngs(this.oldLatLngs);
	}
}
*/

/*
	Макрокоманда, позволяющая создавать вложенные структуры из других команд (и макрокоманд)
*/
window.MacroCommand = class MacroCommand extends Command{

	constructor(receiver, context){
		super(receiver, context);
		this.commands = [];
	}

	execute(){		
		this.commands.forEach(function(cmd){
			cmd.execute();
		});
	}

	undo(){		
		this.commands.forEach(function(cmd){
			cmd.undo();
		});
	}

	addCommand(cmd){
		this.commands.push(cmd);
	}
}