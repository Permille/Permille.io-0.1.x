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
        return navigator.userAgent;
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
        let Count = 0;
        void function UpdateCount(){
          Application.Main.Renderer.RequestAnimationFrame(UpdateCount);
          Count++;
        }();

        let LastCount = 0;
        let Frames = 0;
        void function UpdateFrames(){
          window.setTimeout(UpdateFrames, 1000);
          Frames = Count - LastCount;
          LastCount = Count;
        }();

        return function(){
          return `${Frames} fps (${Math.round(100 * Main.Renderer.RenderTime) / 100.} ms)`;
        };
      }(),
      function(){
        return `Resolution: ${window.innerWidth} * ${window.innerHeight}`;
      },
      function(){
        const PerformanceInfo = Main.Renderer.Renderer.info;
        return "Geometries: " + PerformanceInfo.memory.geometries + ", Draw calls: " + PerformanceInfo.render.calls;
      }.bind(this),
      function(){
        const PerformanceInfo = Main.Renderer.Renderer.info;
        return "Triangles: " + PerformanceInfo.render.triangles;
      }.bind(this),
      function(){
        const AllocationIndex = Application.Main.World.AllocationIndex;
        const AllocationIndex64 = Application.Main.World.AllocationIndex64;
        const Size8 = Application.Main.World.AllocationArray.length;
        const Size64 = 4096;
        const Utilisation = ((AllocationIndex[0] - AllocationIndex[1]) & (Size8 - 1)) / Size8;
        const Utilisation64 = ((AllocationIndex64[0] - AllocationIndex64[1]) & (Size64 - 1)) / Size64;
        return `Buffer utilisation: 8: ${Math.round(Utilisation * 1e5) / 1e3}%, 64: ${Math.round(Utilisation64 * 1e5) / 1e3}%`;
      }, function(){
        const AllocationIndex = Application.Main.World.AllocationIndex;
        let LastUtilisation = -1;
        let Time = 0;
        return function(){
          if(LastUtilisation !== (LastUtilisation = AllocationIndex[0] - AllocationIndex[1])) Time = window.performance.now();
          return `Last update: ${Math.round(Time)}`;
        }
      }(), function(){
        const Index = Application.Main.World.AllocationIndex;
        const Index64 = Application.Main.World.AllocationIndex64;
        return `Allocation Indices: 8: ${Index[0]} - ${Index[1]}; 64: ${Index64[0]} - ${Index64[1]}`;
      }
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
    this.LastTextUpdate = 0;
    this.TextUpdateInterval = 40;
    this.GraphSource = function(){
      if(this.GraphInfo === 1) return Application.Main.Renderer.RenderTime;
    }.bind(this);

    document.addEventListener("keydown", function(Event){
      if(Event.key === "F3" && !Event.repeat){
        Event.preventDefault();
        this.GraphInfo = (this.GraphInfo + 1) % 3;
        if(this.GraphInfo === 0) this.Hide();
        if(this.GraphInfo === 1) this.Show();
        if(this.GraphInfo === 2) this.Graph.Hide();
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
    Application.Main.Renderer.RequestAnimationFrame(function(){
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
  Hide(){
    this.Wrapper.style.display = "none";
    this.Graph.Hide();
    return this;
  }
  Show(){
    this.Wrapper.style.display = "block";
    this.Graph.Show();
    return this;
  }
  Update(){
    Application.Main.Renderer.RequestAnimationFrame(function(){
      this.Update();
    }.bind(this));
    if(this.Updates++ % this.UpdateInterval === 0) this.Graph.AddItem(this.GraphSource());

    const Now = window.performance.now();
    if(this.LastTextUpdate > Now - this.TextUpdateInterval) return;
    this.LastTextUpdate = Now;

    /*switch(this.GraphInfo){
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
    }*/

    for(let i = 0, Length = this.Info.length; i < Length; i++){
      let Output = "";
      try{
        Output = this.Info[i].Function();
      }
      catch(Error){
        Output = Error.toString();
      }
      this.Info[i].TextElement.textContent = Output;
    }
  }
}
