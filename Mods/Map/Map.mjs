import MapControlHandler from "./MapControlHandler.mjs";
import MapMouseControls from "./MapMouseControls.mjs";
import MapInterface from "./MapInterface.mjs";
import MapOverlay from "./MapOverlay.mjs";

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
  static Identifier = "Map";
  static Version = "0.0.1";
  static Build = 1;
  static MLE = undefined;

  static Renderer = undefined;

  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    new Map;
    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }
}

export class Map{
  constructor(){
    this.MapInterface = new MapInterface;
    this.MapControlHandler = new MapControlHandler(this);
    const IFrame = this.MapInterface.IFrame;

    IFrame.addEventListener("load", function(){
      this.MapMouseControls = new MapMouseControls(IFrame.contentDocument, this.MapInterface, this.MapInterface.MapView);
      this.MapOverlay = MapOverlay(IFrame.contentDocument, this.MapInterface, this.MapInterface.MapView);
    }.bind(this));


    let Callback = function(){
      Application.Main.Game.ControlManager.RegisterIFrame(IFrame);
    }.bind(this);

    IFrame.addEventListener("load", Callback.bind(this));
  }
  Show(){
    Application.Main.Game.ControlManager.FocusControl("MapControls");
    this.MapInterface.Show();
    document.exitPointerLock();
    this.MapInterface.IFrame.contentWindow.focus(); //Important: need to focus iframe window AND the element within it.
    //this.MapInterface.IFrame.contentDocument.getElementById("Input").focus(); //Not needed right now, could use it to automatically switch to panning the map
  }
  Exit(){
    Application.Main.Game.ControlManager.FocusControl("GameControls");
    this.MapInterface.Hide();
    window.focus();
    Application.Main.Game.GamePointerLockHandler.PointerLock.Element.focus();
    Application.Main.Game.GamePointerLockHandler.PointerLock.Element.requestPointerLock();
  }
  Pan(rX, rY){
    this.MapInterface.MapView.Pan(rX, rY);
  }
}
