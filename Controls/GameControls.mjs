import TwoWayMap from "../Libraries/TwoWayMap.mjs";
import KeyboardControlSet from "./KeyboardControlSet.mjs";
export default class GameControls extends KeyboardControlSet{
  constructor(){
    super();
    this.Configuration = new TwoWayMap({
      "Forwards": "KeyW",
      "Backwards": "KeyS",
      "Leftwards": "KeyA",
      "Rightwards": "KeyD",
      "Upwards": "Space",
      "Downwards": "ShiftLeft",
      "Sprint": "KeyQ"
    });
    this.Events.AddEventListener("KeyDown", function(Event){
      const Control = this.Configuration.ReverseGet(Event.Code);
      if(Control !== undefined) this.Events.FireEventListeners("ControlDown", {
        "Control": Control
      });
    }.bind(this));
    this.Events.AddEventListener("KeyUp", function(Event){
      const Control = this.Configuration.ReverseGet(Event.Code);
      if(Control !== undefined) this.Events.FireEventListeners("ControlUp", {
        "Control": Control
      });
    }.bind(this));
  }
  IsControlPressed(Name){
    return this.IsPressed(this.Configuration.Get(Name));
  }
}
