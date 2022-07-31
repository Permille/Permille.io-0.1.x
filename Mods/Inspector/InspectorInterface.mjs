import Listenable from "../../Libraries/Listenable/Listenable.mjs";
import InspectorView from "./InspectorView.mjs";
import HTMLWindow from "../../Libraries/HTMLWindows/HTMLWindow.mjs";
import DeferredPromise from "../../Libraries/DeferredPromise.mjs";
import SVGGraph from "./SVGGraph.mjs";

import DefaultMeasurements from "./DefaultMeasurements.mjs";

import InterfaceHTML from "./Interface.html";

import Style from "!!css-loader!./style.css";
import Fonts from "!!css-loader!../../IncludeEscape.css";


export default class InspectorInterface{
  constructor(){

    this.Events = new Listenable;

    this.Shown = false;


    this.Resize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", function(){
      this.Resize(window.innerWidth, window.innerHeight);
    }.bind(this));

    this.Window = new HTMLWindow({
      "TitleText": "Inspector"
    });
    this.Window.IFrame.srcdoc = InterfaceHTML;
    this.Window.Hide();

    this.LoadedPromise = new DeferredPromise;

    this.Window.Events.AddEventListener("Loaded", function(Event){
      this.LoadedPromise.resolve();
      const StyleElement = this.Window.IFrame.contentDocument.createElement("style");
      StyleElement.innerText = Style[0][1];
      this.Window.IFrame.contentDocument.body.appendChild(StyleElement);


      const StyleElement2 = this.Window.IFrame.contentDocument.createElement("style");
      StyleElement2.innerText = Fonts[0][1];
      this.Window.IFrame.contentDocument.body.appendChild(StyleElement2);
    }.bind(this));

    void async function(){
      for(const {Name, Colour, HistoryLength, Unit, Generator} of DefaultMeasurements()){
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
    this.Events.FireEventListeners("Resize", {Width, Height});
  }

  Show(){
    this.Shown = true;
  }
  Hide(){
    this.Shown = false;
  }
};