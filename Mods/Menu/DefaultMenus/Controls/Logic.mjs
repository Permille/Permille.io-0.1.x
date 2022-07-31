import ICVQ from "../../InterfaceComponentValueQuerier.mjs";
import ICCD from "../../InterfaceComponentChangeDetector.mjs";

export default class Logic{
  constructor(BaseMenu, Main){
    this.BaseMenu = BaseMenu;
    this.Main = Main;
    this.Interface = BaseMenu.Interface;


    this.Interface.Element.querySelector(".Exit").addEventListener("click", function(){
      this.BaseMenu.Exit();
    }.bind(this));

    ICCD.Range(this.Interface.Element.querySelector(".-ID-Sensitivity"), function(){
      Application.Main.Game.GamePointerLockHandler.Settings.MouseSensitivity = +ICVQ.Range(this.Interface.Element.querySelector(".-ID-Sensitivity"));
    }.bind(this));

    ICCD.Switch(this.Interface.Element.querySelector(".-ID-InvertY"), function(){
      Application.Main.Game.GamePointerLockHandler.Settings.InvertY = ICVQ.Switch(this.Interface.Element.querySelector(".-ID-InvertY"));
    }.bind(this));

    for(const Control of ["Forwards", "Backwards", "Leftwards", "Rightwards", "Downwards", "Upwards", "BreakBlock", "PlaceBlock", "PickBlock", "Chat"]){
      const Element = this.Interface.Element.querySelector(`.-ID-${Control}`);
      ICCD.Key(Element, function(){
        Application.Main.Game.ControlManager.Controls["GameControls"].Configuration.Set(Control, ICVQ.Key(Element));
      });
    }
  }
}
