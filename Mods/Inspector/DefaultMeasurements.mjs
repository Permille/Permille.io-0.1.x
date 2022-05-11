import DeferredPromise from "../../Libraries/DeferredPromise.mjs";
import * as SDD from "../../BackgroundTasks/SharedDebugData.mjs";

export default [
  {
    "Name": "FPS",
    "Colour": "#663399",
    "HistoryLength": 5000.,
    "Unit": " fps",
    "Generator": function(){
      let Sum = 0.;
      let Count = 0.;
      let Yielded = false;
      void function Update(){
        window.requestAnimationFrame(Update);
        if(Yielded){
          Yielded = false;
          Count = 0.;
          Sum = 0.;
        }
        Count++;
        Sum += Application.Main.Renderer.RenderTime;
      }();
      return async function*(){
        while(true){
          yield 1000. * Count / Sum;
          Yielded = true;
        }
      }();
    }()
  },
  {
    "Name": "Lowest FPS",
    "Colour": "#0fcf3f",
    "HistoryLength": 15000.,
    "Unit": " fps",
    "Generator": function(){
      let Slowest = -Infinity;
      let Yielded = false;
      void function Update(){
        window.requestAnimationFrame(Update);
        if(Yielded){
          Yielded = false;
          Slowest = -Infinity;
        }
        Slowest = Math.max(Slowest, Application.Main.Renderer.RenderTime);
      }();
      return async function*(){
        while(true){
          await new DeferredPromise({"Timeout": 100., "Throw": false});
          yield 1000. / Slowest;
          Yielded = true;
        }
      }();
    }()
  },
  {
    "Name": "Data8 utilization",
    "Colour": "#00afff",
    "HistoryLength": 30000.,
    "Unit": "%",
    "Generator": async function*(){
      const AllocationIndex = Application.Main.World.AllocationIndex;
      const Size8 = Application.Main.World.AllocationArray.length;
      while(true){
        await new DeferredPromise({"Timeout": 100., "Throw": false});
        yield ((AllocationIndex[0] - AllocationIndex[1]) & (Size8 - 1)) / Size8 * 100.;
      }
    }()
  },
  {
    "Name": "Data64 utilization",
    "Colour": "#0d4fd4",
    "HistoryLength": 30000.,
    "Unit": "%",
    "Generator": async function*(){
      const AllocationIndex = Application.Main.World.AllocationIndex64;
      while(true){
        await new DeferredPromise({"Timeout": 100., "Throw": false});
        yield ((AllocationIndex[0] - AllocationIndex[1]) & (4096 - 1)) / 4096 * 100.;
      }
    }()
  },
  {
    "Name": "Free GPU segments",
    "Colour": "#9ae019",
    "HistoryLength": 30000.,
    "Unit": " segments",
    "Generator": async function*(){
      while(true){
        await new DeferredPromise({"Timeout": 100., "Throw": false});
        yield Application.Main.SharedDebugData[SDD.FREE_GPU_SEGMENTS];
      }
    }()
  }
];