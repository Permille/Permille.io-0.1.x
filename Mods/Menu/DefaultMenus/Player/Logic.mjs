import ICVQ from "../../InterfaceComponentValueQuerier.mjs";
import ICCD from "../../InterfaceComponentChangeDetector.mjs";

export default class Logic{
  constructor(BaseMenu, Main){
    this.BaseMenu = BaseMenu;
    this.Main = Main;
    this.Interface = BaseMenu.Interface;

    this.Interface.Events.AddEventListener("Loaded", function(){
      const IDocument = this.Interface.IFrame.contentDocument;

      IDocument.getElementById("Exit").addEventListener("click", function(){
        this.BaseMenu.Exit();
      }.bind(this));

      for(const Property of ["Speed", "JumpSpeed", "Gravity", "AirDrag", "SurfaceDrag"]){
        ICCD.Range(IDocument.getElementById(Property), function(){
          let Value = Number.parseFloat(ICVQ.Range(IDocument.getElementById(Property)));
          if(Number.isNaN(Value)) Value = 0;
          Application.Main.Game.GameControlHandler.CustomMovementSettings[Property] = Value;
        });
      }
    }.bind(this));
  }
}
