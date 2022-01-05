export function AllocateData8Init(Data8, AllocationIndex, AllocationArray){
  const Data8Mod = Data8.length - 1;
  return function(Location64, x8, y8, z8){
    const Index = Atomics.add(AllocationIndex, 0, 1) & Data8Mod;
    const Location = Atomics.exchange(AllocationArray, Index, 2147483647); //Probably doesn't need to be atomic. Setting 2147483647 to mark location as invalid.
    Data8[(Location64 << 9) | (x8 << 6) | (y8 << 3) | z8] = Location;
    return Location;
  };
};

export function AllocateData64Init(Data64, AllocationIndex64, AllocationArray64, Data64Offset){
  return function(x64, y64, z64){
    x64 -= Data64Offset[0];
    y64 -= Data64Offset[1];
    z64 -= Data64Offset[2];
    //Need to set coordinates within boundaries
    const Index = Atomics.add(AllocationIndex64, 0, 1) & 511;
    const Location64 = Atomics.exchange(AllocationArray64, Index, 65535);

    Data64[(x64 << 6) | (y64 << 3) | z64] &=~0b1000000111111111; //Reset any previous location, and set first bit to 0 to mark existence.
    Data64[(x64 << 6) | (y64 << 3) | z64] |= Location64; //This is the StartIndex8 used in the other function.
    return Location64;
  };
};

export function DeallocateData8Init(Data8, AllocationIndex, AllocationArray){
  const Data8Mod = Data8.length - 1;
  return function(Location64, x8, y8, z8){
    const Location = Data8[(Location64 << 9) | (x8 << 6) | (y8 << 3) | z8];
    if(Location & (1 << 31)) return;
    const DeallocIndex = Atomics.add(AllocationIndex, 1, 1) & Data8Mod;
    Atomics.store(AllocationArray, DeallocIndex, Location);
    Data8[(Location64 << 9) | (x8 << 6) | (y8 << 3) | z8] = 0x80000000;
  };
};

export function DeallocateData64Init(Data64, AllocationIndex64, AllocationArray64, Data64Offset){
  return function(Location64, x64, y64, z64){
    x64 -= Data64Offset[0];
    y64 -= Data64Offset[1];
    z64 -= Data64Offset[2];
    const DeallocIndex = Atomics.add(AllocationIndex64, 1, 1) & 511; //Indexing 1 for deallocation.
    Atomics.store(AllocationArray64, DeallocIndex, Location64); //Add location back to the allocation array to be reused.
    Data64[(x64 << 6) | (y64 << 3) | z64] &=~0b1000000111111111; //Reset previous location and existence marker.
    Data64[(x64 << 6) | (y64 << 3) | z64] |= 0b1000000000000000; //Set existence marker to indicate that it's empty.
  };
};