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

      let LastChange = 0;
      ICCD.Options(IDocument.getElementById("Language"), function(){
        if(window.performance.now() - 25 < LastChange) return;
        LastChange = window.performance.now();
        let Value = ICVQ.Options(IDocument.getElementById("Language"));
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
    }.bind(this));
  }
}
