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

    for(const Property of ["Speed", "JumpSpeed", "Gravity", "AirDrag", "SurfaceDrag"]){
      ICCD.Range(this.Interface.Element.querySelector(`.-ID-${Property}`), function(){
        let Value = Number.parseFloat(ICVQ.Range(this.Interface.Element.querySelector(`.-ID-${Property}`)));
        if(Number.isNaN(Value)) Value = 0;
        Application.Main.Game.GameControlHandler.CustomMovementSettings[Property] = Value;
      }.bind(this));
    }
  }
}
