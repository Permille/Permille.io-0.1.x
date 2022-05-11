import Listenable from "../../Libraries/Listenable/Listenable.mjs";
import InspectorView from "./InspectorView.mjs";
import HTMLWindow from "../../Libraries/HTMLWindows/HTMLWindow.mjs";
import DeferredPromise from "../../Libraries/DeferredPromise.mjs";
import SVGGraph from "./SVGGraph.mjs";

export default class InspectorInterface{
  constructor(){
    this.IFrame = document.createElement("iframe");
    this.IFrame.style.position = "absolute";
    this.IFrame.style.display = "none";
    this.IFrame.setAttribute("src", "./Mods/Inspector/index.xhtml");
    document.body.appendChild(this.IFrame);

    this.Events = new Listenable;

    this.Shown = false;

    this.IFrame.addEventListener("load", function(){
      this.Hide();

      const IDocument = this.IFrame.contentDocument;
      this.View = new InspectorView(IDocument, IDocument.getElementById("Main"));
    }.bind(this));

    this.Resize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", function(){
      this.Resize(window.innerWidth, window.innerHeight);
    }.bind(this));

    this.Window = new HTMLWindow({
      "src": "./Mods/Inspector/Interface.html",
      "TitleText": "Inspector"
    });
    this.Window.Hide();

    this.LoadedPromise = new DeferredPromise;

    this.Window.Events.AddEventListener("Loaded", function(Event){
      this.LoadedPromise.resolve();
    }.bind(this));

    void async function(){
      for(const {Name, Colour, HistoryLength, Unit, Generator} of (await import("./DefaultMeasurements.mjs")).default){
        this.AddMeasurement(Name, Colour, HistoryLength, Unit, Generator);
      }
    }.bind(this)();
  }

  async AddMeasurement(Name, Colour, HistoryLength, Unit, Generator){
    await this.LoadedPromise;

    const Graph = new SVGGraph(Name, Colour, HistoryLength, Unit, Generator);

    this.Window.IFrame.contentDocument.querySelector("section.Graphs").appendChild(Graph.Graph);
  }

  Resize(Width, Height){
    this.IFrame.width = Width;
    this.IFrame.height = Height;
    this.Events.FireEventListeners("Resize", {Width, Height});
  }

  Show(){
    this.Shown = true;
    this.IFrame.style.display = "block";
  }
  Hide(){
    this.Shown = false;
    this.IFrame.style.display = "none";
  }
};