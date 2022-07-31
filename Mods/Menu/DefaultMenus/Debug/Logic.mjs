import ICVQ from "../../InterfaceComponentValueQuerier.mjs";
import ICCD from "../../InterfaceComponentChangeDetector.mjs";
import GameControlHandler from "../../../../Controls/GameControlHandler.mjs";

export default class Logic{
  constructor(BaseMenu, Main){
    this.BaseMenu = BaseMenu;
    this.Main = Main;
    this.Interface = BaseMenu.Interface;


    this.Interface.Element.querySelector(".Exit").addEventListener("click", function(){
      this.BaseMenu.Exit();
    }.bind(this));
    ICCD.Switch(this.Interface.Element.querySelector(".-ID-FlyMode"), function(){
      if(ICVQ.Switch(this.Interface.Element.querySelector(".-ID-FlyMode"))){
        Application.Main.Game.GameControlHandler.MovementPreset = GameControlHandler.MOVEMENT_PRESET_FLYING;
      } else{
        Application.Main.Game.GameControlHandler.MovementPreset = GameControlHandler.MOVEMENT_PRESET_CUSTOM;
      }
    }.bind(this));
  }
}
