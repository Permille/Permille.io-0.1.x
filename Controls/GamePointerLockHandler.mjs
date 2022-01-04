import PointerLock from "../Libraries/PointerLock/PointerLock.mjs";
export default class GamePointerLockHandler{
  constructor(Element, Camera){
    this.PointerLock = new PointerLock(Element).Register();
    this.Settings = {
      "MouseSensitivity": 0.002,
      "InvertY": true
    };
    this.Camera = Camera;
    this.PointerLock.AddEventListener("MouseMove", function(Event){
  		this.Camera.rotation.y += Event.movementX * this.Settings.MouseSensitivity;
  		this.Camera.rotation.x += Event.movementY * this.Settings.MouseSensitivity * (!this.Settings.InvertY * 2 - 1);
  		this.Camera.rotation.x = Math.max(Math.PI / -2, Math.min(Math.PI / 2, this.Camera.rotation.x));
    }.bind(this));
  }
}
