import RegionLoader from "./RegionLoader.mjs";
import RegionUnloader from "./RegionUnloader.mjs";
import RRSLoader from "./RRSLoader.mjs";
import REGION_SD from "../RegionSD.mjs";
import BlockRegistry from "../../Block/BlockRegistry.mjs";
import GPURegionDataLoader from "./GPURegionDataLoader.mjs";
export default class LoadManager{
  constructor(Data){
    this.MainBlockRegistry = BlockRegistry.Initialise(Data.BlockIDMapping, Data.BlockIdentifierMapping);

    this.RequiredRegionsSelection = new Float64Array(new SharedArrayBuffer(8 * 12 * 33));

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
    this.GPUTypes = Data.GPUTypes;
    this.SegmentAllocation = Data.SegmentAllocation;
    this.FreeSegments = [];
    for(let i = 0, Length = this.SegmentAllocation.length; i < Length; ++i) this.FreeSegments.push(i);
    //WARNING: This reference is NOT safe! ONLY INDEX THIS WITH .LoadManager.Data64SegmentAllocations!!!
    this.Data64SegmentAllocations = new Array(8*8*8*8).fill().map(function(){return []});
    this.Data64SegmentIndices = new Uint8Array(8*8*8*8);
    this.FreeGPUData64 = [];
    for(let i = 0; i < 512; ++i) this.FreeGPUData64.push(i);

    this.RegionLoader = new RegionLoader(this);
    this.GPURegionDataLoader = new GPURegionDataLoader(this);
    //this.RegionUnloader = new RegionUnloader(this);
    this.RRSLoader = new RRSLoader(this);
  }
};
