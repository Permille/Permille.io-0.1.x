import InspectorInterface from "./InspectorInterface.mjs";
import InspectorControlHandler from "./InspectorControlHandler.mjs";

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
  static Identifier = "Inspector";
  static Version = "0.0.1";
  static Build = 1;
  static MLE = undefined;

  static Renderer = undefined;

  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    new Inspector;
    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }
}

export class Inspector{
  constructor(){
    this.Interface = new InspectorInterface;
    this.ControlHandler = new InspectorControlHandler(this);
    const IFrame = this.Interface.Window.IFrame;

    /*IFrame.addEventListener("load", function(){
      this.MapMouseControls = new MapMouseControls(IFrame.contentDocument, this.MapInterface, this.MapInterface.MapView);
    }.bind(this));*/


    let Callback = function(){
      Application.Main.Game.ControlManager.RegisterIFrame(IFrame);
    }.bind(this);

    IFrame.addEventListener("load", Callback.bind(this));
  }
  Show(){
    //Application.Main.Game.ControlManager.FocusControl("InspectorControls");
    this.Interface.Window.Show();
    document.exitPointerLock();
    this.Interface.Window.IFrame.contentWindow.focus(); //Important: need to focus iframe window AND the element within it.
    //this.MapInterface.IFrame.contentDocument.getElementById("Input").focus(); //Not needed right now, could use it to automatically switch to panning the map
  }
  Exit(){
    Application.Main.Game.ControlManager.FocusControl("GameControls");
    this.Interface.Window.Hide();
    window.focus();
    Application.Main.Game.GamePointerLockHandler.PointerLock.Element.focus();
    Application.Main.Game.GamePointerLockHandler.PointerLock.Element.requestPointerLock();
  }
}
