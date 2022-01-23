import Renderer from "./Graphics/Renderer/Renderer.mjs";
import GeometryDataAdder from "./Graphics/Renderer/GeometryDataAdder.mjs";
import {Region, VirtualRegion} from "./World/Region.mjs";
import World from "./World/World.mjs";
import ModLoadingEngine from "./ModLoader/ModLoadingEngine.mjs";
import GameControlHandler from "./Controls/GameControlHandler.mjs";
import GameControls from "./Controls/GameControls.mjs";
import GamePointerLockHandler from "./Controls/GamePointerLockHandler.mjs";
import ControlManager from "./Controls/ControlManager.mjs";
import BlockRegistry from "./Block/BlockRegistry.mjs";
import WorkerLoadingPipelineHandler from "./BackgroundTasks/WorkerLoadingPipelineHandler.mjs";
import REGION_SD from "./World/RegionSD.mjs";
import MainThreadUnloader from "./World/MainThreadUnloader.mjs";
import Raymarcher from "./Graphics/Renderer/Raymarcher.mjs";
import Debug from "./Debug.mjs";
import DeferredPromise from "./Libraries/DeferredPromise.mjs";

setTimeout(function(){Application.Initialise();});

class Application{
  static Version = "0.1.10";
  static Build = 56;
  static Variation = 0;
  static Revision = 0;

  static Initialise(){
    window.performance.now = (function(){ //Reset timer so file loading times aren't counted.
      window.performance.later = window.performance.now;
      const Start = window.performance.now();
      return function(){
        return window.performance.later() - Start;
      };
    })();

    let PriorityAnimationFrames = [];
    window.requestPriorityAnimationFrame = function(Function){
      PriorityAnimationFrames.push(Function);
    };
    void function Load(){
      window.requestAnimationFrame(Load);
      const Pending = PriorityAnimationFrames;
      PriorityAnimationFrames = []; //This is so that new animation frames that are added aren't iterated forever.
      while(Pending.length > 0) Pending.pop()();
    }();

    this.Main = new Main;
    this.Main.RegisterDependencies();
    this.Debug = new Debug;
  }
}
window.Application = Application;
ModLoadingEngine.Application = Application;

class Main{
  constructor(){
    document.getElementById("LoadingFilesMessage").remove();
    this.Structures = [{
      "FilePath": "./Structures/bo3/Oak03.bo3",
      "Offset": {
        "X": -2,
        "Y": 0,
        "Z": -2
      },
      "Frequency": 20
    },
    {
      "FilePath": "./Structures/bo3/Oak02.bo3",
      "Offset": {
        "X": 0,
        "Y": 0,
        "Z": 0
      },
      "Frequency": 40
    },
    {
      "FilePath": "./Structures/bo3/Oak01.bo3",
      "Offset": {
        "X": 0,
        "Y": 0,
        "Z": -1
      },
      "Frequency": 30
    }];
    (Debug.DEBUG_LEVEL <= Debug.DEBUG_LEVELS.INFO) && console.time("Initialisation");
  }
  async RegisterDependencies(){
    this.BlockRegistry = new BlockRegistry();

    this.Renderer = new Renderer;
    this.World = new World;
    this.Game = new Game(this);


    const MLEPromise = new DeferredPromise;
    const RendererPromise = new DeferredPromise;

    ModLoadingEngine.Events.AddEventListener("Finished", function(){MLEPromise.resolve();});
    this.Renderer.Events.AddEventListener("TextureLoad", function(){RendererPromise.resolve();});

    ModLoadingEngine.PreInit();
    await MLEPromise;

    this.Renderer.InitialiseTextures(this.BlockRegistry);
    await RendererPromise;

    this.WorkerLoadingPipeline = new Worker(__ScriptPath__ + "/BackgroundTasks/WorkerLoadingPipeline.mjs", {"type": "module"});
    this.WorkerLoadingPipelineHandler = new WorkerLoadingPipelineHandler;

    this.Raymarcher = new Raymarcher(this.World, this.Renderer);

    (Debug.DEBUG_LEVEL <= Debug.DEBUG_LEVELS.INFO) && console.timeEnd("Initialisation");
  }
}

class Game{
  constructor(){
    this.ControlManager = new ControlManager;
    this.ControlManager.Controls["GameControls"] = new GameControls;
    this.ControlManager.FocusControl("GameControls");

    this.GamePointerLockHandler = new GamePointerLockHandler(Application.Main.Renderer.Renderer.domElement, Application.Main.Renderer.Camera);
    this.GameControlHandler = new GameControlHandler(this.ControlManager.Controls["GameControls"], Application.Main.Renderer.Camera, Application.Main.World, Application.Main.BlockRegistry);
  }
}
