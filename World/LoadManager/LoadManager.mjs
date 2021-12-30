import RegionLoader from "./RegionLoader.mjs";
import RegionUnloader from "./RegionUnloader.mjs";
import RRSLoader from "./RRSLoader.mjs";
import REGION_SD from "../RegionSD.mjs";
export default class LoadManager{
  constructor(MainBlockRegistry, AtlasRanges, AtlasWidth, AtlasHeight, SharedPlayerPosition, Structures){
    this.MainBlockRegistry = MainBlockRegistry;

    this.FreeSharedArrayBuffers = {};
    this.RequiredRegionsSelection = new Float64Array(this.GetSharedArrayBuffer(8 * 12 * 33));
    this.Regions = {};
    this.VirtualRegions = new Array(32).fill().map(function(){return {};});
    this.PlayerPosition = SharedPlayerPosition;
    this.Structures = Structures;

    this.AtlasRanges = AtlasRanges;
    this.AtlasWidth = AtlasWidth;
    this.AtlasHeight = AtlasHeight;

    this.RegionLoader = new RegionLoader(this);
    this.RegionUnloader = new RegionUnloader(this);
    this.RRSLoader = new RRSLoader(this);

    //Handler for when the main thread shares regions to this thread (e.g. when a block is broken and region data is created.)
    self.EventHandler.ShareRegionData = function(Data){
      const CurrentRegion = this.Regions[Data.Identifier];
      if(CurrentRegion && !CurrentRegion.RegionData && CurrentRegion.SharedData[REGION_SD.UNLOAD_TIME] < 0){
        CurrentRegion.RegionData = Data.RegionData;
        CurrentRegion.SharedData[REGION_SD.IS_ENTIRELY_SOLID] = 0;
        CurrentRegion.SharedData[REGION_SD.COMMON_BLOCK] = -1;
      }
    }.bind(this);

    let LastCall = self.performance.now();
    void function Load(){
      self.setTimeout(Load.bind(this), 100);
      const TimeNow = self.performance.now();
      this.UnloadArrayBuffers(TimeNow - LastCall);
      LastCall = TimeNow;
    }.bind(this)();
  }
  GetSharedArrayBuffer(Size){
    if(this.FreeSharedArrayBuffers[Size]?.length > 0){
      const SAB = this.FreeSharedArrayBuffers[Size].shift();
      if(this.FreeSharedArrayBuffers[Size] === 0) delete this.FreeSharedArrayBuffers[Size];
      new Uint8Array(SAB).fill(0);
      return SAB;
    } else{
      return new SharedArrayBuffer(Size);
    }
  }
  RecycleSharedArrayBuffer(SAB){
    const Size = SAB.byteLength;
    this.FreeSharedArrayBuffers[Size] ||= [];
    this.FreeSharedArrayBuffers[Size].push(SAB);
  }
  UnloadArrayBuffers(Time){
    const Proportion = 0.15 * Time / 1000; //15% per second.
    for(const Size in this.FreeSharedArrayBuffers){
      const Buffers = this.FreeSharedArrayBuffers[Size];
      const UnloadAmount = Math.ceil(Buffers.length * Proportion);
      for(let i = 0; i < UnloadAmount; i++) Buffers.pop();
    }
  }
};
