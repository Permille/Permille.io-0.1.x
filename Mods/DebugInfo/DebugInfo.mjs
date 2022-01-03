import GraphOverlay from "./../../GraphOverlay.mjs";
export const ModConfig = {
  "MLEBuildSupport":{
    "Earliest": undefined,
    "Target": 1,
    "Latest": undefined
  },
  "Dependencies":[
    {
      "Identifier": "ImportantMod",
      "MinBuild": 11,
      "MaxBuild": undefined
    }
  ],
  "Stages":{
    "PreInit":{
      "Priority": 127,
      "Requirements":[

      ]
    },
    "Init":{
      "Priority": 127,
      "Requirements":[

      ]
    },
    "PostInit":{
      "Priority": 127,
      "Requirements":[

      ]
    }
  }
};

export class Main{
  static Identifier = "DebugInfo";
  static Version = "0.1.1";
  static Build = 7;
  static MLE = undefined;

  static Renderer = undefined;

  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    Main.Renderer = Application.Main.Renderer;
    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    new PerformanceOverlay().AddInfo([
      function(){
        return "Permille.io " + Application.Version + " [" + Application.Build + "]";
      },
      function(){
        if(typeof process !== "undefined") return "Running on Electron " + process.versions.electron + ", " + "Node " + process.versions.node + ", " + "Chrome " + process.versions.chrome;
        else return navigator.userAgent;
      },
      function(){
        return "";
      },
      function(){
        const Camera = Main.Renderer.Camera;
        return "Position: " + Math.round(Camera.position.x * 1000) / 1000 + " X, " + Math.round(Camera.position.y * 1000) / 1000 + " Y, " + Math.round(Camera.position.z * 1000) / 1000 + " Z";
      }.bind(this),
      function(){
        return "";
      },
      function(){
        return Math.round(1000 / Main.Renderer.RenderTime) + " fps";
      }.bind(this),
      function(){
        const PerformanceInfo = Main.Renderer.Renderer.info;
        return "Geometries: " + PerformanceInfo.memory.geometries + ", Draw calls: " + PerformanceInfo.render.calls;
      }.bind(this),
      function(){
        const PerformanceInfo = Main.Renderer.Renderer.info;
        return "Triangles: " + PerformanceInfo.render.triangles;
      }.bind(this)/*,
      function(){
        const Max = Math.round(Math.max(Application.Main.GeometryDataAdder.TimeLastRegion, Application.Main.GeometryDataAdder.TimeLastVirtualRegion));
        return "Last Update: " + Max + "; RG: " + Math.round(Application.Main.GeometryDataAdder.TimeLastRegion) + ", VG: " + Math.round(Application.Main.GeometryDataAdder.TimeLastVirtualRegion);
      }.bind(this)*/
    ]);
    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }
}

class PerformanceOverlay{
  static Version = "Alpha 0.1.5.2";
  static Build = 29;
  constructor(){
    this.Graph = new GraphOverlay;
    this.ZIndex = 10000;//this.Graph.Properties.ZIndex + 1;
    this.Wrapper = document.createElement("div");
    document.getElementsByTagName("body")[0].appendChild(this.Wrapper);
    this.Wrapper.style.zIndex = this.ZIndex;
    this.Wrapper.style.pointerEvents = "none";
    this.Wrapper.classList.add("DebugInfoOverlayWrapper");
    this.Info = [];
    this.GraphInfo = 1;
    this.UpdateInterval = 1;
    this.Updates = 0;
    this.GraphSource = function(){
      if(this.GraphInfo === 1) return Application.Main.Renderer.RenderTime;
      else if(this.GraphInfo === 2) return Main.Renderer.Composer.renderer.info.render.triangles;
    }.bind(this);

    document.addEventListener("keydown", function(Event){
      if(Event.key === "F3" && !Event.repeat){
        Event.preventDefault();
        if(this.GraphInfo === 0) this.ToggleVisibility();
        if(Event.shiftKey) this.GraphInfo = (this.GraphInfo + 2) % 3;
        else this.GraphInfo = ++this.GraphInfo % 3;
        if(this.GraphInfo === 0) this.ToggleVisibility();
      }
    }.bind(this));
    document.addEventListener("wheel", function(Event){
      if(Application.Main.Game.ControlManager.Controls.GameControls.IsPressed("F3")){
        //Event.preventDefault();

        let rect = Event.target.getBoundingClientRect();
        let X = Event.clientX - rect.left;
        let Y = Event.clientY - rect.top;

        let dX = Event.deltaX;
        let dY = Event.deltaY;

        this.UpdateInterval = Math.max(this.UpdateInterval + Math.sign(dY), 1);
      }
    }.bind(this));
    window.requestAnimationFrame(function(){
      this.Update();
    }.bind(this));
  }
  AddInfo(Functions){
    for(let i = 0, Length = Functions.length; i < Length; i++){

      let TextElement = document.createElement("p");
      this.Wrapper.appendChild(TextElement);
      this.Wrapper.appendChild(document.createElement("br"));

      this.Info.push({"Function": Functions[i], "TextElement": TextElement});
    }
    return this;
  }
  ToggleVisibility(){
    if(this.Wrapper.style.display === "none"){
      this.Wrapper.style.display = "block";
      this.Graph.CanvasElement.style.display = "block";
    }
    else{
      this.Wrapper.style.display = "none";
      this.Graph.CanvasElement.style.display = "none";
    }
    return this;
  }
  Update(){
    window.requestAnimationFrame(function(){
      this.Update();
    }.bind(this));
    if(this.Updates++ % this.UpdateInterval === 0) this.Graph.AddItem(this.GraphSource());

    switch(this.GraphInfo){
      case 1:{
        this.Graph.Properties.Colour = "#007fffbf";
        break;
      }
      case 2:{
        this.Graph.Properties.Colour = "#7fff00bf";
        break;
      }
      case 3:{
        this.Graph.Properties.Colour = "#00ff7fbf";
        break;
      }
    }

    for(let i = 0, Length = this.Info.length; i < Length; i++){
      let Output = "";
      try{
        Output = this.Info[i].Function();
      }
      catch(Error){
        Output = Error.toString();
      }
      this.Info[i].TextElement.innerHTML = Output;
    }
  }
}
