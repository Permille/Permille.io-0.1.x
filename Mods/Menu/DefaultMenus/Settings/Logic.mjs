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

    this.Interface.Element.querySelector(".-ID-ApplyViewSettings").querySelector(":scope > div").addEventListener("click", function(){
      Application.Main.WorkerLoadingPipeline.postMessage({
        "Request": "UpdateSettings",
        "LoadDistance": Number.parseInt(ICVQ.Range(this.Interface.Element.querySelector(".-ID-LoadDistance"))),
        "VirtualRegionDepths": Number.parseInt(ICVQ.Range(this.Interface.Element.querySelector(".-ID-VirtualRegionDepths")))
      });
    }.bind(this));
  }
}
