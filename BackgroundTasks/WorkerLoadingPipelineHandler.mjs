import {Region, VirtualRegion} from "../World/Region.mjs";
import REGION_SD from "../World/RegionSD.mjs";
export default class WorkerLoadingPipelineHandler{
  constructor(){
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
      "AllocationArray64": Application.Main.World.AllocationArray64
    });

    Application.Main.WorkerLoadingPipeline.addEventListener("message", function(Event){
      const Request = Event.data.Request;

      switch(Request){
        case "ShareRegion": {
          const SharedData = Event.data.Region.SharedData;
          if (SharedData[REGION_SD.UNLOAD_TIME] >= 0) break;

          const SharedRegion = Event.data.Region;
          const Identifier = SharedRegion.RegionX + "," + SharedRegion.RegionY + "," + SharedRegion.RegionZ;
          Application.Main.Game.World.SetRegion(Identifier, SharedRegion);
          //Application.Main.Game.World.Regions[Identifier] = SharedRegion;
          break;
        }
        case "SaveGeometryData":{
          const SharedData = Event.data.SharedData;
          if(SharedData[REGION_SD.UNLOAD_TIME] >= 0) break;

          Application.Main.GeometryDataAdder.AddGeometryData({
            "Transparent": false,
            "Positions": Event.data.Opaque.Positions,
            "Normals": Event.data.Opaque.Normals,
            "Indices": Event.data.Opaque.IndexCount,
            "UVs": Event.data.Opaque.UVs,
            "VertexAOs": Event.data.Opaque.VertexAOs,
            "RegionX": Event.data.RegionX,
            "RegionY": Event.data.RegionY,
            "RegionZ": Event.data.RegionZ,
            "CommonBlock": Event.data.SharedData[REGION_SD.COMMON_BLOCK],
            "IsEntirelySolid": Event.data.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1,
            "TextureMap": Application.Main.Renderer.MergedTexture.mergedTexture
          });
          Application.Main.GeometryDataAdder.AddGeometryData({
            "Transparent": true,
            "Positions": Event.data.Transparent.Positions,
            "Normals": Event.data.Transparent.Normals,
            "Indices": Event.data.Transparent.IndexCount,
            "UVs": Event.data.Transparent.UVs,
            "VertexAOs": Event.data.Transparent.VertexAOs,
            "RegionX": Event.data.RegionX,
            "RegionY": Event.data.RegionY,
            "RegionZ": Event.data.RegionZ,
            "CommonBlock": Event.data.SharedData[REGION_SD.COMMON_BLOCK],
            "IsEntirelySolid": Event.data.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1,
            "TextureMap": Application.Main.Renderer.MergedTexture.mergedTexture
          });
          break;
        }
        case "SaveVirtualSDAndGeometryData":{
          const SharedData = Event.data.SharedData;
          if(SharedData[REGION_SD.UNLOAD_TIME] >= 0) break;

          const Identifier = Event.data.RegionX + "," + Event.data.RegionY + "," + Event.data.RegionZ;
          Application.Main.Game.World.VirtualRegions[Event.data.Depth][Identifier] = {
            "RegionX": Event.data.RegionX,
            "RegionY": Event.data.RegionY,
            "RegionZ": Event.data.RegionZ,
            "Depth": Event.data.Depth,
            "SharedData": Event.data.SharedData,
            "ThreadSafeTime": Event.data.SharedData[REGION_SD.REQUEST_TIME]
          };

          Application.Main.GeometryDataAdder.AddVirtualGeometryData({
            "Transparent": false,
            "Positions": Event.data.Opaque.Positions,
            "Normals": Event.data.Opaque.Normals,
            "Indices": Event.data.Opaque.IndexCount,
            "UVs": Event.data.Opaque.UVs,
            "VertexAOs": Event.data.Opaque.VertexAOs,
            "RegionX": Event.data.RegionX,
            "RegionY": Event.data.RegionY,
            "RegionZ": Event.data.RegionZ,
            "Depth": Event.data.Depth,
            "CommonBlock": Event.data.SharedData[REGION_SD.COMMON_BLOCK],
            "IsEntirelySolid": Event.data.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1,
            "TextureMap": Application.Main.Renderer.MergedTexture.mergedTexture
          });
          Application.Main.GeometryDataAdder.AddVirtualGeometryData({
            "Transparent": true,
            "Positions": Event.data.Transparent.Positions,
            "Normals": Event.data.Transparent.Normals,
            "Indices": Event.data.Transparent.IndexCount,
            "UVs": Event.data.Transparent.UVs,
            "VertexAOs": Event.data.Transparent.VertexAOs,
            "RegionX": Event.data.RegionX,
            "RegionY": Event.data.RegionY,
            "RegionZ": Event.data.RegionZ,
            "Depth": Event.data.Depth,
            "CommonBlock": Event.data.SharedData[REGION_SD.COMMON_BLOCK],
            "IsEntirelySolid": Event.data.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1,
            "TextureMap": Application.Main.Renderer.MergedTexture.mergedTexture
          });
        }
      }
    });
  }
}
