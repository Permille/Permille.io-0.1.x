import Listenable from "../Libraries/Listenable/Listenable.mjs";
export default class WorkerLoadingPipelineHandler{
  constructor(){
    this.Events = new Listenable;
    this.SharedPlayerPosition = new Float64Array(new SharedArrayBuffer(3 * 8));

    void function UpdatePlayerPosition(){
      window.requestAnimationFrame(UpdatePlayerPosition.bind(this));
      this.SharedPlayerPosition[0] = Application.Main.Renderer.Camera.position.x;
      this.SharedPlayerPosition[1] = Application.Main.Renderer.Camera.position.y;
      this.SharedPlayerPosition[2] = Application.Main.Renderer.Camera.position.z;
    }.bind(this)();

    Application.Main.WorkerLoadingPipeline.postMessage({
      "Request": "SaveStuff",
      "BlockIDMapping": Application.Main.BlockRegistry.BlockIDMapping,
      "BlockIdentifierMapping": Application.Main.BlockRegistry.BlockIdentifierMapping,
      "AtlasRanges": Application.Main.Renderer.MergedTexture.ranges,
      "AtlasWidth": Application.Main.Renderer.MergedTexture.canvas.width,
      "AtlasHeight": Application.Main.Renderer.MergedTexture.canvas.height,
      "SharedPlayerPosition": this.SharedPlayerPosition,
      "Structures": Application.Main.Structures,
      "VoxelTypes": Application.Main.World.VoxelTypes,
      "Data1": Application.Main.World.Data1,
      "Data8": Application.Main.World.Data8,
      "Data64": Application.Main.World.Data64,
      "AllocationIndex": Application.Main.World.AllocationIndex,
      "AllocationArray": Application.Main.World.AllocationArray,
      "AllocationIndex64": Application.Main.World.AllocationIndex64,
      "AllocationArray64": Application.Main.World.AllocationArray64,
      "Data64Offset": Application.Main.World.Data64Offset,
      "GPUData1": Application.Main.World.GPUData1,
      "GPUData8": Application.Main.World.GPUData8,
      "GPUData64": Application.Main.World.GPUData64,
      "GPUTypes": Application.Main.World.GPUTypes,
      "SegmentAllocation": Application.Main.World.SegmentAllocation
    });

    Application.Main.WorkerLoadingPipeline.addEventListener("message", function(Event){
      const Request = Event.data.Request;
      switch(Request){
        case "UpdatedData64Offset":{
          this.Events.FireEventListeners("UpdatedData64Offset");
          break;
        }
        case "FinishedLoadingBatch":{
          this.Events.FireEventListeners("FinishedLoadingBatch", Event.data.LoadingBatch);
          break;
        }
        default:{
          throw new Error("Handler doesn't exist.");
        }
      }
    }.bind(this));
  }
}
