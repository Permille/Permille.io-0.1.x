import {Region, VirtualRegion} from "../Region.mjs";
import Listenable from "../../Libraries/Listenable/Listenable.mjs";
import REGION_SD from "../RegionSD.mjs";
import RRS_SD from "./RequiredRegionsSelectionSD.mjs";

export default class RegionLoader{
  static GetDistancedPointMap(){
    function* RandomPointGenerator(Seed){
      while(true) yield (Seed = Seed * 0x41a7 % 0x7fffffff) / 0x7fffffff;
    }

    function GetRandomPointsFor(RegionX, RegionZ){
      RegionX &= 15;
      RegionZ &= 15;

      const RNG = RandomPointGenerator(RegionX * 16 + RegionZ);
      const Points = [];
      for(let i = 0; i < 10; i++){
        const X = Math.floor(RNG.next().value * 32);
        const Z = Math.floor(RNG.next().value * 32);
        Points.push({"X": X, "Z": Z});
      }
      return Points;
    }

    function GetAllNearbyPoints(RegionX, RegionZ, Density){
      const Points = [];
      for(let rX = RegionX - 1; rX < RegionX + 2; rX++) for(let rZ = RegionZ - 1; rZ < RegionZ + 2; rZ++) {
        Points.push(...PointGenerator(rX, rZ, Density));
      }

      return Points;
    }

    const RandomPointMap = {};

    for(const i of [6, 10, 15]){
      RandomPointMap[i] = {};
      let DensityObject = RandomPointMap[i];
      for(let RegionX = 0; RegionX < 16; RegionX++) for(let RegionZ = 0; RegionZ < 16; RegionZ++){
        const Identifier = RegionX * 16 + RegionZ;
        DensityObject[Identifier] = GetRandomPointsFor(RegionX, RegionZ);
      }
    }

    function* PointGenerator(RegionX, RegionZ, Density){
      const RNG = RandomPointGenerator((RegionX & 15) * 16 + (RegionZ & 15));
      const DensityObject = RandomPointMap[Density];

      const Points = [];
      for(let dX = -1; dX < 2; dX++) for(let dZ = -1; dZ < 2; dZ++){
        const rX = dX + RegionX;
        const rZ = dZ + RegionZ;
        if(rX === RegionX && rZ === RegionZ) continue;
        const NewPoints = [...DensityObject[(rX & 15) * 16 + (rZ & 15)]];
        for(const {X, Z} of NewPoints) Points.push({"X": X + Math.sign(dX) * 32, "Z": Z + Math.sign(dZ) * 32});
      }

      const DensitySquared = Density ** 2;

      let GeneratorAttempts = 0;
      while(GeneratorAttempts++ < 10){
        let ValidatorAttempts = 0;
        PointValidator: while(ValidatorAttempts++ < 10){
          const X = Math.floor(RNG.next().value * 32);
          const Z = Math.floor(RNG.next().value * 32);

          for(const Point of Points){
            const DistanceSquared = (X - Point.X) ** 2 + (Z - Point.Z) ** 2;
            if(DistanceSquared < DensitySquared) continue PointValidator;
          }
          const Point = {"X": X, "Z": Z};
          Points.push(Point);
          yield Point;
          GeneratorAttempts = 0;
          break;
        }
      }
    }

    const DistancedPointMap = {};

    for(const Density of [6, 10, 15]){
      DistancedPointMap[Density] = {};
      let DensityObject = DistancedPointMap[Density];
      for(let RegionX = 0; RegionX < 16; RegionX++) for(let RegionZ = 0; RegionZ < 16; RegionZ++){
        const Identifier = RegionX * 16 + RegionZ;
        DensityObject[Identifier] = [...PointGenerator(RegionX, RegionZ, Density)];
      }
    }

    return DistancedPointMap;
  }

  constructor(LoadManager){
    this.Events = new Listenable;
    this.LoadManager = LoadManager;
    this.HeightMaps = {};
    this.DistancedPointMap = RegionLoader.GetDistancedPointMap();

    this.VoxelTypes = LoadManager.VoxelTypes;
    this.Data1 = LoadManager.Data1;
    this.Data8 = LoadManager.Data8;
    this.Data64 = LoadManager.Data64;

    this.Data64Offset = LoadManager.Data64Offset;

    this.AllocationIndex = LoadManager.AllocationIndex;
    this.AllocationArray = LoadManager.AllocationArray;
    this.AllocationIndex64 = LoadManager.AllocationIndex64;
    this.AllocationArray64 = LoadManager.AllocationArray64;

    this.WorkerHeightMapGenerator = new Worker("../MultiWorkerHeightMapGeneratorManager.mjs", {"type": "module", "name": "Heightmap Generator Manager"});
    this.WorkerRegionGenerator = new Worker("../MultiWorkerRegionGeneratorManager.mjs", {"type": "module", "name": "Region Generator Manager"});
    this.WorkerRegionDecorator = new Worker("../RegionDecoratorThreadPool.mjs", {"type": "module", "name": "Region Decorator Thread Pool"});
    this.WorkerGeometryDataGenerator = new Worker("../MultiWorkerGeometryDataGeneratorManager.mjs", {"type": "module", "name": "Geometry Data Generator Manager"});
    this.WorkerPriorityGeometryDataGenerator = new Worker("../WorkerGeometryDataGenerator.mjs", {"type": "module", "name": "Priority Geometry Data Generator"});

    this.Structures = this.LoadManager.Structures;
    this.MainBlockRegistry = this.LoadManager.MainBlockRegistry;
    this.ForeignMapping = {
      "biomesoplenty:leaves_4:2": this.MainBlockRegistry.GetBlockByIdentifier("default:leaves").ID,
      "biomesoplenty:log_2": this.MainBlockRegistry.GetBlockByIdentifier("default:wood").ID,
      "biomesoplenty:log_2:8": this.MainBlockRegistry.GetBlockByIdentifier("default:wood").ID,
      "minecraft:spruce_log": this.MainBlockRegistry.GetBlockByIdentifier("default:wood").ID,
      "minecraft:spruce_leaves": this.MainBlockRegistry.GetBlockByIdentifier("default:leaves").ID,
      "minecraft:oak_log": this.MainBlockRegistry.GetBlockByIdentifier("default:oak_wood").ID,
      "minecraft:oak_leaves": this.MainBlockRegistry.GetBlockByIdentifier("default:oak_leaves").ID,
      "NotFound": this.MainBlockRegistry.GetBlockByIdentifier("primary:error").ID,
      "LOG": this.MainBlockRegistry.GetBlockByIdentifier("default:oak_wood").ID,
      "LEAVES": this.MainBlockRegistry.GetBlockByIdentifier("default:oak_leaves").ID
    };


    //Initialise Workers

    //HeightMap init

    this.WorkerHeightMapGenerator.postMessage({
      "Request": "TransferRRS",
      "RequiredRegionsSelection": this.LoadManager.RequiredRegionsSelection
    });
    this.WorkerHeightMapGenerator.postMessage({
      "Request": "SetSeed",
      "Seed": 17
    });

    this.WorkerHeightMapGenerator.addEventListener("message", function(Event){
      const VerticalIdentifier = Event.data.RegionX + "," + Event.data.RegionZ + ((Event.data.Depth !== -1) ? ("," + Event.data.Depth) : "");
      switch(Event.data.Request){
        case "SaveHeightMap":{
          this.HeightMaps[VerticalIdentifier] = {
            "HeightMap": Event.data.HeightMap,
            "SlopeMap": Event.data.SlopeMap,
            "TemperatureMap": Event.data.TemperatureMap,
            "MinHeight": Event.data.MinHeight,
            "MaxHeight": Event.data.MaxHeight
          };
          this.Events.FireEventListeners("GeneratedHeightMap" + VerticalIdentifier, Event);
          break;
        }
      }
    }.bind(this));

    //Generator init

    this.WorkerRegionGenerator.postMessage({
      "Request": "TransferRRS",
      "RequiredRegionsSelection": this.LoadManager.RequiredRegionsSelection
    });

    this.WorkerRegionGenerator.postMessage({
      "Request": "InitialiseBlockRegistry",
      "BlockIDMapping": this.LoadManager.MainBlockRegistry.BlockIDMapping,
      "BlockIdentifierMapping": this.LoadManager.MainBlockRegistry.BlockIdentifierMapping
    });

    this.WorkerRegionGenerator.postMessage({
      "Request": "ShareStructures",
      "Structures": this.LoadManager.Structures,
      "ForeignMapping": this.ForeignMapping
    });

    this.WorkerRegionGenerator.postMessage({
      "Request": "SaveDistancedPointMap",
      "DistancedPointMap": this.DistancedPointMap
    });

    this.WorkerRegionGenerator.postMessage({
      "Request": "ShareDataBuffers",
      "Data1": this.Data1,
      "Data8": this.Data8,
      "Data64": this.Data64,
      "VoxelTypes": this.VoxelTypes,
      "Data64Offset": this.Data64Offset,
      "AllocationIndex": this.AllocationIndex,
      "AllocationArray": this.AllocationArray,
      "AllocationIndex64": this.AllocationIndex64,
      "AllocationArray64": this.AllocationArray64
    });

    this.WorkerRegionGenerator.addEventListener("message", function(Event){
      switch(Event.data.Request){
        case "GeneratedRegionData":{

          break;
        }
        case "FinishedLoadingBatch":{
          this.Events.FireEventListeners("FinishedLoadingBatch", Event.data.LoadingBatch);
          break;
        }
        case "SaveVirtualRegionData":{
          this.VirtualStage3(Event.data);
          break;
        }
      }
    }.bind(this));

    //Decorator init

    this.WorkerRegionDecorator.postMessage({
      "Request": "TransferRRS",
      "RequiredRegionsSelection": this.LoadManager.RequiredRegionsSelection
    });

    this.WorkerRegionDecorator.postMessage({
      "Request": "InitialiseBlockRegistry",
      "BlockIDMapping": this.LoadManager.MainBlockRegistry.BlockIDMapping,
      "BlockIdentifierMapping": this.LoadManager.MainBlockRegistry.BlockIdentifierMapping
    });

    this.WorkerRegionDecorator.postMessage({
      "Request": "ShareStructures",
      "Structures": this.LoadManager.Structures,
      "ForeignMapping": this.ForeignMapping
    });

    this.WorkerRegionDecorator.postMessage({
      "Request": "SaveDistancedPointMap",
      "DistancedPointMap": this.DistancedPointMap
    });

    this.WorkerRegionDecorator.addEventListener("message", function(Event){
      switch(Event.data.Request){
        case "Finished":{
          const Region000 = this.Regions[Event.data.RegionX + "," + Event.data.RegionY + "," + Event.data.RegionZ];
          if(Region000?.SharedData) Region000.SharedData[REGION_SD.LOADING_STAGE] = 3.5;
          this.Stage4(Event.data);
          break;
        }
        default:{
          throw new Error(Event.data.Request + " is not supported.");
          break;
        }
      }
    }.bind(this));

    self.setTimeout(function(){
      void function Load(){
        self.setTimeout(Load.bind(this), 20);
        this.CheckStage3_5Eligibility();
      }.bind(this)();
    }.bind(this), 20);
  }

  //Generate heightmap
  Stage1(RegionX, RegionY, RegionZ, LoadingBatch = -1, BatchSize = 1){
    const Identifier = RegionX + "," + RegionY + "," + RegionZ;
    const VerticalIdentifier = RegionX + "," + RegionZ;

    const HeightMap = this.HeightMaps[VerticalIdentifier];

    if(HeightMap){
      this.Stage2(RegionX, RegionY, RegionZ);
    } else{
      if(HeightMap === undefined){
        this.HeightMaps[VerticalIdentifier] = null; //To show that the heightmap has started generating so it doesn't generate again.
        this.WorkerHeightMapGenerator.postMessage({
          "Request": "GenerateHeightMap",
          "RegionX": RegionX,
          "RegionZ": RegionZ,
          "XLength": 64,
          "ZLength": 64,
          "GenerateSlopeMap": true,
          "Depth": -1
        });
      }
      this.Events.AddEventListener("GeneratedHeightMap" + VerticalIdentifier, function(){
        this.Stage2(RegionX, RegionY, RegionZ, LoadingBatch, BatchSize);
      }.bind(this), {"Once": true});
    }
  }

  //Generate region data
  Stage2(RegionX, RegionY, RegionZ, LoadingBatch, BatchSize){
    const Identifier = RegionX + "," + RegionY + "," + RegionZ;
    const VerticalIdentifier = RegionX + "," + RegionZ;

    const HeightMap = this.HeightMaps[VerticalIdentifier];

    if(!HeightMap) return; //The heightmap has been unloaded, which means that the region is also not needed anymore.

    //Progression to Stage 3 is managed in the constructor.

    this.WorkerRegionGenerator.postMessage({
      "Request": "GenerateRegionData",
      "RegionX": RegionX,
      "RegionY": RegionY,
      "RegionZ": RegionZ,
      "HeightMap": HeightMap.HeightMap,
      "SlopeMap": HeightMap.SlopeMap,
      "TemperatureMap": HeightMap.TemperatureMap,
      "MaxHeight": HeightMap.MaxHeight,
      "MinHeight": HeightMap.MinHeight,
      "LoadingBatch": LoadingBatch,
      "BatchSize": BatchSize
    });
  }

  CheckStage3_5Eligibility(){
    return;
    const RRS = this.LoadManager.RRSLoader.RequiredRegionsSelection;

    const ThisMinRegionX = RRS[RRS_SD.IN_X1] - 1, ThisMaxRegionX = RRS[RRS_SD.IN_X2] + 1;
    const ThisMinRegionY = RRS[RRS_SD.IN_Y1] - 1, ThisMaxRegionY = RRS[RRS_SD.IN_Y2] + 1;
    const ThisMinRegionZ = RRS[RRS_SD.IN_Z1] - 1, ThisMaxRegionZ = RRS[RRS_SD.IN_Z2] + 1;

    const BlockIDMapping = this.LoadManager.MainBlockRegistry.BlockIDMapping;

    for(let RegionX = ThisMinRegionX; RegionX < ThisMaxRegionX; RegionX++){
      const IdentifierX = RegionX + ",";
      for(let RegionY = ThisMinRegionY; RegionY < ThisMaxRegionY; RegionY++){
        const IdentifierXY = IdentifierX + RegionY + ",";
        RegionIterator: for(let RegionZ = ThisMinRegionZ; RegionZ < ThisMaxRegionZ; RegionZ++){
          const Identifier = IdentifierXY + RegionZ;
          const Region000 = this.Regions[Identifier];
          if(!Region000 || Region000.SharedData[REGION_SD.UNLOAD_TIME] >= 0 || Region000.SharedData[REGION_SD.LOADING_STAGE] !== 3) continue;

          const CommonBlock = Region000.SharedData[REGION_SD.COMMON_BLOCK];

          if(CommonBlock !== -1 && BlockIDMapping[CommonBlock].Properties.Invisible || Region000.SharedData[REGION_SD.IS_ENTIRELY_SOLID]){
            Region000.SharedData[REGION_SD.LOADING_STAGE] = 3.5;
            continue;
          }

          const Regions = {};
          const Maps = {};

          for(let rX = RegionX - 1; rX < RegionX + 2; rX++) for(let rZ = RegionZ - 1; rZ < RegionZ + 2; rZ++){
            Maps[rX + "," + rZ] = this.HeightMaps[rX + "," + rZ]; //It is assumed that this exists, given that the regions aren't unloaded.
            for(let rY = RegionY - 1; rY < RegionY + 2; rY++){
              const Identifier = rX + "," + rY + "," + rZ;
              const RegionXYZ = this.Regions[Identifier];
              if(!RegionXYZ || RegionXYZ.SharedData[REGION_SD.UNLOAD_TIME] >= 0 || RegionXYZ.SharedData[REGION_SD.LOADING_STAGE] < 3) continue RegionIterator;
              Regions[Identifier] = RegionXYZ;
            }
          }

          Region000.SharedData[REGION_SD.LOADING_STAGE] = 3.25;

          //Checking this might become obsolete as more features are added...
          //const CommonBlock = Region000.SharedData[REGION_SD.COMMON_BLOCK];


          this.WorkerRegionDecorator.postMessage({
            "Request": "DecorateRegion",
            "RegionX": RegionX,
            "RegionY": RegionY,
            "RegionZ": RegionZ,
            "Regions": Regions,
            "Maps": Maps
          });
        }
      }
    }
  }



  //Virtual regions

  VirtualStage1(RegionX, RegionY, RegionZ, Depth){
    const VerticalIdentifier = RegionX + "," + RegionZ + "," + Depth;

    const HeightMap = this.HeightMaps[VerticalIdentifier];

    if(HeightMap){
      this.VirtualStage2(RegionX, RegionY, RegionZ, Depth);
    } else{
      if(HeightMap === undefined){
        this.HeightMaps[VerticalIdentifier] = null; //To show that the heightmap has started generating so it doesn't generate again.
        this.WorkerHeightMapGenerator.postMessage({
          "Request": "GenerateHeightMap",
          "RegionX": RegionX,
          "RegionZ": RegionZ,
          "XLength": Region.X_LENGTH,
          "ZLength": Region.Z_LENGTH,
          "GenerateSlopeMap": true,
          "Depth": Depth
        });
      }
      this.Events.AddEventListener("GeneratedHeightMap" + VerticalIdentifier, function(){
        this.VirtualStage2(RegionX, RegionY, RegionZ, Depth);
      }.bind(this), {"Once": true});
    }
  }

  //Generate region data
  VirtualStage2(RegionX, RegionY, RegionZ, Depth){
    const Identifier = RegionX + "," + RegionY + "," + RegionZ;
    const VRDepthObject = this.VirtualRegions[Depth];
    const VerticalIdentifier = RegionX + "," + RegionZ + "," + Depth;

    const HeightMap = this.HeightMaps[VerticalIdentifier];

    if(!HeightMap) return; //The heightmap has been unloaded, which means that the region is also not needed anymore.

    const LocalMin = RegionY * Region.Y_LENGTH * (2 ** (1 + Depth));
    const LocalMax = (RegionY + 1) * Region.Y_LENGTH * (2 ** (1 + Depth));
    if(HeightMap.MinHeight > LocalMax + 32 || Math.max(HeightMap.MaxHeight, 10) < LocalMin - 160) return;
    //^^ Discard virtual regions that are too far away from the heightmap. The large buffer zone
    //is to account for objects independent of the heightmap, e.g. trees (-160) or craters (+32).
    //The Math.max is there to ensure that ocean water is rendered.

    const RegionData = new Uint16Array(this.LoadManager.GetSharedArrayBuffer(Region.X_LENGTH * Region.Y_LENGTH * Region.Z_LENGTH * 2));
    const RegionSD = new Float64Array(this.LoadManager.GetSharedArrayBuffer(REGION_SD.BUFFER_SIZE));

    if(VRDepthObject[Identifier]) debugger; //The region is being overwritten; unload it first and then proceed.

    VRDepthObject[Identifier] = new VirtualRegion(RegionSD, RegionData, RegionX, RegionY, RegionZ, Depth);

    RegionSD[REGION_SD.LOADING_STAGE] = 2;

    //Progression to Stage 3 is managed in the constructor.

    const IntHeightMap = new Int8Array(new SharedArrayBuffer(32 * 32));

    this.WorkerRegionGenerator.postMessage({
      "Request": "GenerateVirtualRegionData",
      "RegionX": RegionX,
      "RegionY": RegionY,
      "RegionZ": RegionZ,
      "Depth": Depth,
      "RegionData": RegionData,
      "HeightMap": HeightMap.HeightMap,
      "SlopeMap": HeightMap.SlopeMap,
      "TemperatureMap": HeightMap.TemperatureMap,
      "IntHeightMap": IntHeightMap,
      "SharedData": RegionSD
    });
  }


  VirtualStage3(Data){
    const RegionX = Data.RegionX;
    const RegionY = Data.RegionY;
    const RegionZ = Data.RegionZ;
    const Depth = Data.Depth;

    const Identifier = RegionX + "," + RegionY + "," + RegionZ;
    const CurrentRegion = this.VirtualRegions[Depth][Identifier];

    if(!CurrentRegion || CurrentRegion.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return;


    const CommonBlock = Data.CommonBlock;
    const IsEntirelySolid = Data.IsEntirelySolid;

    CurrentRegion.SharedData[REGION_SD.COMMON_BLOCK] = CommonBlock;
    CurrentRegion.SharedData[REGION_SD.IS_ENTIRELY_SOLID] = IsEntirelySolid;

    /*if(CommonBlock !== -1){
      this.LoadManager.RecycleSharedArrayBuffer(CurrentRegion.RegionData.buffer);
      CurrentRegion.RegionData = null;
      CurrentRegion.SharedData[REGION_SD.DATA_ATTACHED] = 0;
    }*/ //This will be recycled later anyways.

    CurrentRegion.SharedData[REGION_SD.LOADING_STAGE] = 3;

    //Important note: Virtual regions' RegionData is never shared, only their SharedData is shared in stage 5.

    this.VirtualStage4(CurrentRegion, Data.IntHeightMap);
  }

  VirtualStage4(CurrentRegion, IntHeightMap){
    if(!CurrentRegion || CurrentRegion.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return;

    CurrentRegion.SharedData[REGION_SD.LOADING_STAGE] = 4;

    const RegionX = CurrentRegion.RegionX;
    const RegionY = CurrentRegion.RegionY;
    const RegionZ = CurrentRegion.RegionZ;
    const Depth = CurrentRegion.Depth;

    let IsNeeded = true;

    const VerticalIdentifier = RegionX + "," + RegionZ + "," + Depth;

    const HeightMap = this.HeightMaps[VerticalIdentifier];

    const FACTOR = 2 ** (1 + Depth);

    const LocalMin = RegionY * Region.Y_LENGTH * FACTOR;
    const LocalMax = (RegionY + 1) * Region.Y_LENGTH * FACTOR;

    const CommonBlock = CurrentRegion.SharedData[REGION_SD.COMMON_BLOCK];

    if((CommonBlock !== -1 && this.LoadManager.MainBlockRegistry.BlockIDMapping[CommonBlock].Properties.Invisible) ||
      ((CommonBlock !== -1 || CurrentRegion.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1) &&
      (HeightMap.MinHeight > LocalMax + FACTOR * 2 || Math.max(HeightMap.MaxHeight, 10) < LocalMin - FACTOR * 2))){

      IsNeeded = false;
      //This is similar to the filtering in Stage 2, but here I already know whether the region has a CommonBlock or if it is entirely solid.
      //Thus, except for rendering ocean water, I can discard these virtual regions.
    }

    const MAX_VRMBPT = 5;
    const X_LENGTH = Region.X_LENGTH;
    const Y_LENGTH = Region.Y_LENGTH;
    const Z_LENGTH = Region.Z_LENGTH;

    if(IsNeeded){
      this.WorkerGeometryDataGenerator.postMessage({
        "Request": "GenerateVirtualGeometryData",
        "RegionX": CurrentRegion.RegionX,
        "RegionY": CurrentRegion.RegionY,
        "RegionZ": CurrentRegion.RegionZ,
        "Depth": CurrentRegion.Depth,
        "RegionData": CurrentRegion.RegionData,
        "SharedData": CurrentRegion.SharedData,
        "IntHeightMap": IntHeightMap
      });
    } else if(CurrentRegion.RegionData){ //GD is not needed, dispose it.
      this.LoadManager.RecycleSharedArrayBuffer(CurrentRegion.RegionData.buffer);
      CurrentRegion.RegionData = null;
      CurrentRegion.SharedData[REGION_SD.DATA_ATTACHED] = 0;
    }
  }

  //Transfer geometry data to main thread.
  VirtualStage5(Data){
    const SharedData = Data.SharedData;

    if(SharedData[REGION_SD.UNLOAD_TIME] >= 0) return;
    SharedData[REGION_SD.LOADING_STAGE] = 5;

    const Identifier = Data.RegionX + "," + Data.RegionY + "," + Data.RegionZ;
    const Depth = Data.Depth;
    const CurrentRegion = this.VirtualRegions[Depth][Identifier];

    this.LoadManager.RecycleSharedArrayBuffer(CurrentRegion.RegionData.buffer);
    CurrentRegion.RegionData = null;
    SharedData[REGION_SD.DATA_ATTACHED] = 0;

    const Opaque = Data.Opaque;
    const Transparent = Data.Transparent;
    self.postMessage(Object.assign(Data, {
      "Request": "SaveVirtualSDAndGeometryData" //Just changes the request name.
    }), [
      Opaque.Positions.buffer,
      Transparent.Positions.buffer,
      Opaque.Normals.buffer,
      Transparent.Normals.buffer,
      Opaque.UVs.buffer,
      Transparent.UVs.buffer,
      Opaque.VertexAOs.buffer,
      Transparent.VertexAOs.buffer
    ]); //Need to transfer all of the contained buffers!
  }
};
