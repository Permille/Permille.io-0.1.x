import RRS_SD from "./RequiredRegionsSelectionSD.mjs";
import {Region} from "../Region.mjs";
import * as DataManager from "./DataManager.mjs";
import DeferredPromise from "../../Libraries/DeferredPromise.mjs";
import Listenable from "../../Libraries/Listenable/Listenable.mjs";
export default class RRSLoader{
  constructor(LoadManager){
    this.Events = new Listenable;
    this.LoadManager = LoadManager;
    this.Regions = LoadManager.Regions;
    this.VirtualRegions = LoadManager.VirtualRegions;
    this.Data64Offset = LoadManager.Data64Offset;
    this.PlayerPosition = LoadManager.PlayerPosition;
    this.Data8 = LoadManager.Data8;
    this.Data64 = LoadManager.Data64;
    this.GPUData8 = LoadManager.GPUData8;
    this.GPUData64 = LoadManager.GPUData64;
    this.AllocationIndex = LoadManager.AllocationIndex;
    this.AllocationArray = LoadManager.AllocationArray;
    this.AllocationIndex64 = LoadManager.AllocationIndex64;
    this.AllocationArray64 = LoadManager.AllocationArray64;

    this.LoadingBatch = 0;

    self.EventHandler["FinishedGPUDataTransfer"] = function(){
      this.Events.FireEventListeners("FinishedGPUDataTransfer");
    }.bind(this);

    void async function Load(){
      this.UpdateData64Offset();

      const CurrentBatch = this.LoadRegions();

      if(CurrentBatch !== -1){ //-1 means that no regions were requested because everything was already loaded.
        const FinishedBatchPromise = new DeferredPromise({"Timeout": 2000});
        this.LoadManager.RegionLoader.Events.AddEventListener("FinishedLoadingBatch", function (FinishedBatch){
          if(CurrentBatch === FinishedBatch) FinishedBatchPromise.resolve();
        });
        console.time();
        try{
          await FinishedBatchPromise;
        } catch(e){
          console.warn("Batch generation took longer than 2000ms: while this might be due to a stalled thread, everything is probably still okay.");
        }
        console.timeEnd();
      }

      //return;//############################
      self.setTimeout(Load.bind(this), 25);
    }.bind(this)();
  }

  DeallocateGPUData8(GPULocation64, x8, y8, z8){
    const Index8 = (GPULocation64 << 9) | (x8 << 6) | (y8 << 3) | z8;
    const Location8 = this.GPUData8[Index8];
    //if(Location8 & (1 << 31)) return;
    this.GPUData8[Index8] = 0x80000000;
  }

  DeallocateGPUData64(GPULocation64, x64, y64, z64){
    const Index64 = (x64 << 6) | (y64 << 3) | z64;
    while(this.LoadManager.Data64SegmentAllocations[Index64].length > 0){
      this.LoadManager.FreeSegments.push(this.LoadManager.Data64SegmentAllocations[Index64].pop());
    }
    this.LoadManager.FreeGPUData64.push(GPULocation64);
    //if(this.GPUData64[Index64] & 0x8000) return;
    this.GPUData64[Index64] = 0x8000;
  }

  UpdateData64Offset(){ //This is kinda messy but it works
    const PlayerX = this.PlayerPosition[0];
    const PlayerY = 0;//this.PlayerPosition[1];
    const PlayerZ = this.PlayerPosition[2];

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
    //if(!Changed) return; //#######################

    //Shift references of Data64:
    const NewData64 = new Uint16Array(8*8*8*8).fill(0x8000); //Sets it to be empty (and unloaded)
    const NewGPUData64 = new Uint16Array(8*8*8*8).fill(0x8000);
    const NewData64SegmentAllocations = new Array(8*8*8*8).fill(null); //nulls will later be replaced with empty arrays
    const NewData64SegmentIndices = new Uint8Array(8*8*8*8);

    const DeallocateData8 = DataManager.DeallocateData8Init(this.Data8, this.AllocationIndex, this.AllocationArray);
    const DeallocateData64 = DataManager.DeallocateData64Init(this.Data64, this.AllocationIndex64, this.AllocationArray64, this.Data64Offset);

    for(let Depth = 0; Depth < 8; ++Depth){
      const ChangeX = NewData64Offset[Depth * 3 + 0] - this.Data64Offset[Depth * 3 + 0];
      const ChangeY = NewData64Offset[Depth * 3 + 1] - this.Data64Offset[Depth * 3 + 1];
      const ChangeZ = NewData64Offset[Depth * 3 + 2] - this.Data64Offset[Depth * 3 + 2];

      for(let rx64 = 0; rx64 < 8; rx64++){
        const tx64 = rx64 - ChangeX;
        for(let ry64 = 0; ry64 < 8; ry64++){
          const ty64 = ry64 - ChangeY;
          for(let rz64 = 0; rz64 < 8; rz64++){
            const tz64 = rz64 - ChangeZ;
            if(tx64 < 0 || tx64 >= 8 || ty64 < 0 || ty64 >= 8 || tz64 < 0 || tz64 >= 8){
              //if(Depth !== 0) continue;
              const Index64 = (Depth << 9) | (rx64 << 6) | (ry64 << 3) | rz64;
              const Info64 = this.Data64[Index64];
              const GPUInfo64 = this.GPUData64[Index64];
              if((Info64 & 0x8000) === 0){ //Data64 actually exists so it can be unloaded
                const Location64 = Info64 & 0x0fff;
                //Free Data8 references
                for(let i = 0; i < 512; ++i){
                  DeallocateData8(Location64, i >> 6, (i >> 3) & 7, i & 7);
                }
                DeallocateData64(Location64, rx64, ry64, rz64); //Free Data64 reference
                //The Data1 and VoxelData references shouldn't matter, as they will probably get overwritten upon reallocation.
              }
              if((GPUInfo64 & 0x8000) === 0){ //GPUData64 actually exists so it can be unloaded
                const GPULocation64 = this.GPUData64[Index64] & 0x0fff;
                for(let i = 0; i < 512; ++i){
                  this.DeallocateGPUData8(GPULocation64, i >> 6, (i >> 3) & 7, i & 7);
                }
                this.DeallocateGPUData64(GPULocation64, rx64, ry64, rz64); //Also handles segment deallocation
              }
            } else{ //Move Data64 references
              const TIndex64 = (Depth << 9) | (tx64 << 6) | (ty64 << 3) | tz64;
              const RIndex64 = (Depth << 9) | (rx64 << 6) | (ry64 << 3) | rz64;
              NewData64[TIndex64] = this.Data64[RIndex64];
              NewGPUData64[TIndex64] = this.GPUData64[RIndex64];
              NewData64SegmentAllocations[TIndex64] = this.LoadManager.Data64SegmentAllocations[RIndex64];
              NewData64SegmentIndices[TIndex64] = this.LoadManager.Data64SegmentIndices[RIndex64];
            }
          }
        }
      }
    }

    //Set changes
    //TODO: I'll probably need to make a mutex lock for this to make it thread-safe, although .set is quite fast
    this.Data64Offset.set(NewData64Offset, 0);
    this.Data64.set(NewData64, 0);
    this.GPUData64.set(NewGPUData64, 0);

    for(let i = 0, Length = NewData64SegmentAllocations.length; i < Length; ++i) if(NewData64SegmentAllocations[i] === null) NewData64SegmentAllocations[i] = [];
    this.LoadManager.Data64SegmentAllocations = NewData64SegmentAllocations;
    this.LoadManager.Data64SegmentIndices.set(NewData64SegmentIndices);

    self.postMessage({
      "Request": "UpdatedData64Offset"
    });
  }

  LoadRegions(){
    const RequestedRegions = [];
    for(let rx64 = 0; rx64 < 8; rx64++) for(let ry64 = 0; ry64 < 8; ry64++) for(let rz64 = 0; rz64 < 8; rz64++){
      const Index = (rx64 << 6) | (ry64 << 3) | rz64;
      const State = this.Data64[Index] >> 12;
      if((State & 0b0011) === 0b0000){ //This means that it's not started loading.
        this.Data64[Index] = (this.Data64[Index] & ~(0b0011 << 12)) | (0b0001 << 12); //Set state to 0bXX01 (Started loading)
        const RegionX = rx64 + this.Data64Offset[0];
        const RegionY = ry64 + this.Data64Offset[1];
        const RegionZ = rz64 + this.Data64Offset[2];
        RequestedRegions.push({RegionX, RegionY, RegionZ});
      }
    }
    for(const {RegionX, RegionY, RegionZ} of RequestedRegions){
      this.LoadManager.RegionLoader.Stage1(RegionX, RegionY, RegionZ, this.LoadingBatch, RequestedRegions.length);
      //I need to pass the batch size (last parameter) so that I know when the batch has finished loading.
    }
    if(RequestedRegions.length > 0) return this.LoadingBatch++;
    else return -1;
  }
};