import Utilities from "./Libraries/Utilities/0.7.14.0/Utilities.mjs";
export default class GraphOverlay{
  static Version = "Alpha 0.1.5.1";
  static Build = 29;
  static DefaultProperties = { //The default properties.
    "Position":{
      "X": 0,
      "Y": 0
    },
    "ZIndex": 2500,
    "Colour": "#007fffbf",
    "ColumnWidth": 1,
    "MaxHeight": 1000, //These values will be adjusted automatically if the parent DOM element has smaller dimensions.
    "MaxWidth": 300,
    "ParentElement": document.getElementsByTagName("body")[0], //This must be defined by the user!
    "MaxDataPoints": 300
  };
  constructor(GivenProperties = {}){
    this.Properties = Utilities.MergeObjects(GivenProperties, GraphOverlay.DefaultProperties);

    this.Data = new Array(this.Properties.MaxWidth).fill(0);

    this.CanvasElement = document.createElement("canvas");;

    this.CanvasElement.style.pointerEvents = "none";
    this.CanvasElement.style.position = "absolute";
    this.CanvasElement.style.bottom = "0px";
    this.CanvasElement.style.left = "0px";
    this.CanvasElement.style.overflow = "hidden";
    this.CanvasElement.style.zIndex = "2500";
    this.CanvasElement.width = this.Properties.MaxWidth;
    this.CanvasElement.height = this.Properties.MaxHeight;

    this.Show();

    document.body.appendChild(this.CanvasElement);

    this.NeedsUpdate = false;
    void function Load(){
      Application.Main.Renderer.RequestAnimationFrame(Load.bind(this));
      if(this.NeedsUpdate) this.Update();
    }.bind(this)();
  }
  Hide(){
    this.CanvasElement.style.display = "none";
    this.Hidden = true;
  }
  Show(){
    this.CanvasElement.style.display = "block";
    this.Hidden = false;
  }
  AddItem(Item){
    if(this.Hidden) return;
    this.Data.push(Item);
    if(this.Data.length > this.Properties.MaxWidth) this.Data.shift();
    this.NeedsUpdate = true;
  }
  Update(){
    this.NeedsUpdate = false;
    const Height = window.innerHeight;
    const Ctx = this.CanvasElement.getContext("2d");
    Ctx.clearRect(0, 0, this.Properties.MaxWidth, this.Properties.MaxHeight);
    Ctx.fillStyle = this.Properties.Colour;

    let Max = 100;
    let Min = 0; //Min will stay 0 for now.
    for(let i = 0, Length = this.Data.length; i < Length; i++){
      this.Data[i] ??= 0;
      if(Max < this.Data[i]) Max = this.Data[i];
    }

    for(let i = 0, Length = this.Properties.MaxWidth; i < Length; i++){
      const Data = this.Data[i] ?? 0;
      const FractionOfMax = this.Data[i] / Max;
      const RectangleHeight = FractionOfMax * Height;

      Ctx.fillRect(i, this.Properties.MaxHeight - RectangleHeight, 1, RectangleHeight);
    }
  }
}
