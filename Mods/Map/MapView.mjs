import Debug from "../../Debug.mjs";
import * as MapSD from "./MapSharedData.mjs";
import Utilities from "../../Libraries/Utilities/Utilities.mjs";
import {GetHeight, ReSeed} from "../../GetHeight.mjs";
ReSeed(17);
export default class MapView{
  constructor(IDocument, Element){
    this.SharedData = new Float64Array(new SharedArrayBuffer(MapSD.MAP_BUFFER_SIZE));

    this.GetHeight = GetHeight;

    this.XOffset = -1024;
    this.ZOffset = 0;

    this.Peaks = {};

    this.Tiles = {};

    void function UpdateSharedData(){
      self.requestAnimationFrame(UpdateSharedData.bind(this));

      this.SharedData[MapSD.MAP_PLAYER_X] = Application.Main.Renderer.Camera.position.x;
      this.SharedData[MapSD.MAP_PLAYER_Y] = Application.Main.Renderer.Camera.position.y;
      this.SharedData[MapSD.MAP_PLAYER_Z] = Application.Main.Renderer.Camera.position.z;
      this.SharedData[MapSD.MAP_SCALE] = 8;
      const TileSize = this.SharedData[MapSD.MAP_TILE_SIZE] = 512;

      const Width = Element.parentElement.parentElement.clientWidth;
      const Height = Element.parentElement.parentElement.clientHeight;

      const MinX = this.SharedData[MapSD.MAP_VISIBLE_MIN_X] = this.XOffset + 0;
      const MaxX = this.SharedData[MapSD.MAP_VISIBLE_MAX_X] = this.XOffset + Width;
      const MinZ = this.SharedData[MapSD.MAP_VISIBLE_MIN_Z] = this.ZOffset + 0;
      const MaxZ = this.SharedData[MapSD.MAP_VISIBLE_MAX_Z] = this.ZOffset + Height;

      const LoadMinSegmentX = this.SharedData[MapSD.MAP_LOAD_MIN_SEGMENT_X] = Math.floor(MinX / TileSize);
      const LoadMinSegmentZ = this.SharedData[MapSD.MAP_LOAD_MIN_SEGMENT_Z] = Math.floor(MinZ / TileSize);
      const LoadMaxSegmentX = this.SharedData[MapSD.MAP_LOAD_MAX_SEGMENT_X] = Math.ceil(MaxX / TileSize);
      const LoadMaxSegmentZ = this.SharedData[MapSD.MAP_LOAD_MAX_SEGMENT_Z] = Math.ceil(MaxZ / TileSize);

      this.SharedData[MapSD.MAP_PEAK_MIN_SEGMENT_X] = LoadMinSegmentX - 0;
      this.SharedData[MapSD.MAP_PEAK_MIN_SEGMENT_Z] = LoadMinSegmentZ - 0;
      this.SharedData[MapSD.MAP_PEAK_MAX_SEGMENT_X] = LoadMaxSegmentX + 0;
      this.SharedData[MapSD.MAP_PEAK_MAX_SEGMENT_Z] = LoadMaxSegmentZ + 0;
    }.bind(this)();

    this.IDocument = IDocument;

    this.IDocument.documentElement.style.overflow = "hidden";

    this.Element = Element;
    //this.Element.style.width = "100%";
    //this.Element.style.height = "100%";

    this.WorkerHeightCalculator = new Worker("./Mods/Map/WorkerHeightCalculator.mjs", {"type": "module"});

    this.WorkerHeightCalculator.addEventListener("error", function(Error){
      console.warn("[MapView/WorkerHeightCalculator] Generic Error:");
      console.warn(Error);
    });
    this.WorkerHeightCalculator.addEventListener("messageerror", function(Error){
      console.warn("[MapView/WorkerHeightCalculator] Message Error:");
      console.warn(Error);
    });

    this.WorkerHeightCalculator.postMessage({
      "Request": "SharedData",
      "SharedData": this.SharedData
    });

    this.WorkerHeightCalculator.postMessage({
      "Request": "StartLoadLoop"
    }); //Only call this once!

    this.WorkerHeightCalculator.addEventListener("message", function(Event){
      const Method = this[Event.data.Request];
      if(Method) Method.bind(this)(Event);
      else throw new Error("[MapView] Unknown worker request: " + Event.data.Request);
    }.bind(this));

    Application.Main.World.Events.AddEventListener("SeedUpdate", function(Seed){
      for(const Identifier in this.Tiles) this.UnloadTile(Identifier);
      for(const PeakID in this.Peaks) delete this.Peaks[PeakID];

      this.WorkerHeightCalculator.postMessage({
        "Request": "SeedUpdate",
        "Seed": Seed
      });

      //Update own height generator:
      ReSeed(Seed);

      window.setTimeout(function(){
        this.SharedData[MapSD.MAP_NEEDS_TO_BE_DRAWN] = 1;
      }.bind(this), 100); //This needs to be delayed, because otherwise the other thread would paint *before* the new tiles have been initialised, thus rendering the paint ineffective.


    }.bind(this));

    let PreviousElements = [];
    this.IDocument.addEventListener("mousemove", function(Event){
      const Elements = this.IDocument.elementsFromPoint(Event.clientX, Event.clientY);
      for(const Element of PreviousElements){
        if(!Elements.includes(Element)){ //Reset position of elements that are no longer being hovered.
          const PeakInfoElement = Element.parentElement.querySelector(".PeakInfo");
          PeakInfoElement.dataset.top = 0;
          PeakInfoElement.dataset.left = 0;
          PeakInfoElement.classList.add("Moving");
        }
      }
      const ValidElements = [];
      for(const Element of Elements){
        if(!Element.classList.contains("MouseDetector")) continue;
        ValidElements.push(Element);
        //Element.style.backgroundColor = "#0000007f";
        const ElementBoundingRect = Element.getBoundingClientRect();
        const MouseX = Event.clientX - ElementBoundingRect.left - 100;
        const MouseY = Event.clientY - ElementBoundingRect.top - 100;
        const PeakInfoElement = Element.parentElement.querySelector(".PeakInfo");
        PeakInfoElement.classList.add("Moving");

        const Distance = Math.min(Math.sqrt(MouseX ** 2 + MouseY ** 2), 100);

        const PreferredLeft = (-DistanceWeighting(MouseX) - PeakInfoElement.clientWidth / 2) * ((100 - Distance) / 100) ** 0.5;
        const PreferredTop = (-DistanceWeighting(MouseY) - PeakInfoElement.clientHeight / 2) * ((100 - Distance) / 100) ** 0.5;

        PeakInfoElement.dataset.top = PreferredTop;
        PeakInfoElement.dataset.left = PreferredLeft;
      }
      PreviousElements = ValidElements;
    }.bind(this));

    void function Animate(){
      Application.Main.Renderer.RequestAnimationFrame(Animate.bind(this));
      const Elements = this.IDocument.querySelectorAll(".Moving");
      for(const Element of Elements){
        const LineElement = Element.parentElement.querySelector("line");

        const PreferredTop = Number.parseFloat(Element.dataset.top);
        const PreferredLeft = Number.parseFloat(Element.dataset.left);
        const ActualTop = Number.parseFloat(Element.style.top || 0);
        const ActualLeft = Number.parseFloat(Element.style.left || 0);
        const DistanceTop = PreferredTop - ActualTop;
        const DistanceLeft = PreferredLeft - ActualLeft;
        const TopWeighting = DistanceTop / 10;
        const LeftWeighting = DistanceLeft / 10;

        if(Math.abs(DistanceTop) > 0.001) Element.style.top = ActualTop + TopWeighting + "px", Utilities.SetSVGElementProperty(LineElement, "y1", ActualTop + TopWeighting + 100);
        if(Math.abs(DistanceLeft) > 0.001) Element.style.left = ActualLeft + LeftWeighting + "px", Utilities.SetSVGElementProperty(LineElement, "x1", ActualLeft + LeftWeighting + 100);

        //if(DistanceTop < 0.01 && DistanceLeft < 0.01) Element.classList.remove("Moving");
      }
    }.bind(this)();

    void function AddPeaks(){
      window.setTimeout(AddPeaks.bind(this), 100);

      const Scale = this.SharedData[MapSD.MAP_SCALE];

      for(const PeakIdentifier in this.Peaks){
        if(this.IDocument.getElementById("Peak" + PeakIdentifier)) continue; //Peak was already added before.
        const Peak = this.Peaks[PeakIdentifier];

        if(Peak.X < this.SharedData[MapSD.MAP_VISIBLE_MIN_X] || Peak.X > this.SharedData[MapSD.MAP_VISIBLE_MAX_X] ||
           Peak.Z < this.SharedData[MapSD.MAP_VISIBLE_MIN_Z] || Peak.Z > this.SharedData[MapSD.MAP_VISIBLE_MAX_Z]) continue;

        const DivElement = this.IDocument.getElementById("PeakInfoTemplate")?.content.firstElementChild.cloneNode(true);
        if(!DivElement) return;

        DivElement.setAttribute("id", "Peak" + PeakIdentifier);

        const Inaccurate = Peak.HigherX === undefined && Peak.HigherZ === undefined; //Indicates that the floodfill couldn't find a higher peak

        DivElement.querySelector("[data-type='Height']").innerHTML = Math.round(Peak.Height) + " m";
        DivElement.querySelector("[data-type='Prominence']").innerHTML = (Inaccurate ? ">= " : "") + Math.round(Peak.Prominence) + " m";
        DivElement.querySelector("[data-type='Isolation']").innerHTML = (Inaccurate ? ">= " : "") + Math.round(Peak.Isolation * Scale / 10) / 100 + " km";

        DivElement.style.top = (Peak.Z & 511) + "px";
        DivElement.style.left = (Peak.X & 511)  + "px";

        DivElement.style.zIndex = Math.round(Peak.Height) + 1073741824; //Quick overlapping fix

        const PeakInfoElement = DivElement.querySelector(".PeakInfo");

        PeakInfoElement.dataset.top = 0;
        PeakInfoElement.dataset.left = 0;

        //<line x1="0" y1="80" x2="100" y2="20" stroke="black" />

        const MouseDetectorElement = DivElement.querySelector(".MouseDetector");

        const Line = Utilities.CreateSVGElement("line");

        Utilities.SetSVGElementProperty(Line, "x1", "100");
        Utilities.SetSVGElementProperty(Line, "y1", "100"); //Will be updated

        Utilities.SetSVGElementProperty(Line, "x2", "100");
        Utilities.SetSVGElementProperty(Line, "y2", "100");
        Utilities.SetSVGElementProperty(Line, "stroke", "#0000009f");
        Utilities.SetSVGElementProperty(Line, "stroke-width", "3");

        MouseDetectorElement.appendChild(Line);

        const Element = this.IDocument.getElementById("Container" + Math.floor(Peak.X / 512) + "," + Math.floor(Peak.Z / 512));

        if(Element) Element.appendChild(DivElement);

      }
    }.bind(this)();
  }

  Pan(rX, rZ){
    this.XOffset += rX;
    this.ZOffset += rZ;
  }

  UnloadedTile(Event){
    const TileX = Event.data.TileX;
    const TileZ = Event.data.TileZ;
    const Identifier = TileX + "," + TileZ;
    this.UnloadTile(Identifier);
  }

  UnloadTile(Identifier){
    const Tile = this.Tiles[Identifier];
    if(!Tile) return;

    delete this.Tiles[Identifier];

    Tile.Canvas.remove();
    Tile.PeakInfoContainer.remove();
  }

  ShareImageArrays(Event){
    const TileSize = this.SharedData[MapSD.MAP_TILE_SIZE];
    for(const Tile of Event.data.Tiles){

      this.Tiles[Tile.X + "," + Tile.Z] = Tile;

      const Canvas = document.createElement("canvas");
      Canvas.style.position = "absolute";
      Canvas.width = TileSize;
      Canvas.height = TileSize;
      this.Element.appendChild(Canvas);
      Tile.Canvas = Canvas;

      const PeakInfoContainer = document.createElement("div");
      PeakInfoContainer.style.position = "absolute";
      PeakInfoContainer.width = TileSize;
      PeakInfoContainer.height = TileSize;
      PeakInfoContainer.setAttribute("id", "Container" + Tile.X + "," + Tile.Z);
      this.Element.appendChild(PeakInfoContainer);
      Tile.PeakInfoContainer = PeakInfoContainer;




      void function Load(){
        if(this.IDocument.contains(Canvas)) Application.Main.Renderer.RequestAnimationFrame(Load.bind(this));
        else return; //Stop function from calling itself when the canvas element is removed from the DOM.

        Canvas.style.top = Tile.Z * TileSize - this.ZOffset + "px";
        Canvas.style.left = Tile.X * TileSize - this.XOffset + "px";

        PeakInfoContainer.style.top = Tile.Z * TileSize - this.ZOffset + "px";
        PeakInfoContainer.style.left = Tile.X * TileSize - this.XOffset + "px";

        if(Tile.NeedsUpdate[0] === 0) return;
        Tile.NeedsUpdate[0] = 0;
        let CanvasImageData = new ImageData(new Uint8ClampedArray(CopyArrayBuffer(Tile.ImageArray)), this.SharedData[MapSD.MAP_TILE_SIZE], this.SharedData[MapSD.MAP_TILE_SIZE]);
        Canvas.getContext("2d").putImageData(CanvasImageData, 0, 0);
      }.bind(this)();
    }
  }

  SavePeaks(Event){
    for(const Peak of Event.data.Peaks){
      if(this.Peaks[Peak.X + "," + Peak.Z]) continue;

      this.Peaks[Peak.X + "," + Peak.Z] = Peak;

      /*if(Peak.X < this.SharedData[MAP_VISIBLE_MIN_X] || Peak.X > this.SharedData[MAP_VISIBLE_MAX_X] ||
         Peak.Z < this.SharedData[MAP_VISIBLE_MIN_Z] || Peak.Z > this.SharedData[MAP_VISIBLE_MAX_Z]) continue;*/

    }
  }
}

function CopyArrayBuffer(src){
    var dst = new ArrayBuffer(src.byteLength);
    new Uint8Array(dst).set(new Uint8Array(src));
    return dst;
}

function DistanceWeighting(x){
  //return (400 / (Math.sign(x) * (Math.abs(0.1 * x) + 1))) / (4 + Math.abs(0.001 * x * x));
  return ((14 * x) / (1 + (0.0025 * x) ** 2)) / (3 + Math.abs(0.0025 * x ** 2));
}

function GravityWeighting(x){
  return 0.02 * x * x;
}
