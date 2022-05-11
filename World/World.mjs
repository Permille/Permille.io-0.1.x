import {Region, VirtualRegion} from "./Region.mjs";
import Raycast from "../Libraries/Raycast/Raycast.mjs";
import Listenable from "../Libraries/Listenable/Listenable.mjs";
import {GetHeight, ReSeed} from "../GetHeight.mjs";
import REGION_SD from "./RegionSD.mjs";
ReSeed(17);

export default class World{
  constructor(){
    this.Events = new Listenable;

    this.Data8Size = 1048576;

    this.VoxelTypes = new Uint16Array(new SharedArrayBuffer(2 * 512*this.Data8Size));
    this.Data1 = new Uint8Array(new SharedArrayBuffer(2 * 64*this.Data8Size)); //64 MB
    // (it's actually supposed to be 256*2048*256 to be full-size, but that including types would probably start wasting storage).
    // it's unlikely that the entire buffer will be used anyway, and I can always add functionality to expand it if and when required.

    this.Data8 = new Uint32Array(new SharedArrayBuffer(4 * 8*512*512)); //64 MB
    this.Data64 = new Uint32Array(new SharedArrayBuffer(4 * 8*8*8*8)); //8 kB (8*8*8, and 8 LODs)

    this.Data64.fill(0x8000);
    this.Data8.fill(0x80000000);

    this.GPUData1 = new Uint8Array(new SharedArrayBuffer(64 * 512 * 512));
    this.GPUData8 = new Uint32Array(new SharedArrayBuffer(4 * 8 * 512 * 512));
    this.GPUData64 = new Uint16Array(new SharedArrayBuffer(2 * 8 * 8 * 8 * 8));
    this.GPUTypes = new Uint16Array(new SharedArrayBuffer(2 * 512 * 512 * 512));

    this.GPUData64.fill(0x8000);
    this.GPUData8.fill(0x80000000);


    this.AllocationIndex = new Uint32Array(new SharedArrayBuffer(8)); //First slot is for allocation, second is for deallocation
    this.AllocationArray = new Uint32Array(new SharedArrayBuffer(4 * this.Data8Size)); //Stores available Data8 slots that have data (so not blank ones)
    for(let i = 0; i < this.Data8Size; ++i) this.AllocationArray[i] = i; //Initialise allocation array

    //Same thing but for allocation of 64s
    this.AllocationIndex64 = new Uint16Array(new SharedArrayBuffer(4));
    this.AllocationArray64 = new Uint16Array(new SharedArrayBuffer(2 * 4096));
    for(let i = 0, Length = 4096; i < Length; ++i) this.AllocationArray64[i] = i;

    this.Data64Offset = new Int32Array(new SharedArrayBuffer(96));

    this.GetHeight = GetHeight;

    this.NotLoadedID = Application.Main.BlockRegistry.GetBlockByIdentifier("primary:not_loaded").ID;

    this.Seed = 17;
  }
  SetSeed(Seed){
    Application.Main.WorkerLoadingPipeline.postMessage({"Request": "SetSeed", "Seed": Seed});
    this.Seed = Seed;
    ReSeed(Seed);
    this.Events.FireEventListeners("SeedUpdate", Seed);
  }

  ReloadWorld(){
    Application.Main.WorkerLoadingPipeline.postMessage({"Request": "ReloadWorld"});
  }

  GetBlock(X, Y, Z){
    const RegionX = Math.floor(X / 64);
    const RegionY = Math.floor(Y / 64);
    const RegionZ = Math.floor(Z / 64);

    const Offset64 = Application.Main.World.Data64Offset;
    const x64 = RegionX - Offset64[0];
    const y64 = RegionY - Offset64[1];
    const z64 = RegionZ - Offset64[2];

    if(x64 < 0 || y64 < 0 || z64 < 0 || x64 > 7 || y64 > 7 || z64 > 7) return 0;

    const Info64 = Application.Main.World.Data64[(x64 << 6) | (y64 << 3) | z64];
    if(((Info64 >> 15) & 1) === 1) return 0; //Region is empty.

    const x8 = Math.floor(X / 8) & 7;
    const y8 = Math.floor(Y / 8) & 7;
    const z8 = Math.floor(Z / 8) & 7;
    const Info8 = Application.Main.World.Data8[((Info64 & 0x0fff) << 9) | (x8 << 6) | (y8 << 3) | z8];
    if(((Info8 >> 28) & 1) === 1) return Info8 & 0x0000ffff; //Common block
    if(((Info8 >> 31) & 1) === 1) return 0; //Data8 is empty.

    const x1 = Math.floor(X) & 7;
    const y1 = Math.floor(Y) & 7;
    const z1 = Math.floor(Z) & 7;
    return Application.Main.World.VoxelTypes[((Info8 & 0x00ffffff) << 9) | (x1 << 6) | (y1 << 3) | z1];
  }

  SetBlock(X, Y, Z, BlockType){
    const RegionX = Math.floor(X / 64);
    const RegionY = Math.floor(Y / 64);
    const RegionZ = Math.floor(Z / 64);

    const Offset64 = Application.Main.World.Data64Offset;
    const x64 = RegionX - Offset64[0];
    const y64 = RegionY - Offset64[1];
    const z64 = RegionZ - Offset64[2];

    if(x64 < 0 || y64 < 0 || z64 < 0 || x64 > 7 || y64 > 7 || z64 > 7) return 0;

    const Index64 = (x64 << 6) | (y64 << 3) | z64;
    let Info64 = Application.Main.World.Data64[Index64];
    if(((Info64 >> 15) & 1) === 1){ //Region is empty, allocate Data64
      const Index = Atomics.add(this.AllocationIndex64, 0, 1) & 4095;
      const Location64 = Atomics.exchange(this.AllocationArray64, Index, 65535);
      this.Data64[Index64] &=~0x8fff;
      this.Data64[Index64] |= Location64; //Set location
      this.Data64[Index64] |= 7 << 19; //Set load state
    }

    const x8 = Math.floor(X / 8) & 7;
    const y8 = Math.floor(Y / 8) & 7;
    const z8 = Math.floor(Z / 8) & 7;
    const Index8 = ((Info64 & 0x0fff) << 9) | (x8 << 6) | (y8 << 3) | z8;
    const Info8 = Application.Main.World.Data8[Index8];
    const IsAir = (BlockType === 0) | 0;
    if(((Info8 >> 28) & 1) === 1){ //Has common block
      const Index = Atomics.add(this.AllocationIndex, 0, 1) & (this.AllocationArray.length - 1);
      const Location = Atomics.exchange(this.AllocationArray, Index, 2147483647);
      if(Location === 2147483647){
        Atomics.sub(this.AllocationIndex, 0, 1);
        throw new Error("Ran out of Data8 while setting block!");
      }
      const CommonType = this.Data8[Index8] & 0x0000ffff;
      this.Data8[Index8] = Location; //Set location and request GPU update
      for(let i = 0; i < 512; ++i) this.VoxelTypes[(Location << 9) | i] = CommonType; //Fill types
      for(let i = 0; i < 64; ++i) this.Data1[(Location << 6) | i] = 0; //Set solidity (for raytracing)
    } else if(((Info8 >> 31) & 1) === 1){ //Is empty
      if(IsAir) return;
      const Index = Atomics.add(this.AllocationIndex, 0, 1) & (this.AllocationArray.length - 1);
      const Location = Atomics.exchange(this.AllocationArray, Index, 2147483647);
      if(Location === 2147483647){
        Atomics.sub(this.AllocationIndex, 0, 1);
        throw new Error("Ran out of Data8 while setting block!");
      }
      this.Data8[Index8] = Location;
      for(let i = 0; i < 512; ++i) this.VoxelTypes[(Location << 9) | i] = 0; //Fill 0 (air)
      for(let i = 0; i < 64; ++i) this.Data1[(Location << 6) | i] = 0xff; //Set empty (for raytracing)
    }
    const x1 = Math.floor(X) & 7;
    const y1 = Math.floor(Y) & 7;
    const z1 = Math.floor(Z) & 7;
    const StartIndex1 = (this.Data8[Index8] & 0x00ffffff);

    this.Data64[Index64] &= ~(!IsAir << 15);
    this.Data8[Index8] &= ~(!IsAir << 31); //If the block is air, and the region is full of air, it keeps air. Otherwise, it makes/keeps it solid.
    this.VoxelTypes[(StartIndex1 << 9) | (x1 << 6) | (y1 << 3) | z1] = BlockType;
    if(!IsAir) this.Data1[(StartIndex1 << 6) | (x1 << 3) | y1] &= ~(1 << z1);
    else this.Data1[(StartIndex1 << 6) | (x1 << 3) | y1] |= 1 << z1;
    //Request GPU updates
    this.Data64[Index64] |= 1 << 14;
    this.Data8[Index8] |= 1 << 30;
  }

  Raycast(MaxDistance = 512, Origin = null, Direction = null, TransparentBlocks = [0, 4]){
    let Camera = Application.Main.Renderer.Camera;
    let SinX = Math.sin(-Camera.rotation.x);
    let SinY = Math.sin(Camera.rotation.y);
    let CosX = Math.cos(-Camera.rotation.x);
    let CosY = Math.cos(Camera.rotation.y);

    Direction = Direction || [
      SinY * CosX,
      SinX,
      CosY * CosX
    ];
    Origin = Origin || [
      Camera.position.x,
      Camera.position.y,
      Camera.position.z
    ];
    let Result = Raycast(Origin, Direction, MaxDistance, function(X, Y, Z, Face){
      if(!TransparentBlocks.includes(this.GetBlock(X, Y, Z))) return true;
      return false;
    }.bind(this));
    if(Result !== null) Result.BlockType = this.GetBlock(Result.X, Result.Y, Result.Z);
    return Result;
  }
}
