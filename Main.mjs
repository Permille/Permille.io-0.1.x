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

setTimeout(function(){Application.Initialise();});

class Application{
  static Version = "0.1.9.3";
  static Build = 55;
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

    this.Main = new Main;
    this.Main.RegisterDependencies();
    this.Debug = new Debug;
  }
}
window.Application = Application; //For debugging purposes.
ModLoadingEngine.Application = Application; //I bet I'll regret this...

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
  RegisterDependencies(){
    this.BlockRegistry = new BlockRegistry();

    this.Renderer = new Renderer;
    this.Game = new Game(this);

    ModLoadingEngine.Events.AddEventListener("PrepareInit", function(){

    }.bind(this));
    ModLoadingEngine.Events.AddEventListener("Finished", function(){
      this.Renderer.InitialiseTextures(this.BlockRegistry);

      this.Renderer.Events.AddEventListener("TextureLoad", function(){
        /*
          While this does mean that the regions won't even generate until the textures are loaded,
          it is unlikely that this will matter in the future, since there will be a loading GUI and
          the world won't be generated immediately after startup, but only when the user wants to.
        */

        this.GeometryDataAdder = new GeometryDataAdder(this.Game.World.Regions, this.Game.World.VirtualRegions, this.Renderer.Scene, this.Renderer.CSM);
        this.Raymarcher = new Raymarcher(this.Game.World, this.Renderer);
        this.MainThreadUnloader = new MainThreadUnloader;

        this.WorkerLoadingPipeline = new Worker(__ScriptPath__ + "/BackgroundTasks/WorkerLoadingPipeline.mjs", {"type": "module"});
        this.WorkerLoadingPipelineHandler = new WorkerLoadingPipelineHandler;

        (Debug.DEBUG_LEVEL <= Debug.DEBUG_LEVELS.INFO) && console.timeEnd("Initialisation");
      }.bind(this));
    }.bind(this));

    ModLoadingEngine.PreInit(); //Starts the entire loading process, in theory
  }
}

class Game{
  constructor(Main){
    this.Main = Main;
    this.World = new World;

    this.ControlManager = new ControlManager;
    this.ControlManager.Controls["GameControls"] = new GameControls;
    this.ControlManager.FocusControl("GameControls");

    this.GamePointerLockHandler = new GamePointerLockHandler(this.Main.Renderer.Renderer.domElement, this.Main.Renderer.Camera);
    this.GameControlHandler = new GameControlHandler(this.ControlManager.Controls["GameControls"], this.Main.Renderer.Camera, this.World, this.Main.BlockRegistry);
  }
}
