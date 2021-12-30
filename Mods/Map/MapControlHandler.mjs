import MapControls from "./MapControls.mjs";
export default class MapControlHandler{
  constructor(Map){
    this.Map = Map;
    this.MapControls = new MapControls;
    Application.Main.Game.ControlManager.Controls["MapControls"] = this.MapControls;

    //Register hook from GameControls
    const GameControls = Application.Main.Game.ControlManager.Controls["GameControls"];
    GameControls.Configuration.Set("Map", "KeyM");
    GameControls.Events.AddEventListener("ControlDown", function(Event){
      if(Event.Control !== "Map") return;
      this.Map.Show();
    }.bind(this));

    this.ControlHandlers = {
      "Exit": function(){
        this.Map.Exit();
      }.bind(this),
      "Up": function(){
        this.Map.Pan(0, -16);
      }.bind(this),
      "Down": function(){
        this.Map.Pan(0, 16);
      }.bind(this),
      "Left": function(){
        this.Map.Pan(-16, 0);
      }.bind(this),
      "Right": function(){
        this.Map.Pan(16, 0);
      }.bind(this)
    };

    this.MapControls.Events.AddEventListener("ControlDown", function(Event){
      this.ControlHandlers[Event.Control]?.(Event);
    }.bind(this));
  }
}
