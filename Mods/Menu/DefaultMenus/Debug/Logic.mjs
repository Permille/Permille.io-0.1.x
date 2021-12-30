import ICVQ from "../../InterfaceComponentValueQuerier.mjs";
import ICCD from "../../InterfaceComponentChangeDetector.mjs";
import GameControlHandler from "../../../../Controls/GameControlHandler.mjs";

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

      ICCD.Switch(IDocument.getElementById("FlyMode"), function(){
        if(ICVQ.Switch(IDocument.getElementById("FlyMode"))){
          Application.Main.Game.GameControlHandler.MovementPreset = GameControlHandler.MOVEMENT_PRESET_FLYING;
        } else{
          Application.Main.Game.GameControlHandler.MovementPreset = GameControlHandler.MOVEMENT_PRESET_CUSTOM;
        }
      });
    }.bind(this));
  }
}
