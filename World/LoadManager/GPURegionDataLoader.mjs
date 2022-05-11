let a = 0;
let b = new Set;
void function Load(){
  self.setTimeout(Load, 1000);
  console.log("a: " + a);
  console.log("b: " + b.size);
}();
export default class GPURegionDataLoader{
  constructor(LoadManager){
    this.LoadManager = LoadManager;

    void function Load(){
      self.setTimeout(Load.bind(this), 75);
      this.UpdateGPUData();
    }.bind(this)();
  }
  AllocateSegment(Index64){
    const SegmentLocation = this.LoadManager.FreeSegments.pop();
    if(SegmentLocation === undefined) throw new Error("Ran out of segments!!");
    this.LoadManager.Data64SegmentAllocations[Index64].push(SegmentLocation);
    return SegmentLocation;
  }
  AllocateGPUData64(Index64){
    const Location64 = this.LoadManager.FreeGPUData64.pop();
    if(Location64 === undefined) throw new Error("Ran out of GPU Data64!!");
    this.LoadManager.GPUData64[Index64] = Location64;
    return Location64;
  }
  UpdateGPUData(){
    const Data64 = this.LoadManager.Data64;
    const Data8 = this.LoadManager.Data8;
    const Data1 = this.LoadManager.Data1;
    const VoxelTypes = this.LoadManager.VoxelTypes;
    const GPUData64 = this.LoadManager.GPUData64;
    const GPUData8 = this.LoadManager.GPUData8;
    const GPUData1 = this.LoadManager.GPUData1;
    const GPUTypes = this.LoadManager.GPUTypes;
    const Data64SegmentAllocations = this.LoadManager.Data64SegmentAllocations;
    const Data64SegmentIndices = this.LoadManager.Data64SegmentIndices;
    for(let Depth = 0; Depth < 8; ++Depth) for(let x64 = 0; x64 < 8; x64++) for(let y64 = 0; y64 < 8; y64++) for(let z64 = 0; z64 < 8; z64++){
      const Index64 = (Depth << 9) | (x64 << 6) | (y64 << 3) | z64;
      const Info64 = Data64[Index64];

      if(((Info64 >> 19) & 7) !== 7) continue; //Not fully loaded


      if(((Info64 >> 15) & 1) === 1){ //Empty Data64
        if(Depth !== 0) ++a;
        if(Depth !== 0) b.add(Index64);
        Data64[Index64] &= ~(1 << 14);
        GPUData64[Index64] |= 1 << 14;
        continue;
      }

      if(((Info64 >> 14) & 1) === 0) continue; //Doesn't need GPU update



      //Data64[Index64] &= ~(1 << 14); //Toggle GPU update to false

      const Location64 = Info64 & 0x0fff;
      const RequiredIndex8 = new Set;
      for(let x8 = 0; x8 < 8; x8++) for(let y8 = 0; y8 < 8; y8++) for(let z8 = 0; z8 < 8; z8++){
        const Index8 = (Location64 << 9) | (x8 << 6) | (y8 << 3) | z8;
        const Info8 = Data8[Index8];
        if((Info8 & 0x80000000) !== 0 || (Info8 & 0x60000000) === 0) continue; //Is all air or has no update
        Data8[Index8] &= ~0x60000000; //Toggle update to false
        if((Info8 & 0x40000000) !== 0){
          let Required = false;
          if((Info8 & 0x10000000) === 0){ //Does not have uniform type
            const StartLocation1 = (Info8 & 0x00ffffff) << 6;
            for (let i = StartLocation1; i < StartLocation1 + 64; ++i) { //TODO: Also check surroundings.
              if (Data1[i] !== 0) { //This means that at least one of the blocks isn't solid, meaning that it has to be added.
                Required = true;
                RequiredIndex8.add(Index8);
                break;
              }
            }
          }
          //TODO: What seems to be happening is that the data doesn't get updated because of ^^^ if the Data8 is completely full and the neighbour isn't completely empty

          //Description: This marks Data8 parts that are fully solid but that are also exposed.
          //FIXME: This probably doesn't work correctly for some circumstances on Data64 boundaries.
          for(const [dx8, dy8, dz8] of [
            [x8 - 1, y8, z8],
            [x8 + 1, y8, z8],
            [x8, y8 - 1, z8],
            [x8, y8 + 1, z8],
            [x8, y8, z8 - 1],
            [x8, y8, z8 + 1]
          ]){
            const dx64 = x64 + Math.floor(dx8 / 8.);
            if(dx64 < 0 || dx64 > 7) continue;
            const dy64 = y64 + Math.floor(dy8 / 8.);
            if(dy64 < 0 || dy64 > 7) continue;
            const dz64 = z64 + Math.floor(dz8 / 8.);
            if(dz64 < 0 || dz64 > 7) continue;
            const dIndex64 = (Depth << 9) | ((dx64 & 7) << 6) | ((dy64 & 7) << 3) | (dz64 & 7);
            if((Data64[dIndex64] & 0x8000) !== 0){
              if(((Data64[dIndex64] >> 16) & 1) === 1){ //Unloaded
                if(!Required) continue;
                Data64[dIndex64] = 0b000110_1000000000000000; //0-15, 19-21: reset load state for it to be loaded again
                //                      ||'-- 16: Set unloaded to false
                //                      |'--- 17: Make unloadable
                //                      '---- 18: Propagate updates when loaded (so that the correct parts get sent to the gpu)
              } else if(!Required && ((Data64[dIndex64] >> 19) & 7) >= 2) RequiredIndex8.add(Index8); //TODO: What does this mean??????????
              continue;
            }
            //if(!Required) continue;
            const dLocation64 = Data64[dIndex64] & 0x0fff;
            const dIndex8 = (dLocation64 << 9) | ((dx8 & 7) << 6) | ((dy8 & 7) << 3) | (dz8 & 7);
            const dInfo8 = Data8[dIndex8];
            if((dInfo8 & 0x80000000) !== 0){
              if(!Required) RequiredIndex8.add(Index8);
              continue;
            }
            if(!Required) continue;
            if(dIndex64 === Index64){//Is within the same Location64, so it can be added straight to the update set
              RequiredIndex8.add(dIndex8);
            } else{
              Data8[dIndex8] |= 1 << 29;
              //debugger;
              Data64[dIndex64] |= 1 << 14;
            }
          }
        } else if((Info8 & 0x20000000) !== 0) RequiredIndex8.add(Index8);
      }
      if(RequiredIndex8.size === 0) continue;
      let GPULocation64 = GPUData64[Index64];
      if(((GPULocation64 >> 15) & 1) === 1) GPULocation64 = this.AllocateGPUData64(Index64);
      GPULocation64 &= 0x0fff;
      const Segments = Data64SegmentAllocations[Index64];
      if(Segments.length === 0) this.AllocateSegment(Index64);
      for(let i = 0; i < 512; ++i){
        const Index8 = (Location64 << 9) | i;
        const GPUIndex8 = (GPULocation64 << 9) | i;
        if(!RequiredIndex8.has(Index8)) continue;
        //These are now going to get their data saved
        let GPUDataLocation1 = null;
        const Index = Data64SegmentIndices[Index64]; //TODO: Don't have to do this for uniform data!!!###########
        if(Index === 16){
          const SegmentLocationStart = this.AllocateSegment(Index64);
          GPUDataLocation1 = SegmentLocationStart << 4;
          Data64SegmentIndices[Index64] = 1;
        } else{
          const SegmentLocationStart = Segments[Segments.length - 1];
          GPUDataLocation1 = (SegmentLocationStart << 4) | Index;
          Data64SegmentIndices[Index64]++;
        }
        //GPUDataLocation1 allocation done
        GPUData8[GPUIndex8] = GPUDataLocation1 | (1 << 30); //Set update flag
        const Info8 = Data8[Index8];
        const GPUData1Start = GPUDataLocation1 << 6;
        const GPUTypesStart = GPUDataLocation1 << 9;
        if((Info8 & 0x10000000) !== 0){ //Has uniform type
          const Type = Info8 & 0x0000ffff;
          for(let i = 0; i < 64; ++i){
            GPUData1[GPUData1Start | i] = 0; //TODO: Might have to revise this? It's probably fine for now
          }
          for(let i = 0; i < 512; ++i){
            GPUTypes[GPUTypesStart | i] = Type;
          }
        } else{ //Not uniform type, has saved data, copy it over
          const Location8 = Data8[Index8] & 0x00ffffff;
          const Data1Start = Location8 << 6;
          const VoxelTypesStart = Location8 << 9;
          for(let i = 0; i < 64; ++i){ //TODO: change this to .set if possible, https://stackoverflow.com/a/35563895
            GPUData1[GPUData1Start | i] = Data1[Data1Start | i];
          }
          for(let i = 0; i < 512; ++i){ //TODO: change this to .set if possible
            GPUTypes[GPUTypesStart | i] = VoxelTypes[VoxelTypesStart | i];
          }
        }
      }
      GPUData64[Index64] |= 1 << 14; //Set update flag
    }
  }
};