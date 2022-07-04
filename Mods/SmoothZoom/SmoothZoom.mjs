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
  static Identifier = "SmoothZoom";
  static Version = "0.0.2";
  static Build = 2;
  static MLE = undefined;

  static Renderer = undefined;
  static World = undefined;
  static CurrentZoom = 1.;

  static States = {
    "Zooming": false,
    "PreferredZoomLevel": 1
  };

  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    Main.Renderer = Application.Main.Renderer;
    Main.World = Application.Main.World;
    const GamePointerLockHandler = Application.Main.Game.GamePointerLockHandler;

    GamePointerLockHandler.PointerLock.AddEventListener("MouseDown", function(Event){
      if(Event.which === 4 && !Main.States.Zooming){
        Main.States.Zooming = true;
        Main.States.PreferredZoomLevel = (Event.buttons & 0b10000) ? 9 : 3;//this.Camera.zoom = (Event.buttons & 0b10000) ? 9 : 3;
      }
    }.bind(this));
    GamePointerLockHandler.PointerLock.AddEventListener("MouseUp", function(Event){
      if(Event.which === 4 && Main.States.Zooming){
        Main.States.Zooming = false;
        Main.States.PreferredZoomLevel = 1;
      }
    }.bind(this));
    GamePointerLockHandler.PointerLock.AddEventListener("PointerLocked", function(State){
      if(State === true){
        Main.States.Zooming = false;
        Main.States.PreferredZoomLevel = 1;
      }
    }.bind(this));

    (function Load(Scope){
      Scope.AnimationFrame();
      Application.Main.Renderer.RequestAnimationFrame(function(){Load(Scope);}.bind(this));
    }.bind(this))(this);

    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }
  static AnimationFrame(){
    let PreferredZoomLevel = Main.States.PreferredZoomLevel;
    Main.CurrentZoom = (Main.CurrentZoom + 0.1 * PreferredZoomLevel) / 1.1;
    Main.Renderer.Camera.fov = Main.Renderer.DefaultFOV / Main.CurrentZoom;

    Main.Renderer.Camera.updateProjectionMatrix();
  }
}
