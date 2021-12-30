import REGION_SD from "../RegionSD.mjs";
import RRS_SD from "./RequiredRegionsSelectionSD.mjs";
export default class RegionUnloader{
  constructor(LoadManager){
    this.LoadManager = LoadManager;
    this.Regions = LoadManager.Regions;
    this.VirtualRegions = LoadManager.VirtualRegions;
    this.HeightMaps = LoadManager.RegionLoader.HeightMaps;

    void function Load(){
      self.setTimeout(Load.bind(this), 100);
      const AllowedHeightMaps = new Set;

      this.UnloadRegions(AllowedHeightMaps);
      this.UnloadVirtualRegions(AllowedHeightMaps);

      for(const Identifier in this.HeightMaps){
        if(AllowedHeightMaps.has(Identifier)) continue;
        delete this.HeightMaps[Identifier];
      }
    }.bind(this)();
  }
  UnloadRegions(AllowedHeightMaps){
    const RRS = this.LoadManager.RequiredRegionsSelection;

    const ThisMinRegionX = RRS[RRS_SD.IN_X1] - 2, ThisMaxRegionX = RRS[RRS_SD.IN_X2] + 2;
    const ThisMinRegionY = RRS[RRS_SD.IN_Y1] - 2, ThisMaxRegionY = RRS[RRS_SD.IN_Y2] + 2;
    const ThisMinRegionZ = RRS[RRS_SD.IN_Z1] - 2, ThisMaxRegionZ = RRS[RRS_SD.IN_Z2] + 2;

    const AllowedRegions = new Set;

    for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
      for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
        const VerticalIdentifier = RegionX + "," + RegionZ;
        AllowedHeightMaps.add(VerticalIdentifier);
        for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
          const Identifier = RegionX + "," + RegionY + "," + RegionZ;
          AllowedRegions.add(Identifier);
        }
      }
    }

    for(const Identifier in this.LoadManager.Regions){ //vv The region hasn't generated its heightmap yet, so it doesn't have SharedData.
      if(AllowedRegions.has(Identifier) || this.Regions[Identifier] === null) continue;
      this.Regions[Identifier].SharedData[REGION_SD.UNLOAD_TIME] = self.performance.now();
      delete this.Regions[Identifier];
    }
  }
  UnloadVirtualRegions(AllowedHeightMaps){
    const RRS = this.LoadManager.RequiredRegionsSelection;

    for(const DepthID in this.VirtualRegions){
      const Depth = Number.parseInt(DepthID); //Make sure it's an int.
      const VRDepthObject = this.VirtualRegions[Depth];
      const RRS_OFFSET = 13 * (Depth + 1);
      const FACTOR = 2 ** (1 + Depth);

      const AllowedVirtualRegions = new Set;

      const ThisMinRegionX = RRS[RRS_OFFSET + RRS_SD.IN_X1], ThisMaxRegionX = RRS[RRS_OFFSET + RRS_SD.IN_X2];
      const ThisMinRegionY = RRS[RRS_OFFSET + RRS_SD.IN_Y1], ThisMaxRegionY = RRS[RRS_OFFSET + RRS_SD.IN_Y2];
      const ThisMinRegionZ = RRS[RRS_OFFSET + RRS_SD.IN_Z1], ThisMaxRegionZ = RRS[RRS_OFFSET + RRS_SD.IN_Z2];

      const ExclusionX1 = RRS[RRS_OFFSET + RRS_SD.EX_X1], ExclusionX2 = RRS[RRS_OFFSET + RRS_SD.EX_X2];
      const ExclusionY1 = RRS[RRS_OFFSET + RRS_SD.EX_Y1], ExclusionY2 = RRS[RRS_OFFSET + RRS_SD.EX_Y2];
      const ExclusionZ1 = RRS[RRS_OFFSET + RRS_SD.EX_Z1], ExclusionZ2 = RRS[RRS_OFFSET + RRS_SD.EX_Z2];

      if(true/*Depth <= Settings.VirtualRegionDepths*/){ //Only allow valid depths. This would clear depths which were recently made obsolete by lowering the depth count.
        for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
          for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
            //Heightmaps
            if(!(ExclusionX1 <= RegionX && ExclusionX2 > RegionX &&
                 ExclusionZ1 <= RegionZ && ExclusionZ2 > RegionZ)){
              const VerticalIdentifier = RegionX + "," + RegionZ + "," + Depth;
              AllowedHeightMaps.add(VerticalIdentifier);
            }
            //Regions
            for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
              if(ExclusionX1 <= RegionX && ExclusionX2 > RegionX &&
                 ExclusionY1 <= RegionY && ExclusionY2 > RegionY &&
                 ExclusionZ1 <= RegionZ && ExclusionZ2 > RegionZ){
                continue;
              }
              const Identifier = RegionX + "," + RegionY + "," + RegionZ;
              AllowedVirtualRegions.add(Identifier);
            }
          }
        }
      }

      for(const Identifier in VRDepthObject){
        if(AllowedVirtualRegions.has(Identifier)) continue;
        if(VRDepthObject[Identifier] !== null) VRDepthObject[Identifier].SharedData[REGION_SD.UNLOAD_TIME] = self.performance.now();
        delete VRDepthObject[Identifier];
      }
    }
  }
};
