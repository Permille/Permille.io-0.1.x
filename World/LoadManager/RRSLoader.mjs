import RRS_SD from "./RequiredRegionsSelectionSD.mjs";
import {Region} from "../Region.mjs";
export default class RRSLoader{
  constructor(LoadManager){
    this.LoadManager = LoadManager;
    this.Regions = LoadManager.Regions;
    this.VirtualRegions = LoadManager.VirtualRegions;
    this.PlayerPosition = LoadManager.PlayerPosition;
    this.RequiredRegionsSelection = LoadManager.RequiredRegionsSelection;

    void function Load(){
      self.setTimeout(Load.bind(this), 25);
      this.UpdateRRS();
      this.LoadRegions();
      this.LoadVirtualRegions();
    }.bind(this)();
  }

  UpdateRRS(){
    const RRS = this.RequiredRegionsSelection;

    const PlayerX = this.PlayerPosition[0];
    const PlayerY = this.PlayerPosition[1];
    const PlayerZ = this.PlayerPosition[2];

    let LastInX1 = 0, LastInX2 = 0;
    let LastInY1 = 0, LastInY2 = 0;
    let LastInZ1 = 0, LastInZ2 = 0;
    //^^This essentially means that the exclusion condition for the first (-1st) depth is never met, which is the desired outcome.

    for(let Depth = -1; Depth < Settings.VirtualRegionDepths; Depth++){
      const RRS_OFFSET = 13 * (Depth + 1);
      const FACTOR = 2 ** (1 + Depth);

      const ThisX = Math.floor(PlayerX / (FACTOR * Region.X_LENGTH));
      const ThisY = Math.floor(PlayerY / (FACTOR * Region.Y_LENGTH));
      const ThisZ = Math.floor(PlayerZ / (FACTOR * Region.Z_LENGTH));

      RRS[RRS_OFFSET + RRS_SD.DEPTH] = Depth;

      RRS[RRS_OFFSET + RRS_SD.IN_X1] = Math.ceil((ThisX - Settings.LoadDistance) / 2) * 2, RRS[RRS_OFFSET + RRS_SD.IN_X2] = Math.ceil((ThisX + Settings.LoadDistance) / 2) * 2;
      RRS[RRS_OFFSET + RRS_SD.IN_Y1] = Math.ceil((ThisY - Settings.LoadDistance) / 2) * 2, RRS[RRS_OFFSET + RRS_SD.IN_Y2] = Math.ceil((ThisY + Settings.LoadDistance) / 2) * 2;
      RRS[RRS_OFFSET + RRS_SD.IN_Z1] = Math.ceil((ThisZ - Settings.LoadDistance) / 2) * 2, RRS[RRS_OFFSET + RRS_SD.IN_Z2] = Math.ceil((ThisZ + Settings.LoadDistance) / 2) * 2;

      RRS[RRS_OFFSET + RRS_SD.EX_X1] = LastInX1 / 2, RRS[RRS_OFFSET + RRS_SD.EX_X2] = LastInX2 / 2;
      RRS[RRS_OFFSET + RRS_SD.EX_Y1] = LastInY1 / 2, RRS[RRS_OFFSET + RRS_SD.EX_Y2] = LastInY2 / 2;
      RRS[RRS_OFFSET + RRS_SD.EX_Z1] = LastInZ1 / 2, RRS[RRS_OFFSET + RRS_SD.EX_Z2] = LastInZ2 / 2;

      LastInX1 = RRS[RRS_OFFSET + RRS_SD.IN_X1], LastInX2 = RRS[RRS_OFFSET + RRS_SD.IN_X2];
      LastInY1 = RRS[RRS_OFFSET + RRS_SD.IN_Y1], LastInY2 = RRS[RRS_OFFSET + RRS_SD.IN_Y2];
      LastInZ1 = RRS[RRS_OFFSET + RRS_SD.IN_Z1], LastInZ2 = RRS[RRS_OFFSET + RRS_SD.IN_Z2];
    }
  }

  LoadRegions(){
    const RRS = this.RequiredRegionsSelection;

    const ThisMinRegionX = RRS[RRS_SD.IN_X1] - 2, ThisMaxRegionX = RRS[RRS_SD.IN_X2] + 2;
    const ThisMinRegionY = RRS[RRS_SD.IN_Y1] - 2, ThisMaxRegionY = RRS[RRS_SD.IN_Y2] + 2;
    const ThisMinRegionZ = RRS[RRS_SD.IN_Z1] - 2, ThisMaxRegionZ = RRS[RRS_SD.IN_Z2] + 2;

    for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
      const IdentifierX = RegionX + ",";
      for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
        const IdentifierXY = IdentifierX + RegionY + ",";
        for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
          const Identifier = IdentifierXY + RegionZ;
          if(this.Regions[Identifier] !== undefined) continue;
          this.Regions[Identifier] = null;
          this.LoadManager.RegionLoader.Stage1(RegionX, RegionY, RegionZ);
        }
      }
    }
  }

  LoadVirtualRegions(){
    const Depths = Settings.VirtualRegionDepths;
    const RRS = this.RequiredRegionsSelection;
    for(let Depth = 0; Depth < Depths; Depth++){
      const RRS_OFFSET = 13 * (Depth + 1);

      const ThisMinRegionX = RRS[RRS_OFFSET + RRS_SD.IN_X1], ThisMaxRegionX = RRS[RRS_OFFSET + RRS_SD.IN_X2];
      const ThisMinRegionY = RRS[RRS_OFFSET + RRS_SD.IN_Y1], ThisMaxRegionY = RRS[RRS_OFFSET + RRS_SD.IN_Y2];
      const ThisMinRegionZ = RRS[RRS_OFFSET + RRS_SD.IN_Z1], ThisMaxRegionZ = RRS[RRS_OFFSET + RRS_SD.IN_Z2];

      const ExclusionX1 = RRS[RRS_OFFSET + RRS_SD.EX_X1], ExclusionX2 = RRS[RRS_OFFSET + RRS_SD.EX_X2];
      const ExclusionY1 = RRS[RRS_OFFSET + RRS_SD.EX_Y1], ExclusionY2 = RRS[RRS_OFFSET + RRS_SD.EX_Y2];
      const ExclusionZ1 = RRS[RRS_OFFSET + RRS_SD.EX_Z1], ExclusionZ2 = RRS[RRS_OFFSET + RRS_SD.EX_Z2];

      const VRDepthObject = this.VirtualRegions[Depth];

      for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
        const IdentifierX = RegionX + ",";
        for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
          const IdentifierXY = IdentifierX + RegionY + ",";
          for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
            const Identifier = IdentifierXY + RegionZ;
            if(ExclusionX1 <= RegionX && ExclusionX2 > RegionX &&
               ExclusionY1 <= RegionY && ExclusionY2 > RegionY &&
               ExclusionZ1 <= RegionZ && ExclusionZ2 > RegionZ){
              continue;
            }
            if(VRDepthObject[Identifier] !== undefined) continue;
            VRDepthObject[Identifier] = null;
            this.LoadManager.RegionLoader.VirtualStage1(RegionX, RegionY, RegionZ, Depth);
          }
        }
      }
    }
  }
}
