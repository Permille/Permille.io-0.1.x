import DefaultControls from "./DefaultControls.mjs";
export default class DefaultControlHandler{
  constructor(ControlsName, BaseMenu){
    this.BaseMenu = BaseMenu;
    this.Controls = new DefaultControls;
    Application.Main.Game.ControlManager.Controls[ControlsName] = this.Controls;


    this.Controls.Events.AddEventListener("ControlDown", function(Event){
      switch(Event.Control){
        case "Exit":{
          this.BaseMenu.Exit();
          break;
        }
        default:{
          return;
        }
      }
    }.bind(this));

  }
}
