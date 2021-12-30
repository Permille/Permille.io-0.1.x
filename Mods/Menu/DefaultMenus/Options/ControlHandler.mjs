import Controls from "./Controls.mjs";
export default class ControlHandler{
  constructor(Logic){
    this.Logic = Logic;
    this.Controls = new Controls;
    Application.Main.Game.ControlManager.Controls["OptionsControls"] = this.Controls;


    this.Controls.Events.AddEventListener("ControlDown", function(Event){
      switch(Event.Control){
        case "Exit":{
          this.Logic.Exit();
          break;
        }
        default:{
          return;
        }
      }
    }.bind(this));

  }
}
