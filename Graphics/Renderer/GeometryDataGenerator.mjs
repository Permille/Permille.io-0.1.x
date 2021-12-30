import {Region} from "./../../World/Region.mjs";
import World from "./../../World/World.mjs";
import Listenable from "../../Libraries/Listenable/Listenable.mjs";
import Debug from "../../Debug.mjs";
import REGION_SD from "../../World/RegionSD.mjs";
export default class GeometryDataGenerator{
  constructor(RegionLoader, AtlasRanges, AtlasWidth, AtlasHeight, BlockIDMapping){
    this.Events = new Listenable;
    this.RegionLoader = RegionLoader;
    this.Regions = RegionLoader.Regions;
    this.VirtualRegions = RegionLoader.VirtualRegions;
    this.RegionLoader.Events.AddEventListener("SaveVirtualRegionData", function(Region, Event){
      this.GenerateVirtualGeometryDataFor(Event.data);
    }.bind(this));

    this.GenerateMoreGeometryDataTimeout = 50;

    void function Load(){
      self.setTimeout(Load.bind(this), this.GenerateMoreGeometryDataTimeout);
      this.GenerateMoreGeometryData();
    }.bind(this)();

    this.WorkerGeometryDataGenerator = new Worker("../MultiWorkerGeometryDataGeneratorManager.mjs", {"type": "module"});

    this.WorkerGeometryDataGenerator.addEventListener("error", function(Error){
      console.warn("[GeometryDataGenerator/WorkerGeometryDataGenerator] Generic Error:");
      console.warn(Error);
    });
    this.WorkerGeometryDataGenerator.addEventListener("messageerror", function(Error){
      console.warn("[GeometryDataGenerator/WorkerGeometryDataGenerator] Message Error:");
      console.warn(Error);
    });

    this.WorkerGeometryDataGenerator.addEventListener("message", function(Event){
      const CurrentRegion = this.Regions[Event.data.RegionX + "," + Event.data.RegionY + "," + Event.data.RegionZ];
      if(!CurrentRegion || CurrentRegion.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return;

      this.Events.FireEventListeners(Event.data.Request, Event);
    }.bind(this));

    this.WorkerGeometryDataGenerator.postMessage({
      "Request": "SaveStuff",
      "MergedUVMapping": AtlasRanges,
      "Width": AtlasWidth,
      "Height": AtlasHeight,
      "BlockIDMapping": BlockIDMapping,
      "RequiredRegions": RegionLoader.RequiredRegions,
      "Workers": 1
    });

    this.WorkerVirtualGeometryDataGenerator = new Worker("../MultiWorkerGeometryDataGeneratorManager.mjs", {"type": "module"});

    this.WorkerVirtualGeometryDataGenerator.addEventListener("error", function(Error){
      console.warn("[GeometryDataGenerator/WorkerVirtualGeometryDataGenerator] Generic Error:");
      console.warn(Error);
    });
    this.WorkerVirtualGeometryDataGenerator.addEventListener("messageerror", function(Error){
      console.warn("[GeometryDataGenerator/WorkerVirtualGeometryDataGenerator] Message Error:");
      console.warn(Error);
    });

    this.WorkerVirtualGeometryDataGenerator.addEventListener("message", function(Event){
      const CurrentRegion = this.VirtualRegions[Event.data.Depth][Event.data.RegionX + "," + Event.data.RegionY + "," + Event.data.RegionZ];
      if(!CurrentRegion || CurrentRegion.SharedData[REGION_SD.UNLOAD_TIME] >= 0) return;

      this.Events.FireEventListeners(Event.data.Request, Event);
    }.bind(this));

    this.WorkerVirtualGeometryDataGenerator.postMessage({
      "Request": "SaveStuff",
      "MergedUVMapping": AtlasRanges,
      "Width": AtlasWidth,
      "Height": AtlasHeight,
      "BlockIDMapping": BlockIDMapping,
      "RequiredRegions": RegionLoader.RequiredRegions,
      "Workers": 3
    });

    this.WorkerPriorityGeometryDataGenerator = new Worker("../WorkerGeometryDataGenerator.mjs", {"type": "module"});

    this.WorkerPriorityGeometryDataGenerator.addEventListener("error", function(Error){
      console.warn("[GeometryDataGenerator/WorkerPriorityGeometryDataGenerator] Generic Error:");
      console.warn(Error);
    });
    this.WorkerPriorityGeometryDataGenerator.addEventListener("messageerror", function(Error){
      console.warn("[GeometryDataGenerator/WorkerPriorityGeometryDataGenerator] Message Error:");
      console.warn(Error);
    });

    this.WorkerPriorityGeometryDataGenerator.addEventListener("message", function(Event){
      this.Events.FireEventListeners(Event.data.Request, Event);
    }.bind(this));

    this.WorkerPriorityGeometryDataGenerator.postMessage({
      "Request": "SaveStuff",
      "MergedUVMapping": AtlasRanges,
      "Width": AtlasWidth,
      "Height": AtlasHeight,
      "BlockIDMapping": BlockIDMapping,
      "RequiredRegions": RegionLoader.RequiredRegions
    });
  }
  GenerateMoreGeometryData(){
    const RegionArray = this.Regions;

    for(const Identifier in RegionArray){
      const Region000 = RegionArray[Identifier];
      if(Region000.SharedData[REGION_SD.GD_REQUIRED] === 0) continue;

      const RegionX = Region000.RegionX;
      const RegionY = Region000.RegionY;
      const RegionZ = Region000.RegionZ;

      const RegionM00 = RegionArray[(RegionX - 1) + "," + RegionY + "," + RegionZ]; if(!RegionM00 || RegionM00.SharedData[REGION_SD.LOADED] !== 1) continue;
      const RegionP00 = RegionArray[(RegionX + 1) + "," + RegionY + "," + RegionZ]; if(!RegionP00 || RegionP00.SharedData[REGION_SD.LOADED] !== 1) continue;
      const Region0M0 = RegionArray[RegionX + "," + (RegionY - 1) + "," + RegionZ]; if(!Region0M0 || Region0M0.SharedData[REGION_SD.LOADED] !== 1) continue;
      const Region0P0 = RegionArray[RegionX + "," + (RegionY + 1) + "," + RegionZ]; if(!Region0P0 || Region0P0.SharedData[REGION_SD.LOADED] !== 1) continue;
      const Region00M = RegionArray[RegionX + "," + RegionY + "," + (RegionZ - 1)]; if(!Region00M || Region00M.SharedData[REGION_SD.LOADED] !== 1) continue;
      const Region00P = RegionArray[RegionX + "," + RegionY + "," + (RegionZ + 1)]; if(!Region00P || Region00P.SharedData[REGION_SD.LOADED] !== 1) continue;

      const Regions = {
        [(RegionX - 1) + "," + RegionY + "," + RegionZ]:{
          "RegionData": RegionM00.RegionData,
          "SharedData": RegionM00.SharedData,
          "CommonBlock": RegionM00.SharedData[REGION_SD.COMMON_BLOCK],
          "IsEntirelySolid": RegionM00.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1
        },
        [(RegionX + 1) + "," + RegionY + "," + RegionZ]:{
          "RegionData": RegionP00.RegionData,
          "SharedData": RegionP00.SharedData,
          "CommonBlock": RegionP00.SharedData[REGION_SD.COMMON_BLOCK],
          "IsEntirelySolid": RegionP00.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1
        },
        [RegionX + "," + (RegionY - 1) + "," + RegionZ]:{
          "RegionData": Region0M0.RegionData,
          "SharedData": Region0M0.SharedData,
          "CommonBlock": Region0M0.SharedData[REGION_SD.COMMON_BLOCK],
          "IsEntirelySolid": Region0M0.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1
        },
        [RegionX + "," + (RegionY + 1) + "," + RegionZ]:{
          "RegionData": Region0P0.RegionData,
          "SharedData": Region0P0.SharedData,
          "CommonBlock": Region0P0.SharedData[REGION_SD.COMMON_BLOCK],
          "IsEntirelySolid": Region0P0.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1
        },
        [RegionX + "," + RegionY + "," + (RegionZ - 1)]:{
          "RegionData": Region00M.RegionData,
          "SharedData": Region00M.SharedData,
          "CommonBlock": Region00M.SharedData[REGION_SD.COMMON_BLOCK],
          "IsEntirelySolid": Region00M.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1
        },
        [RegionX + "," + RegionY + "," + (RegionZ + 1)]:{
          "RegionData": Region00P.RegionData,
          "SharedData": Region00P.SharedData,
          "CommonBlock": Region00P.SharedData[REGION_SD.COMMON_BLOCK],
          "IsEntirelySolid": Region00P.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1
        },
        [Identifier]:{
          "RegionData": Region000.RegionData,
          "SharedData": Region000.SharedData,
          "CommonBlock": Region000.SharedData[REGION_SD.COMMON_BLOCK],
          "IsEntirelySolid": Region000.SharedData[REGION_SD.IS_ENTIRELY_SOLID] === 1
        }
      };

      let Priority = Region000.SharedData[REGION_SD.GD_UPDATE_REQUIRED] === 1;
      (Priority ? this.WorkerPriorityGeometryDataGenerator : this.WorkerGeometryDataGenerator).postMessage({
        "Request": "GenerateGeometryData",
        "RegionX": RegionX,
        "RegionY": RegionY,
        "RegionZ": RegionZ,
        "Regions": Regions,
        "Priority": Priority
      });
      Region000.SharedData[REGION_SD.GD_UPDATE_REQUIRED] = 0;
      Region000.SharedData[REGION_SD.GD_REQUIRED] = 0;
    }
  }
  GenerateVirtualGeometryDataFor(Data){
    throw new Error("Outdated!!");
    const CurrentRegion = this.VirtualRegions[Data.Depth][Data.RegionX + "," + Data.RegionY + "," + Data.RegionZ];
    if(CurrentRegion === undefined || (CurrentRegion.State[0] & Region.MASK_UNLOADED) || !(CurrentRegion.State[0] & Region.MASK_NEEDS_GEOMETRY_DATA)) return;
    let Priority = Atomics.load(CurrentRegion.State, 0) & Region.MASK_NEEDS_GEOMETRY_DATA_UPDATE;

    (Priority ? this.WorkerPriorityGeometryDataGenerator : this.WorkerVirtualGeometryDataGenerator).postMessage({
      "Request": "GenerateVirtualGeometryData",
      "Depth": Data.Depth,
      "RegionX": Data.RegionX,
      "RegionY": Data.RegionY,
      "RegionZ": Data.RegionZ,
      "RegionData": {
        "Region": Data.RegionData,
        "IntHeightMap": Data.IntHeightMap,
        "CommonBlock": Data.CommonBlock,
        "IsEntirelySolid": Data.IsEntirelySolid
      },
      "Priority": Priority,
      "State": CurrentRegion.State
    });
    CurrentRegion.State[0] &= ~Region.MASK_NEEDS_GEOMETRY_DATA;
  }
};
