import Listenable from "../Libraries/Listenable/Listenable.mjs";
export default class KeyboardControlSet{
  constructor(){
    this.Events = new Listenable;
    this.DownKeys = [];
    this.Focused = false;
    document.addEventListener("keydown", function(Key){
      this.HandleKeyDown(Key);
    }.bind(this));
    document.addEventListener("keyup", function(Key){
      this.HandleKeyUp(Key);
    }.bind(this));
  }
  HandleKeyDown(Key){
    if(!this.Focused) return;
    this.DownKeys.push(Key.code);
    this.Events.FireEventListeners("KeyDown", {
      "Code": Key.code
    });
  }
  HandleKeyUp(Key){
    if(!this.Focused) return;
    let Index;
    while((Index = this.DownKeys.indexOf(Key.code)) !== -1) this.DownKeys.splice(Index, 1);
    this.Events.FireEventListeners("KeyUp", {
      "Code": Key.code
    });
  }
  IsPressed(KeyCode){
    return this.DownKeys.indexOf(KeyCode) !== -1;
  }
  Focus(){
    this.Focused = true;
    this.Events.FireEventListeners("Focused");
  }
  Unfocus(){
    this.Focused = false;
    while(this.DownKeys.length > 0){
      this.Events.FireEventListeners("KeyUp", {
        "Code": this.DownKeys.pop(),
        "Unfocused": true
      });
    }
    this.Events.FireEventListeners("Unfocused");
  }
}
