import REGION_SD from "./RegionSD.mjs";
export class Region{
  static Version = "Alpha 0.1.4.16";
  static Build = 33;

  static X_LENGTH = 32;
  static X_POWER = 5;
  static X_LENGTH_SQUARED = 1024;
  static X_LENGTH_MINUS_ONE = 31;

  static Y_LENGTH = 64;
  static Y_POWER = 6;
  static Y_LENGTH_SQUARED = 4096;
  static Y_LENGTH_MINUS_ONE = 63;

  static Z_LENGTH = 32;
  static Z_POWER = 5;
  static Z_LENGTH_SQUARED = 1024;
  static Z_LENGTH_MINUS_ONE = 31;

  constructor(SharedData, RegionData, RegionX, RegionY, RegionZ){
    this.SharedData = SharedData;
    this.RegionData = RegionData;

    this.RegionX = RegionX;
    this.RegionY = RegionY;
    this.RegionZ = RegionZ;

    this.ThreadSafeTime = self.performance.now();

    this.SharedData[REGION_SD.REQUEST_TIME] = this.ThreadSafeTime;
    this.SharedData[REGION_SD.UNLOAD_TIME] = -Infinity;
    this.SharedData[REGION_SD.DATA_ATTACHED] = 0;
    this.SharedData[REGION_SD.REGION_X] = RegionX;
    this.SharedData[REGION_SD.REGION_Y] = RegionY;
    this.SharedData[REGION_SD.REGION_Z] = RegionZ;
    this.SharedData[REGION_SD.DEPTH] = -1;
  }

  GetIdentifier(){
    return this.RegionX + "," + this.RegionY + "," + this.RegionZ;
  }

  Init(RegionData, CommonBlock, IsEntirelySolid){
    this.SharedData[REGION_SD.LOADED] = 1;
    this.SharedData[REGION_SD.COMMON_BLOCK] = CommonBlock ?? -1;
    this.SharedData[REGION_SD.IS_ENTIRELY_SOLID] = IsEntirelySolid | 0;

    this.SharedData[REGION_SD.GD_REQUIRED] = 1;

    if(!CommonBlock || this.SharedData[REGION_SD.DEPTH] !== -1){
      this.RegionData = RegionData;
      this.SharedData[REGION_SD.DATA_ATTACHED] = 1;
      this.SharedData[REGION_SD.REVERSE_DATA_ACKNOWLEDGED] = 1;
      return true;
    } else{
      this.SharedData[REGION_SD.DATA_ATTACHED] = 0;
      return false;
    }
  }

  Destruct(){
    this.SharedData[REGION_SD.UNLOAD_TIME] = self.performance.now();

    this.SharedData[REGION_SD.LOADED] = 0;
    this.SharedData[REGION_SD.DATA_ATTACHED] = 0;
    this.SharedData[REGION_SD.GD_REQUIRED] = 0;
    this.SharedData[REGION_SD.GD_UPDATE_REQUIRED] = 0;

    this.RegionData = undefined;
  }

  SetBlock(rX, rY, rZ, BlockID){
    this.SharedData[REGION_SD.GD_REQUIRED] = 1;
    this.SharedData[REGION_SD.GD_UPDATE_REQUIRED] = 1;

    if(this.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1 && BlockID === 0){
      this.SharedData[REGION_SD.IS_ENTIRELY_SOLID] = 0;
    }

    let NewlyCreatedData = false;
    if(!this.RegionData){
      this.RegionData = new Uint16Array(new SharedArrayBuffer(Region.X_LENGTH * Region.Y_LENGTH * Region.Z_LENGTH * 2));
      NewlyCreatedData = true;
    }

    if(this.SharedData[REGION_SD.COMMON_BLOCK] !== -1){
      if(NewlyCreatedData) this.RegionData.set(this.SharedData[REGION_SD.COMMON_BLOCK]);

      if(BlockID !== this.SharedData[REGION_SD.COMMON_BLOCK]) this.SharedData[REGION_SD.COMMON_BLOCK] = -1;
    }
    this.Data[rX * Region.Z_LENGTH * Region.Y_LENGTH + rY * Region.Z_LENGTH + rZ] = BlockID;
    return NewlyCreatedData;
  }
}

export class VirtualRegion extends Region{
  constructor(SharedData, RegionData, RegionX, RegionY, RegionZ, Depth){
    SharedData[REGION_SD.DEPTH] = Depth;
    super(SharedData, RegionData, RegionX, RegionY, RegionZ);
    this.Depth = Depth;
  }
}
/*
export class MicroRegion extends Region{

  static X_LENGTH = 16;
  static X_POWER = 4;
  static X_LENGTH_SQUARED = 256;
  static X_LENGTH_MINUS_ONE = 15;

  static Y_LENGTH = 16;
  static Y_POWER = 4;
  static Y_LENGTH_SQUARED = 256;
  static Y_LENGTH_MINUS_ONE = 15;

  static Z_LENGTH = 16;
  static Z_POWER = 4;
  static Z_LENGTH_SQUARED = 256;
  static Z_LENGTH_MINUS_ONE = 15;

  constructor(RegionX, RegionY, RegionZ){
    super(RegionX, RegionY, RegionZ);
  }
}*/
