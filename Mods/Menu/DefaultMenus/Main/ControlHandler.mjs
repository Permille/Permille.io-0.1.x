import Controls from "./Controls.mjs";
export default class ControlHandler{
  constructor(Logic){
    this.Logic = Logic;
    this.Controls = new Controls;
    Application.Main.Game.ControlManager.Controls["MainMenuControls"] = this.Controls;


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


    //Register hook from GameControls
    const GameControls = Application.Main.Game.ControlManager.Controls["GameControls"];
    GameControls.Configuration.Set("Pause", "Escape");
    GameControls.Events.AddEventListener("ControlDown", function(Event){
      if(Event.Control !== "Pause") return;
      this.Logic.Show();
    }.bind(this));


  }
}
