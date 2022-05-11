import InspectorControls from "./InspectorControls.mjs";

export default class InspectorControlHandler{
  constructor(Main){
    this.Main = Main;
    this.Controls = new InspectorControls;
    Application.Main.Game.ControlManager.Controls["InspectorControls"] = this.Controls;

    //Register hook from GameControls
    const GameControls = Application.Main.Game.ControlManager.Controls["GameControls"];
    GameControls.Configuration.Set("Inspector", "F10");
    GameControls.Events.AddEventListener("ControlDown", function(Event){
      if(Event.Control !== "Inspector") return;
      this.Main.Show();
    }.bind(this));

    this.ControlHandlers = {
      "Exit": function(){
        this.Main.Exit();
      }.bind(this)
    };

    this.Controls.Events.AddEventListener("ControlDown", function(Event){
      this.ControlHandlers[Event.Control]?.(Event);
    }.bind(this));
  }
};