import RegionLoader from "./RegionLoader.mjs";
import RegionUnloader from "./RegionUnloader.mjs";
import RRSLoader from "./RRSLoader.mjs";
import REGION_SD from "../RegionSD.mjs";
import BlockRegistry from "../../Block/BlockRegistry.mjs";
import GPURegionDataLoader from "./GPURegionDataLoader.mjs";
import * as SDD from "../../BackgroundTasks/SharedDebugData.mjs";
export default class LoadManager{
  constructor(Data){
    this.MainBlockRegistry = BlockRegistry.Initialise(Data.BlockIDMapping, Data.BlockIdentifierMapping);

    this.RequiredRegionsSelection = new Float64Array(new SharedArrayBuffer(8 * 12 * 33));

    this.SharedDebugData = Data.SharedDebugData;

    this.PlayerPosition = Data.SharedPlayerPosition;
    this.Structures = Data.Structures;

    this.AtlasRanges = Data.AtlasRanges;
    this.AtlasWidth = Data.AtlasWidth;
    this.AtlasHeight = Data.AtlasHeight;

    this.VoxelTypes = Data.VoxelTypes;
    this.Data1 = Data.Data1;
    this.Data8 = Data.Data8;
    this.Data64 = Data.Data64;

    this.Data64Offset = Data.Data64Offset;

    this.AllocationIndex = Data.AllocationIndex;
    this.AllocationArray = Data.AllocationArray;
    this.AllocationIndex64 = Data.AllocationIndex64;
    this.AllocationArray64 = Data.AllocationArray64;

    this.GPUData1 = Data.GPUData1;
    this.GPUData8 = Data.GPUData8;
    this.GPUData64 = Data.GPUData64;

    this.GPUType1 = Data.GPUType1;
    this.GPUInfo8 = Data.GPUInfo8;
    this.GPUInfo64 = Data.GPUInfo64;
    this.GPUBoundingBox1 = Data.GPUBoundingBox1;

    this.LoadStageQueueLengths = Data.LoadStageQueueLengths;


    this.FreeSegments = [];
    for(let i = 0; i < 16384; ++i) this.FreeSegments.push(i);
    self.EventHandler.GetFreeSegments = function(){
      self.postMessage({
        "Request": "GetFreeSegments",
        "Segments": this.FreeSegments.length
      });
    }.bind(this);
    //WARNING: This reference is NOT safe! ONLY INDEX THIS WITH .LoadManager.Data64SegmentAllocations!!!
    this.Data64SegmentAllocations = new Array(8*8*8*8).fill().map(function(){return []});
    this.Data64SegmentIndices = new Uint8Array(8*8*8*8);
    this.FreeGPUData64 = [];
    for(let i = 0; i < 4096; ++i) this.FreeGPUData64.push(i);

    this.RegionLoader = new RegionLoader(this);
    this.GPURegionDataLoader = new GPURegionDataLoader(this);
    //this.RegionUnloader = new RegionUnloader(this);
    this.RRSLoader = new RRSLoader(this);

    void function Load() {
      self.setTimeout(Load.bind(this), 100);
      this.SharedDebugData[SDD.FREE_GPU_SEGMENTS] = this.FreeSegments.length;
      this.SharedDebugData[SDD.MAX_GPU_SEGMENTS] = 16384;
    }.bind(this)();
  }
};
