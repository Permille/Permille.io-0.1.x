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

      IDocument.getElementById("Reset").querySelector(":scope > div").addEventListener("click", function(){
        //Application.Main.WorkerLoadingPipeline.postMessage({"Request": "SetSeed", "Seed": Number.parseInt(ICVQ.Text(IDocument.getElementById("Seed")))});
        Application.Main.Game.World.SetSeed(Number.parseInt(ICVQ.Text(IDocument.getElementById("Seed"))));
        Application.Main.Game.World.ReloadWorld();
        const Position = Application.Main.Renderer.Camera.position;
        Position.y = Application.Main.Game.World.GetHeight(Position.x, Position.z) + 15; //It takes a little while for the previous world to unload.
      });
    }.bind(this));
  }
}
