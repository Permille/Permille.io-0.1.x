import Listenable from "../Libraries/Listenable/Listenable.mjs";
export default class WorkerLoadingPipelineHandler{
  constructor(){
    this.Events = new Listenable;
    //return;
    this.SharedPlayerPosition = new Float64Array(new SharedArrayBuffer(3 * 8));

    void function UpdatePlayerPosition(){
      Application.Main.Renderer.RequestAnimationFrame(UpdatePlayerPosition.bind(this));
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
      "GPUType1": Application.Main.World.GPUType1,
      "GPUInfo8": Application.Main.World.GPUInfo8,
      "GPUInfo64": Application.Main.World.GPUInfo64,
      "GPUBoundingBox1": Application.Main.World.GPUBoundingBox1,
      "SharedDebugData": Application.Main.SharedDebugData,
      "LoadStageQueueLengths": Application.Main.World.LoadStageQueueLengths
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
          this.Events.FireEventListeners(Request, Event.data);
        }
      }
    }.bind(this));
  }
}
