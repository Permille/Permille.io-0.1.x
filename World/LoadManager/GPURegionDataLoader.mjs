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
    for(let x64 = 1; x64 < 7; x64++) for(let y64 = 1; y64 < 7; y64++) for(let z64 = 1; z64 < 7; z64++){
      const Index64 = (x64 << 6) | (y64 << 3) | z64;
      const Info64 = Data64[Index64];
      if(((Info64 >> 15) & 1) !== 0 || ((Info64 >> 14) & 1) === 0) continue; //Is empty, or doesn't need GPU update
      Data64[Index64] &= ~(1 << 14); //Toggle GPU update to false
      const Location64 = Info64 & 0x0fff;
      const RequiredLocation8 = new Set;
      for(let x8 = 0; x8 < 8; x8++) for(let y8 = 0; y8 < 8; y8++) for(let z8 = 0; z8 < 8; z8++){
        const Location8 = (Location64 << 9) | (x8 << 6) | (y8 << 3) | z8;
        const Info1 = Data8[Location8];
        if((Info1 & 0x80000000) !== 0/* || (Info1 & 0x40000000) === 0*/) continue; //Is all air, or has not been updated
        const StartLocation1 = (Info1 & 0x0003ffff) << 6;
        for(let i = StartLocation1; i < StartLocation1 + 64; ++i){ //TODO: Also check surroundings.
          if(Data1[i] !== 0){ //This means that at least one of the blocks isn't solid, meaning that it has to be added.
            RequiredLocation8.add(Location8);
            break;
          }
        }
      }
      if(RequiredLocation8.size === 0) continue;
      let GPULocation64 = GPUData64[Index64];
      if(((GPULocation64 >> 15) & 1) === 1) GPULocation64 = this.AllocateGPUData64(Index64);
      GPULocation64 &= 0x0fff;
      const Segments = Data64SegmentAllocations[Index64];
      if(Segments.length === 0) this.AllocateSegment(Index64);
      //for(const Location8 of RequiredLocation8){
      for(let i = 0; i < 512; ++i){
        const Location8 = (Location64 << 9) | i;
        const GPULocation8 = (GPULocation64 << 9) | i;
        if(!RequiredLocation8.has(Location8)){
          GPUData8[GPULocation8] = 0x80000000;
          continue;
        }
        //These are now going to get their data saved
        let GPUDataLocation1 = null;
        const Index = Data64SegmentIndices[Index64];
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
        GPUData8[GPULocation8] = GPUDataLocation1 | (1 << 30); //Set update flag
        const DataLocation1 = Data8[Location8];
        const GPUData1Start = GPUDataLocation1 << 6;
        const Data1Start = DataLocation1 << 6;
        for(let i = 0; i < 64; ++i){ //TODO: change this to .set if possible, https://stackoverflow.com/a/35563895
          GPUData1[GPUData1Start | i] = Data1[Data1Start | i];
        }
        const GPUTypesStart = GPUDataLocation1 << 9;
        const VoxelTypesStart = DataLocation1 << 9;
        for(let i = 0; i < 512; ++i){ //TODO: change this to .set if possible
          GPUTypes[GPUTypesStart | i] = VoxelTypes[VoxelTypesStart | i];
        }
      }
      GPUData64[Index64] |= 1 << 14; //Set update flag
    }
  }
};