import TwoWayMap from "../../Libraries/TwoWayMap.mjs";
import KeyboardControlSet from "../../Controls/KeyboardControlSet.mjs";
export default class MapControls extends KeyboardControlSet{
  constructor(){
    super();
    this.Configuration = new TwoWayMap({
      "Exit": "Escape",
      "Up": "ArrowUp",
      "Down": "ArrowDown",
      "Left": "ArrowLeft",
      "Right": "ArrowRight"
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
