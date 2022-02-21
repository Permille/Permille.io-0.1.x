export default class DataManager{
  constructor(Data8, AllocationIndex, AllocationArray, Data64, AllocationIndex64, AllocationArray64, Data64Offset){

  }
};

export function DeallocateData8Init(Data8, AllocationIndex, AllocationArray){
  return function(Location64, x8, y8, z8){
    const Location = Data8[(Location64 << 9) | (x8 << 6) | (y8 << 3) | z8];
    if((Location & (1 << 31)) !== 0) return;
    if((Location & (1 << 28)) === 0) { //Is not of uniform type
      const DeallocIndex = Atomics.add(AllocationIndex, 1, 1) & (AllocationArray.length - 1);
      Atomics.store(AllocationArray, DeallocIndex, Location);
    }
    Data8[(Location64 << 9) | (x8 << 6) | (y8 << 3) | z8] = 0x80000000;
  };
};

export function DeallocateData64Init(Data64, AllocationIndex64, AllocationArray64){
  return function(Location64, x64, y64, z64, Depth){
    if((Data64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64] & 0x8000) !== 0) return;
    const DeallocIndex = Atomics.add(AllocationIndex64, 1, 1) & 4095; //Indexing 1 for deallocation.
    Atomics.store(AllocationArray64, DeallocIndex, Location64); //Add location back to the allocation array to be reused.
    Data64[(Depth << 9) | (x64 << 6) | (y64 << 3) | z64] = 0b1000000000000000;
  };
};