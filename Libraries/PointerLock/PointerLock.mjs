import Listenable from "../Listenable/Listenable.mjs";
export default class PointerLock extends Listenable{
  static Version = "0.2";
  static Build = 19;
  constructor(Element){
    super();
    this.Element = Element;
    this.PointerLocked = false;
  }
  Register(){
    this.Element.requestPointerLock = this.Element.requestPointerLock || this.Element.mozRequestPointerLock;
    this.Element.exitPointerLock = this.Element.exitPointerLock || this.Element.mozExitRequestPointerLock;
    this.Element.addEventListener("click", function(){
      this.Element.requestPointerLock();
    }.bind(this));

    document.addEventListener("pointerlockchange", function(){this.UpdateLockStatus();}.bind(this), !1);
    document.addEventListener("mozpointerlockchange", function(){this.UpdateLockStatus();}.bind(this), !1);

    document.addEventListener("mousemove", function(Event){
      if(this.PointerLocked) this.FireEventListeners("MouseMove", Event);
    }.bind(this));
    document.addEventListener("click", function(Event){
      if(this.PointerLocked) this.FireEventListeners("Click", Event);
    }.bind(this));
    document.addEventListener("mousedown", function(Event){
      if(this.PointerLocked) this.FireEventListeners("MouseDown", Event);
    }.bind(this));
    document.addEventListener("mouseup", function(Event){
      if(this.PointerLocked) this.FireEventListeners("MouseUp", Event);
    }.bind(this));
    document.addEventListener("wheel", function(Event){
      if(this.PointerLocked) this.FireEventListeners("Wheel", Event);
    }.bind(this));
    return this;
  }
  UpdateLockStatus(Event){
    if(document.pointerLockElement === this.Element || document.mozPointerLockElement === this.Element){
      this.PointerLocked = !0;
      this.FireEventListeners("PointerLocked", true);
    } else{
      this.PointerLocked = !1;
      this.FireEventListeners("PointerLocked", false);
    }
  }
}
