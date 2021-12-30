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
      //Detect config change events
    }.bind(this));
  }
}
