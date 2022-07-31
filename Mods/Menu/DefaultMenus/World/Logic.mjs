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

    this.Interface.Element.querySelector(".-ID-Reset").querySelector(":scope > div").addEventListener("click", function(){
      //Application.Main.WorkerLoadingPipeline.postMessage({"Request": "SetSeed", "Seed": Number.parseInt(ICVQ.Text(this.Interface.Element.querySelector(".-ID-Seed")))});
      Application.Main.Game.World.SetSeed(Number.parseInt(ICVQ.Text(this.Interface.Element.querySelector(".-ID-Seed"))));
      Application.Main.Game.World.ReloadWorld();
      const Position = Application.Main.Renderer.Camera.position;
      Position.y = Application.Main.Game.World.GetHeight(Position.x, Position.z) + 15; //It takes a little while for the previous world to unload.
    }.bind(this));

    ICCD.Range(this.Interface.Element.querySelector(".-ID-MaxUpdatingSegments"), function(){
      Application.Main.Raymarcher.MaxUpdatingSegments = Number.parseInt(ICVQ.Range(this.Interface.Element.querySelector(".-ID-MaxUpdatingSegments")));
    }.bind(this));
  }
}
