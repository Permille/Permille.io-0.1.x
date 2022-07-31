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

    let LastChange = 0;
    ICCD.Options(this.Interface.Element.querySelector(".-ID-Language"), function(){
      if(window.performance.now() - 25 < LastChange) return;
      LastChange = window.performance.now();
      let Value = ICVQ.Options(this.Interface.Element.querySelector(".-ID-Language"));
      switch(Value){
        case "Language:English":{
          this.Main.SetLang("en-uk");
          break;
        }
        case "Language:Deutsch":{
          this.Main.SetLang("de-de");
          break;
        }
        case "Language:Српски":{
          this.Main.SetLang("sr-rs");
          break;
        }
      }
    }.bind(this));
  }
}
