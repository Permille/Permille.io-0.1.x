export const ModConfig = {
  "MLEBuildSupport":{
    "Earliest": undefined,
    "Target": 1,
    "Latest": undefined
  },
  "Dependencies":[],
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
  static Identifier = "BlockInteraction";
  static Version = "0.0.2";
  static Build = 2;
  static MLE = undefined;

  static States = {
    "RepeatedBreakingIntervalID": null,
    "RepeatedPlacingIntervalID": null,
    "PickedBlock": 1
  };

  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    const World = Application.Main.Game.World;
    const GamePointerLockHandler = Application.Main.Game.GamePointerLockHandler;

    GamePointerLockHandler.PointerLock.AddEventListener("MouseDown", function(Event){
      if(Event.which === 1){ //Left click
        Main.BreakBlock();
        Main.RepeatedBreakingIntervalID = setInterval(function(){
          Main.BreakBlock();
        }.bind(this), 250);
      } else if(Event.which === 3){//Right click
        Main.SetBlock(1);
        Main.RepeatedPlacingIntervalID = setInterval(function(){
          Main.SetBlock(1);
        }.bind(this), 250);
      } else if(Event.which === 2){//Right click
        Main.PickBlock();
      }
    }.bind(this));
    GamePointerLockHandler.PointerLock.AddEventListener("MouseUp", function(Event){
      if(Event.which === 1){ //Left click
        clearInterval(Main.RepeatedBreakingIntervalID);
      } else if(Event.which === 3){//Right click
        clearInterval(Main.RepeatedPlacingIntervalID);
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
      window.requestAnimationFrame(function(){Load(Scope);}.bind(this));
    }.bind(this))(this);

    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }
  static AnimationFrame(){

  }
  static BreakBlock(){
    let RaycastResult = Application.Main.Game.World.Raycast(6);
    if(RaycastResult != null){
      Application.Main.Game.World.SetBlock(RaycastResult.X, RaycastResult.Y, RaycastResult.Z, 0);
    }
  }
  static SetBlock(){
    let RaycastResult = Application.Main.Game.World.Raycast(6);
    if(RaycastResult != null){
      Application.Main.Game.World.SetBlock(RaycastResult.X + RaycastResult.Face[0], RaycastResult.Y + RaycastResult.Face[1], RaycastResult.Z + RaycastResult.Face[2], Main.States.PickedBlock);
    }
  }
  static PickBlock(){
    let RaycastResult = Application.Main.Game.World.Raycast(512, null, null, [0]);
    if(RaycastResult !== null) Main.States.PickedBlock = RaycastResult.BlockType;
  }
}
