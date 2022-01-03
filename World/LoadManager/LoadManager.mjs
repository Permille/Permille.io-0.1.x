import RegionLoader from "./RegionLoader.mjs";
import RegionUnloader from "./RegionUnloader.mjs";
import RRSLoader from "./RRSLoader.mjs";
import REGION_SD from "../RegionSD.mjs";
import BlockRegistry from "../../Block/BlockRegistry.mjs";
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

    this.AllocationIndex = Data.AllocationIndex;
    this.AllocationArray = Data.AllocationArray;
    this.AllocationIndex64 = Data.AllocationIndex64;
    this.AllocationArray64 = Data.AllocationArray64;

    this.RegionLoader = new RegionLoader(this);
    this.RegionUnloader = new RegionUnloader(this);
    this.RRSLoader = new RRSLoader(this);

    //Handler for when the main thread shares regions to this thread (e.g. when a block is broken and region data is created.)
    self.EventHandler.ShareRegionData = function(Data){
      throw new Error("Region data sharing has not been implemented!!");
      /*
      const CurrentRegion = this.Regions[Data.Identifier];
      if(CurrentRegion && !CurrentRegion.RegionData && CurrentRegion.SharedData[REGION_SD.UNLOAD_TIME] < 0){
        CurrentRegion.RegionData = Data.RegionData;
        CurrentRegion.SharedData[REGION_SD.IS_ENTIRELY_SOLID] = 0;
        CurrentRegion.SharedData[REGION_SD.COMMON_BLOCK] = -1;
      }*/
    }.bind(this);
  }
};
