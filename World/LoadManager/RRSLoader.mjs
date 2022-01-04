import RRS_SD from "./RequiredRegionsSelectionSD.mjs";
import {Region} from "../Region.mjs";
export default class RRSLoader{
  constructor(LoadManager){
    this.LoadManager = LoadManager;
    this.Regions = LoadManager.Regions;
    this.VirtualRegions = LoadManager.VirtualRegions;
    this.Data64Offset = LoadManager.Data64Offset;
    this.PlayerPosition = LoadManager.PlayerPosition;
    this.Data64 = LoadManager.Data64;

    void function Load(){ //THIS WILL ONLY RUN ONCE!!!!
      //self.setTimeout(Load.bind(this), 25);
      //this.UpdateRRS();
      this.UpdateData64Offset();
      this.LoadRegions();
      //this.LoadVirtualRegions();
    }.bind(this)();
  }

  UpdateData64Offset(){ //This is kinda messy but it works
    const PlayerX = -16;//this.PlayerPosition[0];
    const PlayerY = 0;//this.PlayerPosition[1];
    const PlayerZ = 0;//this.PlayerPosition[2];

    let Changed = false;

    const NewData64Offset = new Int32Array(24);

    for(let Depth = 0; Depth < 8; ++Depth){
      const Size = 64 << Depth;
      //TODO: I'll need to use a different method of moving the center (like the original RRS), but this works for now...
      const ScaledX = Math.floor(PlayerX / Size);
      const ScaledY = Math.floor(PlayerY / Size);
      const ScaledZ = Math.floor(PlayerZ / Size);

      if(ScaledX - this.Data64Offset[Depth * 3 + 0] !== 0) Changed = true;
      if(ScaledY - this.Data64Offset[Depth * 3 + 1] !== 0) Changed = true;
      if(ScaledZ - this.Data64Offset[Depth * 3 + 2] !== 0) Changed = true;

      NewData64Offset[Depth * 3 + 0] = ScaledX;
      NewData64Offset[Depth * 3 + 1] = ScaledY;
      NewData64Offset[Depth * 3 + 2] = ScaledZ;
    }
    if(!Changed) return;

    //Shift references of Data64:
    const NewData64 = new Uint16Array(8*8*8*8).fill(0x8000); //Sets it to be empty (and unloaded)
    for(let Depth = 0; Depth < 8; ++Depth){
      const ChangeX = NewData64Offset[Depth * 3 + 0] - this.Data64Offset[Depth * 3 + 0];
      const ChangeY = NewData64Offset[Depth * 3 + 1] - this.Data64Offset[Depth * 3 + 1];
      const ChangeZ = NewData64Offset[Depth * 3 + 2] - this.Data64Offset[Depth * 3 + 2];

      for(let rx64 = 0; rx64 < 8; rx64++){
        const tx64 = rx64 + ChangeX;
        if(tx64 < 0 || tx64 >= 8) continue;
        for(let ry64 = 0; ry64 < 8; ry64++){
          const ty64 = ry64 + ChangeY;
          if(ty64 < 0 || ty64 >= 8) continue;
          for(let rz64 = 0; rz64 < 8; rz64++){
            const tz64 = rz64 + ChangeZ;
            if(tz64 < 0 || tz64 >= 8) continue;
            NewData64[(Depth << 9) | (rx64 << 6) | (ry64 << 3) | rz64] = this.Data64[(Depth << 9) | (tx64 << 6) | (ty64 << 3) | tz64];
          }
        }
      }
    }

    //Set changes
    //TODO: I'll probably need to make a mutex lock for this to make it thread-safe, although .set is quite fast
    this.Data64Offset.set(NewData64Offset, 0);
    this.Data64.set(NewData64, 0);

    self.postMessage({
      "Request": "UpdatedData64Offset"
    });
  }

  /*UpdateRRS(){
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
  }*/

  LoadRegions(){
    for(let rx64 = 0; rx64 < 8; rx64++) for(let ry64 = 0; ry64 < 8; ry64++) for(let rz64 = 0; rz64 < 8; rz64++){
      const Index = (rx64 << 6) | (ry64 << 3) | rz64;
      const State = this.Data64[Index] >> 12;
      if((State & 0b0111) === 0b0000){ //This means that it's not started loading.
        this.Data64[Index] = (this.Data64[Index] & ~(0b0111 << 12)) | (0b0001 << 12); //Set state to 0bX001 (Started loading)
        const RegionX = rx64 + this.Data64Offset[0]; //TODO: The -4 is to center it, not sure if this will work for VRs!!!
        const RegionY = ry64 + this.Data64Offset[1];
        const RegionZ = rz64 + this.Data64Offset[2];

        this.LoadManager.RegionLoader.Stage1(RegionX, RegionY, RegionZ);
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
