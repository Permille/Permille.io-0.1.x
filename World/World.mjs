import {Region, VirtualRegion} from "./Region.mjs";
import Raycast from "../Libraries/Raycast/Raycast.mjs";
import Listenable from "../Libraries/Listenable/Listenable.mjs";
import {GetHeight, ReSeed} from "../GetHeight.mjs";
import REGION_SD from "./RegionSD.mjs";
ReSeed(17);

export default class World{
  constructor(){
    this.Events = new Listenable;

    this.VoxelTypes = new Uint16Array(new SharedArrayBuffer(2 * 512*2048*256)); //512 MB
    this.Data1 = new Uint8Array(new SharedArrayBuffer(2 * 64*2048*256)); //64 MB
    // (it's actually supposed to be 256*2048*256 to be full-size, but that including types would probably start wasting storage).
    // it's unlikely that the entire buffer will be used anyway, and I can always add functionality to expand it if and when required.

    this.Data8 = new Uint32Array(new SharedArrayBuffer(4 * 1*512*512)); //8 MB
    this.Data64 = new Uint16Array(new SharedArrayBuffer(2 * 8*8*8*8)); //8 kB (8*8*8, and 8 LODs)

    this.Data64.fill(0x8000);
    this.Data8.fill(0x80000000);

    this.GPUData1 = new Uint8Array(new SharedArrayBuffer(64 * 512 * 512));
    this.GPUData8 = new Uint32Array(new SharedArrayBuffer(4 * 512 * 512));
    this.GPUData64 = new Uint16Array(new SharedArrayBuffer(2 * 8 * 8 * 8 * 8));
    this.GPUTypes = new Uint16Array(new SharedArrayBuffer(2 * 512 * 512 * 512));
    this.SegmentAllocation = new Uint16Array(new SharedArrayBuffer(2 * 32 * 512));

    this.GPUData64.fill(0x8000);
    this.GPUData8.fill(0x80000000);



    this.AllocationIndex = new Uint32Array(new SharedArrayBuffer(8)); //First slot is for allocation, second is for deallocation
    this.AllocationArray = new Uint32Array(new SharedArrayBuffer(4 * this.Data8.length)); //Stores available Data8 slots
    for(let i = 0, Length = this.Data8.length; i < Length; ++i) this.AllocationArray[i] = i; //Initialise allocation array

    //Same thing but for allocation of 64s
    this.AllocationIndex64 = new Uint16Array(new SharedArrayBuffer(4));
    this.AllocationArray64 = new Uint16Array(new SharedArrayBuffer(2 * this.Data64.length));
    for(let i = 0, Length = this.Data64.length; i < Length; ++i) this.AllocationArray64[i] = i;

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
    return 0;
    const RegionX = Math.floor(X / Region.X_LENGTH);
    const RegionY = Math.floor(Y / Region.Y_LENGTH);
    const RegionZ = Math.floor(Z / Region.Z_LENGTH);
    const Identifier = RegionX + "," + RegionY + "," + RegionZ;
    if(this.Regions[Identifier]){
      const Index = (X & Region.X_LENGTH_MINUS_ONE) * Region.Z_LENGTH * Region.Y_LENGTH + (Y & Region.Y_LENGTH_MINUS_ONE) * Region.Z_LENGTH + (Z & Region.Z_LENGTH_MINUS_ONE);
      const CommonBlock = this.Regions[Identifier].SharedData[REGION_SD.COMMON_BLOCK];

      if(this.Regions[Identifier].RegionData) return this.Regions[Identifier].RegionData[Index];
      else if(CommonBlock !== -1) return CommonBlock;
      else return 0;
    }

    return 0;//this.NotLoadedID;
  }

  SetBlock(X, Y, Z, BlockType){
    return false;
    const RegionX = X >> 5;
    const RegionY = Y >> 6;
    const RegionZ = Z >> 5;
    const Identifier = RegionX + "," + RegionY + "," + RegionZ;
    if(this.Regions[Identifier] !== undefined){
      let ModX = X & Region.X_LENGTH_MINUS_ONE;
      let ModY = Y & Region.Y_LENGTH_MINUS_ONE;
      let ModZ = Z & Region.Z_LENGTH_MINUS_ONE;
      if(!this.Regions[Identifier].RegionData){
        this.Regions[Identifier].RegionData = new Uint16Array(new SharedArrayBuffer(Region.X_LENGTH * Region.Y_LENGTH * Region.Z_LENGTH * 2)).fill(this.Regions[Identifier].SharedData[REGION_SD.COMMON_BLOCK]);
        //Once the background thread receives this region, it will update the shared data's DATA_ATTACHED.
        Application.Main.WorkerLoadingPipeline.postMessage({
          "Request": "ShareRegionData",
          "Identifier": Identifier,
          "RegionData": this.Regions[Identifier].RegionData
        });
      }
      this.Regions[Identifier].RegionData[ModX * Region.Z_LENGTH * Region.Y_LENGTH + ModY * Region.Z_LENGTH + ModZ] = BlockType;

      this.Regions[Identifier].SharedData[REGION_SD.IS_ENTIRELY_SOLID] = 0;
      this.Regions[Identifier].SharedData[REGION_SD.COMMON_BLOCK] = -1;

      //Update surrounding regions
      [
        {"Identifier": RegionX + "," + RegionY + "," + RegionZ, "Condition": true},
        {"Identifier": (RegionX - 1) + "," + RegionY + "," + RegionZ, "Condition": ModX === 0},
        {"Identifier": (RegionX + 1) + "," + RegionY + "," + RegionZ, "Condition": ModX === Region.X_LENGTH_MINUS_ONE},
        {"Identifier": RegionX + "," + (RegionY - 1) + "," + RegionZ, "Condition": ModY === 0},
        {"Identifier": RegionX + "," + (RegionY + 1) + "," + RegionZ, "Condition": ModY === Region.Y_LENGTH_MINUS_ONE},
        {"Identifier": RegionX + "," + RegionY + "," + (RegionZ - 1), "Condition": ModZ === 0},
        {"Identifier": RegionX + "," + RegionY + "," + (RegionZ + 1), "Condition": ModZ === Region.Z_LENGTH_MINUS_ONE}
      ].forEach(function(Item){
        if(Item.Condition && (this.Regions[Item.Identifier])){
          this.Regions[Item.Identifier].SharedData[REGION_SD.GD_REQUIRED] = 1;
          this.Regions[Item.Identifier].SharedData[REGION_SD.GD_UPDATE_REQUIRED] = 1;
        }
      }.bind(this));
    }
  }

  Raycast(MaxDistance = 512, Origin = null, Direction = null, TransparentBlocks = [0, 4]){
    return 0;
    let Camera = Application.Main.Renderer.Camera;
    let SinX = Math.sin(Camera.rotation.x);
    let SinY = Math.sin(Camera.rotation.y);
    let CosX = Math.cos(Camera.rotation.x);
    let CosY = Math.cos(Camera.rotation.y);

    Direction = Direction || [
      -SinY * CosX,
      SinX,
      -CosY * CosX
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
