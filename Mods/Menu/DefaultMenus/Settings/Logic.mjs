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

      IDocument.getElementById("ApplyViewSettings").querySelector(":scope > div").addEventListener("click", function(){
        Application.Main.WorkerLoadingPipeline.postMessage({
          "Request": "UpdateSettings",
          "LoadDistance": Number.parseInt(ICVQ.Range(IDocument.getElementById("LoadDistance"))),
          "VirtualRegionDepths": Number.parseInt(ICVQ.Range(IDocument.getElementById("VirtualRegionDepths")))
        });
      });
    }.bind(this));
  }
}
