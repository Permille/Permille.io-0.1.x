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

      const RNG = RandomPointGenerator(RegionX * 8 + RegionZ + 1); //The +1 is because the random point generator fails with seed 0.
      const Points = [];
      for(let i = 0; i < 30; i++){
        const X = Math.floor(RNG.next().value * 64);
        const Z = Math.floor(RNG.next().value * 64);
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
      for(let RegionX = 0; RegionX < 8; RegionX++) for(let RegionZ = 0; RegionZ < 8; RegionZ++){
        const Identifier = RegionX * 8 + RegionZ;
        DensityObject[Identifier] = GetRandomPointsFor(RegionX, RegionZ);
      }
    }

    function* PointGenerator(RegionX, RegionZ, Density){
      const RNG = RandomPointGenerator((RegionX & 7) * 8 + (RegionZ & 7) + 1); //The +1 is because the random point generator fails with seed 0.
      const DensityObject = RandomPointMap[Density];

      const Points = [];
      for(let dX = -1; dX < 2; dX++) for(let dZ = -1; dZ < 2; dZ++){
        const rX = dX + RegionX;
        const rZ = dZ + RegionZ;
        if(rX === RegionX && rZ === RegionZ) continue;
        const NewPoints = [...DensityObject[(rX & 7) * 8 + (rZ & 7)]];
        for(const {X, Z} of NewPoints) Points.push({"X": X + Math.sign(dX) * 64, "Z": Z + Math.sign(dZ) * 64});
      }

      const DensitySquared = Density ** 2;

      let GeneratorAttempts = 0;
      while(GeneratorAttempts++ < 10){
        let ValidatorAttempts = 0;
        PointValidator: while(ValidatorAttempts++ < 10){
          const X = Math.floor(RNG.next().value * 64);
          const Z = Math.floor(RNG.next().value * 64);

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
      for(let RegionX = 0; RegionX < 8; RegionX++) for(let RegionZ = 0; RegionZ < 8; RegionZ++){
        const Identifier = RegionX * 8 + RegionZ;
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

    this.GPUInfo8 = LoadManager.GPUInfo8;
    this.GPUInfo64 = LoadManager.GPUInfo64;
    this.GPUBoundingBox1 = LoadManager.GPUBoundingBox1;

    this.Data64Offset = LoadManager.Data64Offset;

    this.AllocationIndex = LoadManager.AllocationIndex;
    this.AllocationArray = LoadManager.AllocationArray;
    this.AllocationIndex64 = LoadManager.AllocationIndex64;
    this.AllocationArray64 = LoadManager.AllocationArray64;

    this.WorkerHeightMapGenerator = new Worker(new URL("../../MultiWorkerHeightMapGeneratorManager.mjs", import.meta.url), {"name": "Heightmap Generator Manager"});
    this.WorkerRegionGenerator = new Worker(new URL("../../MultiWorkerRegionGeneratorManager.mjs", import.meta.url), {"name": "Region Generator Manager"});
    this.WorkerRegionDecorator = new Worker(new URL("../../RegionDecoratorThreadPool.mjs", import.meta.url), {"name": "Region Decorator Thread Pool"});
    this.WorkerGeometryDataGenerator = new Worker(new URL("../../MultiWorkerGeometryDataGeneratorManager.mjs", import.meta.url), {"name": "Geometry Data Generator Manager"});

    //Gets reset in RRSLoader
    this.FinishedStage2Batch = -1;


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
      const VerticalIdentifier = Event.data.RegionX + "," + Event.data.RegionZ + ((Event.data.Depth !== 0) ? ("," + Event.data.Depth) : "");
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
          this.FinishedStage2Batch = Event.data.LoadingBatch;
          this.TryFinishingBatch(false);
          break;
        }
        case "SaveVirtualRegionData":{

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

    this.WorkerRegionDecorator.postMessage({
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

    this.WorkerRegionDecorator.addEventListener("message", function(Event){
      switch(Event.data.Request){
        case "Finished":{
          Atomics.sub(this.LoadManager.LoadStageQueueLengths, 3, 1);
          if(this.FinishedStage2Batch !== -1){
            this.TryFinishingBatch(false);
          }
          break;
        }
        default:{
          throw new Error(Event.data.Request + " is not supported.");
          break;
        }
      }
    }.bind(this));

    this.WorkerGeometryDataGenerator.postMessage({
      "Request": "SaveStuff",
      "MaxWorkers": 3,
      "VoxelTypes": this.VoxelTypes,
      "Data8": this.Data8,
      "GPUBoundingBox1": this.GPUBoundingBox1,
      "GPUInfo8": this.GPUInfo8,
      "GPUInfo64": this.GPUInfo64,
      "Data64": this.Data64,
      "Data64Offset": this.Data64Offset
    });

    this.WorkerGeometryDataGenerator.onmessage = function(Event){
      switch(Event.data.Request){
        case "GenerateBoundingGeometry":{
          self.postMessage(Event.data, [Event.data.Info.buffer]);
          Atomics.sub(this.LoadManager.LoadStageQueueLengths, 4, 1);
          this.TryFinishingBatch(true);
          break;
        }
      }
    }.bind(this);

    void function Load(){
      self.setTimeout(Load.bind(this), 50);
      this.CheckStage4Eligibility();
    }.bind(this)();
  }
  TryFinishingBatch(SkipChecks){
    if(!SkipChecks){
      this.CheckStage3Eligibility();
      this.LoadManager.GPURegionDataLoader.UpdateGPUData();
      this.CheckStage4Eligibility();
    }
    //console.log(this.LoadManager.LoadStageQueueLengths[3], this.LoadManager.LoadStageQueueLengths[4]);
    if(this.FinishedStage2Batch !== -1 && Atomics.load(this.LoadManager.LoadStageQueueLengths, 3) === 0 && Atomics.load(this.LoadManager.LoadStageQueueLengths, 4) === 0){
      this.Events.FireEventListeners("FinishedLoadingBatch", this.FinishedStage2Batch);
      self.postMessage({
        "Request": "FinishedLoadingBatch",
        "Batch": this.FinishedStage2Batch
      });
    }
  }
  //Generate heightmap
  Stage1(RegionX, RegionY, RegionZ, LoadingBatch = -1, BatchSize = 1){
    const Identifier = RegionX + "," + RegionY + "," + RegionZ;
    const VerticalIdentifier = RegionX + "," + RegionZ;

    const HeightMap = this.HeightMaps[VerticalIdentifier];

    if(HeightMap){
      this.Stage2(RegionX, RegionY, RegionZ, LoadingBatch, BatchSize);
    } else{
      if(HeightMap === undefined){ //It can also be null, in which case generation of the heightmap has already started, but has not finished.
        this.HeightMaps[VerticalIdentifier] = null; //To show that the heightmap has started generating so it doesn't generate again.
        this.WorkerHeightMapGenerator.postMessage({
          "Request": "GenerateHeightMap",
          "RegionX": RegionX,
          "RegionZ": RegionZ,
          "XLength": 64,
          "ZLength": 64,
          "GenerateSlopeMap": true,
          "Depth": 0
        });
      }
      this.Events.AddEventListener("GeneratedHeightMap" + VerticalIdentifier, function(){
        this.Stage2(RegionX, RegionY, RegionZ, LoadingBatch, BatchSize);
      }.bind(this), {"Once": true});
    }
  }

  //Generate region data
  Stage2(RegionX, RegionY, RegionZ, LoadingBatch, BatchSize){
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

  CheckStage3Eligibility(){
    //return;
    //Iterating from 1 to 6 because 0 and 7 are definitely going to have missing neighbours (since they're on the border)
    for(let rx64 = 1; rx64 < 7; rx64++) for(let ry64 = 1; ry64 < 7; ry64++){
      RegionIterator: for(let rz64 = 1; rz64 < 7; rz64++) {
        const MainIndex = (rx64 << 6) | (ry64 << 3) | rz64;
        const LoadState = (this.Data64[MainIndex] >> 19) & 7;
        if(LoadState !== 2){ //TODO: Or if it's empty, or if it has a single voxel type
          continue;
        }

        for(let dx64 = rx64 - 1; dx64 < rx64 + 2; dx64++) for(let dz64 = rz64 - 1; dz64 < rz64 + 2; dz64++){
          for(let dy64 = ry64 - 1; dy64 < ry64 + 2; dy64++){
            const LoadState = (this.Data64[(dx64 << 6) | (dy64 << 3) | dz64] >> 19) & 7;
            if(LoadState < 2) continue RegionIterator; //This might not actually be that important
          }
        }
        this.Data64[MainIndex] = (this.Data64[MainIndex] & ~(7 << 19)) | (3 << 19); //Set state to 3 (Started stage 3)


        const RegionX = this.Data64Offset[0] + rx64;
        const RegionY = this.Data64Offset[1] + ry64;
        const RegionZ = this.Data64Offset[2] + rz64;

        const Maps = this.HeightMaps[RegionX + "," + RegionZ];
        Atomics.add(this.LoadManager.LoadStageQueueLengths, 3, 1);
        this.WorkerRegionDecorator.postMessage({
          "Request": "DecorateRegion",
          "RegionX": RegionX,
          "RegionY": RegionY,
          "RegionZ": RegionZ,
          "Maps": Maps
        });
      }
    }
  }

  //This is done for both normal and virtual regions:
  CheckStage4Eligibility(){
    for(let Depth = 0; Depth < 8; ++Depth){
      for(let x64 = 0; x64 < 8; ++x64) for(let y64 = 0; y64 < 8; ++y64) for(let z64 = 0; z64 < 8; ++z64){
        const Index64 = (Depth << 9) | (x64 << 6) | (y64 << 3) | z64;

        const Region64X = x64 + this.Data64Offset[3 * Depth + 0];
        const Region64Y = y64 + this.Data64Offset[3 * Depth + 1];
        const Region64Z = z64 + this.Data64Offset[3 * Depth + 2];

        const GPUInfo64 = this.GPUInfo64[Index64];
        const Info64 = this.Data64[Index64];

        //GPU region is empty, or has not been fully uploaded, or the load state is too low, or the mesh is already being generated or has been generated.
        if(((GPUInfo64 >> 31) & 1) === 1 || ((Info64 >> 19) & 7) !== 7 || ((Info64 >> 29) & 1) === 1) continue;
        this.Data64[Index64] |= 1 << 29;
        Atomics.add(this.LoadManager.LoadStageQueueLengths, 4, 1);
        this.WorkerGeometryDataGenerator.postMessage({
          "Request": "GenerateBoundingGeometry",
          "RegionX": Region64X,
          "RegionY": Region64Y,
          "RegionZ": Region64Z,
          "Depth": Depth,
          "Time": self.performance.now()
        });
      }
    }
  }

  //Virtual regions

  VirtualStage1(RegionX, RegionY, RegionZ, Depth, LoadingBatch = -1, BatchSize = 1){
    const VerticalIdentifier = RegionX + "," + RegionZ + "," + Depth;

    const HeightMap = this.HeightMaps[VerticalIdentifier];

    if(HeightMap){
      this.VirtualStage2(RegionX, RegionY, RegionZ, Depth, LoadingBatch, BatchSize);
    } else{
      if(HeightMap === undefined){ //It can also be null, in which case generation of the heightmap has already started, but has not finished.
        this.HeightMaps[VerticalIdentifier] = null; //To show that the heightmap has started generating so it doesn't generate again.
        this.WorkerHeightMapGenerator.postMessage({
          "Request": "GenerateHeightMap",
          "RegionX": RegionX,
          "RegionZ": RegionZ,
          "XLength": 64,
          "ZLength": 64,
          "GenerateSlopeMap": true,
          "Depth": Depth
        });
      }
      this.Events.AddEventListener("GeneratedHeightMap" + VerticalIdentifier, function(){
        this.VirtualStage2(RegionX, RegionY, RegionZ, Depth, LoadingBatch, BatchSize);
      }.bind(this), {"Once": true});
    }
  }
  VirtualStage2(RegionX, RegionY, RegionZ, Depth, LoadingBatch, BatchSize){
    const VerticalIdentifier = RegionX + "," + RegionZ + "," + Depth;

    const HeightMap = this.HeightMaps[VerticalIdentifier];

    if(!HeightMap){ //The heightmap was probably unloaded...
      console.error("No heightmap!! Region generation might stall as a result...");
      return;
    }

    const LocalMin = RegionY * Region.Y_LENGTH * (2 ** (1 + Depth));
    const LocalMax = (RegionY + 1) * Region.Y_LENGTH * (2 ** (1 + Depth));
    //if(HeightMap.MinHeight > LocalMax + 69 || Math.max(HeightMap.MaxHeight, 10) < LocalMin - 169) return; //TODO: Properly unload the region!
    //^^ Discard virtual regions that are too far away from the heightmap. The large buffer zone
    //is to account for objects independent of the heightmap, e.g. trees (-169) or craters (+69).
    //The Math.max is there to ensure that ocean water is loaded.

    this.WorkerRegionGenerator.postMessage({
      "Request": "GenerateVirtualRegionData",
      "RegionX": RegionX,
      "RegionY": RegionY,
      "RegionZ": RegionZ,
      "Depth": Depth,
      "HeightMap": HeightMap.HeightMap,
      "SlopeMap": HeightMap.SlopeMap,
      "TemperatureMap": HeightMap.TemperatureMap,
      "MaxHeight": HeightMap.MaxHeight,
      "MinHeight": HeightMap.MinHeight,
      "LoadingBatch": LoadingBatch,
      "BatchSize": BatchSize
    });
  }
};
