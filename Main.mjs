import Renderer from "./Graphics/Renderer/Renderer.mjs";
import World from "./World/World.mjs";
import ModLoadingEngine from "./ModLoader/ModLoadingEngine.mjs";
import GameControlHandler from "./Controls/GameControlHandler.mjs";
import GameControls from "./Controls/GameControls.mjs";
import GamePointerLockHandler from "./Controls/GamePointerLockHandler.mjs";
import ControlManager from "./Controls/ControlManager.mjs";
import BlockRegistry from "./Block/BlockRegistry.mjs";
import WorkerLoadingPipelineHandler from "./BackgroundTasks/WorkerLoadingPipelineHandler.mjs";
import Raymarcher from "./Graphics/Renderer/Raymarcher.mjs";
import Debug from "./Debug.mjs";
import DeferredPromise from "./Libraries/DeferredPromise.mjs";


import "./Default.css";
import "./DebugInfoOverlayWrapper.css";
import "./IncludeEscape.css";
import "./Scrollbars.css";

import Spruce01 from "./Structures/bo3/Spruce01.BO3";
import Spruce02 from "./Structures/bo3/Spruce02.BO3";
import Spruce03 from "./Structures/bo3/Spruce03.BO3";
import Spruce04 from "./Structures/bo3/Spruce04.BO3";
import Spruce05 from "./Structures/bo3/Spruce05.BO3";
import Spruce06 from "./Structures/bo3/Spruce06.BO3";
import Spruce07 from "./Structures/bo3/Spruce07.BO3";

setTimeout(function(){Application.Initialise();});

class Application{
  static Version = "0.1.12";
  static Build = 60;
  static Variation = 0;
  static Revision = 0;

  static Initialise(){

    this.Main = new Main;
    this.Main.RegisterDependencies();
    //this.Debug = new Debug;
  }
}
window.Application = Application;
ModLoadingEngine.Application = Application;

class Main{
  constructor(){
    document.getElementById("LoadingFilesMessage").remove();
    this.SharedDebugData = new Float64Array(new SharedArrayBuffer(8192));
    this.Structures = [
      /*{
        "FilePath": "./Structures/bo3/Oak03.bo3",
        "Offset": {
          "X": -2,
          "Y": 0,
          "Z": -2
        },
        "Frequency": 5
      },
      {
        "FilePath": "./Structures/bo3/Oak02.bo3",
        "Offset": {
          "X": 0,
          "Y": 0,
          "Z": 0
        },
        "Frequency": 9
      },
      {
        "FilePath": "./Structures/bo3/Oak01.bo3",
        "Offset": {
          "X": 0,
          "Y": 0,
          "Z": -1
        },
        "Frequency": 6
      },*/
      {
        "FilePath": Spruce01,
        "Offset": {"X": 0, "Y": 0, "Z": 0},
        "Frequency": 9
      },
      {
        "FilePath": Spruce02,
        "Offset": {"X": 0, "Y": 0, "Z": 0},
        "Frequency": 9
      },
      {
        "FilePath": Spruce03,
        "Offset": {"X": 0, "Y": 0, "Z": 0},
        "Frequency": 9
      },
      {
        "FilePath": Spruce04,
        "Offset": {"X": 0, "Y": 0, "Z": 0},
        "Frequency": 9
      },
      {
        "FilePath": Spruce05,
        "Offset": {"X": 0, "Y": 0, "Z": 0},
        "Frequency": 9
      },
      {
        "FilePath": Spruce06,
        "Offset": {"X": 0, "Y": 0, "Z": 0},
        "Frequency": 9
      },
      {
        "FilePath": Spruce07,
        "Offset": {"X": 0, "Y": 0, "Z": 0},
        "Frequency": 9
      }
    ];
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

    this.WorkerLoadingPipeline = new Worker(new URL("./BackgroundTasks/WorkerLoadingPipeline.mjs", import.meta.url));
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
