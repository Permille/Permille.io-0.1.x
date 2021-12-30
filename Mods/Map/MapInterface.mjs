import Listenable from "../../Libraries/Listenable/Listenable.mjs";
import MapView from "./MapView.mjs";
import * as MapSD from "./MapSharedData.mjs";

export default class MapInterface{
  constructor(){
    this.IFrame = document.createElement("iframe");
    this.IFrame.style.position = "absolute";
    //this.IFrame.sandbox = "";
    this.IFrame.setAttribute("src", "./Mods/Map/index.xhtml");
    document.body.appendChild(this.IFrame);

    this.Events = new Listenable;


    this.MapView = null;
    this.Maximised = false;
    this.IFrame.style.display = "block";

    this.IFrame.addEventListener("load", function(){
      this.Hide(); //This will show the small map.

      const IDocument = this.IFrame.contentDocument;
      this.MapView = new MapView(IDocument, IDocument.getElementById("MapView"));

      const MapWrapperElement = IDocument.getElementById("MapWrapper");

      void function UpdateMapScroll(){
        window.requestAnimationFrame(UpdateMapScroll.bind(this));
        if(this.Maximised) return;

        const Width = MapWrapperElement.clientWidth;
        const Height = MapWrapperElement.clientHeight;

        const Position = Application.Main.Renderer.Camera.position;

        this.MapView.XOffset = Math.round(Position.x / 8 - Width / 2);
        this.MapView.ZOffset = Math.round(Position.z / 8 - Height / 2);
      }.bind(this)();

    }.bind(this));

    this.Resize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", function(){
      this.Resize(window.innerWidth, window.innerHeight);
    }.bind(this));
  }
  Resize(Width, Height){
    this.IFrame.width = Width;
    this.IFrame.height = Height;
    this.Events.FireEventListeners("Resize", {Width, Height});
  }

  Show(){
    this.Maximised = true;
    this.IFrame.style.pointerEvents = "auto";
    this.IFrame.style.display = "block";
    const MapWrapper = this.IFrame.contentDocument.getElementById("MapWrapper");
    MapWrapper.classList.remove("Small");
    MapWrapper.classList.add("Big");

    if(this.MapView) window.setTimeout(function(){
      this.MapView.SharedData[MapSD.MAP_NEEDS_TO_BE_DRAWN] = 1;
    }.bind(this), 100); //This needs to be delayed, because otherwise the other thread would paint *before* the new tiles have been initialised, thus rendering the paint ineffective.
  }
  Hide(){ //This will only minimise the map. Another animation loop (in the constructor) is checking whether the map should be shown.
    //this.IFrame.style.display = "none";
    this.Maximised = false;
    this.IFrame.style.pointerEvents = "none";
    const MapWrapper = this.IFrame.contentDocument.getElementById("MapWrapper");
    MapWrapper.classList.remove("Big");
    MapWrapper.classList.add("Small");

    if(this.MapView) window.setTimeout(function(){
      this.MapView.SharedData[MapSD.MAP_NEEDS_TO_BE_DRAWN] = 1;
    }.bind(this), 100); //This needs to be delayed, because otherwise the other thread would paint *before* the new tiles have been initialised, thus rendering the paint ineffective.
  }
}
