import {Region, VirtualRegion} from "./Region.mjs";
import REGION_SD from "./RegionSD.mjs";
import Listenable from "../Libraries/Listenable/Listenable.mjs";
import Debug from "../Debug.mjs";

export default class WorldGenerationEngine{
  static Version = "Alpha 0.1.7";
  static Build = 31;
  constructor(p_BlockRegistry, Regions, VirtualRegions, FreeArrayBuffers, RequiredRegionSelection){
    this.Events = new Listenable;
    this.BlockRegistry = p_BlockRegistry;
    this.Regions = Regions;
    this.VirtualRegions = VirtualRegions;
    this.HeightMaps = {};

    this.FreeArrayBuffers = FreeArrayBuffers;


    this.WorkerHeightMapGenerator = new Worker(new URL("../MultiWorkerHeightMapGeneratorManager.mjs", import.meta.url));

    this.WorkerHeightMapGenerator.addEventListener("error", function(Error){
      console.warn("[WorldGenerationEngine/WorkerHeightMapGenerator] Generic Error:");
      console.warn(Error);
    });
    this.WorkerHeightMapGenerator.addEventListener("messageerror", function(Error){
      console.warn("[WorldGenerationEngine/WorkerHeightMapGenerator] Message Error:");
      console.warn(Error);
    });


    this.WorkerHeightMapGenerator.addEventListener("message", function(Event){
      switch(Event.data.Request){
        case "SaveHeightMap":{
          this.Events.FireEventListeners("GeneratedHeightMap" + Event.data.RegionX + "," + Event.data.RegionZ + ((Event.data.Depth !== undefined) ? ("," + Event.data.Depth) : ""), Event);
          break;
        }
      }
    }.bind(this));

    this.WorkerHeightMapGenerator.postMessage({
      "Request": "TransferRRSArray",
      "RequiredRegionSelection": RequiredRegionSelection
    });

    this.WorkerRegionGenerator = new Worker(new URL("../MultiWorkerRegionGeneratorManager.mjs", import.meta.url));

    this.WorkerRegionGenerator.addEventListener("error", function(Error){
      console.warn("[WorldGenerationEngine/WorkerRegionGenerator] Generic Error:");
      console.warn(Error);
    });
    this.WorkerRegionGenerator.addEventListener("messageerror", function(Error){
      console.warn("[WorldGenerationEngine/WorkerRegionGenerator] Message Error:");
      console.warn(Error);
    });

    this.WorkerRegionGenerator.addEventListener("message", function(Event){
      this.Events.FireEventListeners(Event.data.Request, Event);
    }.bind(this));

    this.WorkerRegionGenerator.postMessage({
      "Request": "InitialiseBlockRegistry",
      "BlockIDMapping": this.BlockRegistry.BlockIDMapping,
      "BlockIdentifierMapping": this.BlockRegistry.BlockIdentifierMapping
    });
    this.WorkerRegionGenerator.postMessage({
      "Request": "TransferRRSArray",
      "RequiredRegionSelection": RequiredRegionSelection
    });
    this.WorkerRegionGenerator.postMessage({
      "Request": "Initialise"
    });
  }

  GenerateHeightMap(RegionX, RegionZ, Depth){
    const VerticalIdentifier = RegionX + "," + RegionZ + ((Depth !== undefined) ? ("," + Depth) : "");
    this.HeightMaps[VerticalIdentifier] = null;

    this.WorkerHeightMapGenerator.postMessage({
      "Request": "GenerateHeightMap",
      "RegionX": RegionX,
      "RegionZ": RegionZ,
      "XLength": Region.X_LENGTH,
      "ZLength": Region.Z_LENGTH,
      "GenerateSlopeMap": true,
      "Depth": Depth
    });

    this.Events.AddEventListener("GeneratedHeightMap" + VerticalIdentifier, function(Event){ //This is guaranteed to run before any other listeners from GenerateRegion.
      this.HeightMaps[VerticalIdentifier] = {
        "HeightMap": Event.data.HeightMap,
        "SlopeMap": Event.data.SlopeMap
      };
    }.bind(this), {"Once": true});
  }

  DisposeRegionDataBuffer(DataArray){
    if(DataArray) this.FreeArrayBuffers.push(DataArray);
  }

  GenerateRegion(RegionX, RegionY, RegionZ){
    const Identifier = RegionX + "," + RegionY + "," + RegionZ;
    const VerticalIdentifier = RegionX + "," + RegionZ;

    const SharedData = new Float64Array(new SharedArrayBuffer(REGION_SD.BUFFER_SIZE));

    this.Regions[Identifier] = new Region(SharedData, RegionX, RegionY, RegionZ, this.DisposeRegionDataBuffer.bind(this));
    const CurrentRegion = this.Regions[Identifier];

    if(this.HeightMaps[VerticalIdentifier] === undefined){
      this.GenerateHeightMap(RegionX, RegionZ);
    }

    if(this.HeightMaps[VerticalIdentifier] === null){ //Heightmap is generating; call back when the heightmap is done generating. This could create a race condition...
      this.Events.AddEventListener("GeneratedHeightMap" + VerticalIdentifier, function(Event){
        this.GenerateRegion(RegionX, RegionY, RegionZ);
      }.bind(this), {"Once": true});
      return;
    }

    let RegionData;
    if(this.FreeArrayBuffers.length > 0){
      RegionData = this.FreeArrayBuffers.shift();
      //shift() is slightly safer than pop() because it is less likely that the array is still accidentally being written to (although it should never happen in the first place)
      RegionData.fill(0);
    } else{
      RegionData = new Uint16Array(new SharedArrayBuffer(Region.X_LENGTH * Region.Y_LENGTH * Region.Z_LENGTH * 2));
    }

    

    this.WorkerRegionGenerator.postMessage({
      "Request": "GenerateRegionData",
      "RegionX": RegionX,
      "RegionY": RegionY,
      "RegionZ": RegionZ,
      "RegionData": RegionData,
      "SharedData": this.Regions[Identifier].SharedData,
      "HeightMap": this.HeightMaps[VerticalIdentifier].HeightMap,
      "SlopeMap": this.HeightMaps[VerticalIdentifier].SlopeMap
    });
  }

  GenerateVirtualRegion(Depth, RegionX, RegionY, RegionZ){
    throw new Error("Outdated!!");
    const VRDepthObject = this.VirtualRegions[Depth];
    const Identifier = RegionX + "," + RegionY + "," + RegionZ;
    const VerticalIdentifier = RegionX + "," + RegionZ + "," + Depth;
    VRDepthObject[Identifier] = new VirtualRegion(Depth, RegionX, RegionY, RegionZ, this.FreeArrayBuffers);
    VRDepthObject[Identifier].State[0] |= Region.MASK_NEEDS_REGION_DATA;
    if(this.HeightMaps[VerticalIdentifier] === undefined){
      this.GenerateHeightMap(RegionX, RegionZ, Depth);
    }
    if(this.HeightMaps[VerticalIdentifier] === null){
      this.Events.AddEventListener("GeneratedHeightMap" + VerticalIdentifier, function(Event){
        this.GenerateVirtualRegion(Depth, RegionX, RegionY, RegionZ);
      }.bind(this), {"Once": true});
      return;
    }
    let DataArray;
    if(this.FreeArrayBuffers.length > 0) {
      DataArray = this.FreeArrayBuffers.pop();
      for(let i = 0, Length = 65536; i < Length; i++) DataArray[i] = 0;
    }
    else DataArray = new Uint16Array(new SharedArrayBuffer(Region.X_LENGTH * Region.Y_LENGTH * Region.Z_LENGTH * 2));

    const IntHeightMap = new Int8Array(new SharedArrayBuffer(Region.X_LENGTH * Region.Z_LENGTH)); // Used for geometry generation.
    this.WorkerRegionGenerator.postMessage({
      "Request": "GenerateVirtualRegionData",
      "Depth": Depth,
      "RegionX": RegionX,
      "RegionY": RegionY,
      "RegionZ": RegionZ,
      "DataArray": DataArray,
      "IntHeightMap": IntHeightMap,
      "HeightMap": this.HeightMaps[VerticalIdentifier].HeightMap,
      "SlopeMap": this.HeightMaps[VerticalIdentifier].SlopeMap,
      "State": VRDepthObject[Identifier].State
    });
  }
}
