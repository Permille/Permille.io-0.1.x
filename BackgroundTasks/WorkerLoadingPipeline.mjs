import BlockRegistry from "../Block/BlockRegistry.mjs";
import LoadManager from "../World/LoadManager/LoadManager.mjs";

if(false && self.gc) void function CollectGarbage(){
  self.setTimeout(CollectGarbage, 10000);
  self.gc();
}();

self.EventHandler = {};
let MainLoadManager;

let SharedPlayerPosition;
let MainBlockRegistry;
let AtlasRanges;
let AtlasWidth;
let AtlasHeight;
let Structures;

self.Settings = {
  "VirtualRegionDepths": 7,
  "LoadDistance": 4
};

self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
};

EventHandler.SaveStuff = function(Data){
  MainBlockRegistry = BlockRegistry.Initialise(Data.BlockIDMapping, Data.BlockIdentifierMapping);
  AtlasRanges = Data.AtlasRanges;
  AtlasWidth = Data.AtlasWidth;
  AtlasHeight = Data.AtlasHeight;
  SharedPlayerPosition = Data.SharedPlayerPosition;
  Structures = Data.Structures;
};

EventHandler.Initialise = function(Data){
  MainLoadManager = new LoadManager(MainBlockRegistry, AtlasRanges, AtlasWidth, AtlasHeight, SharedPlayerPosition, Structures);
};
