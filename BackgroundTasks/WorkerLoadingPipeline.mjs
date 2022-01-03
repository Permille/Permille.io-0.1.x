import BlockRegistry from "../Block/BlockRegistry.mjs";
import LoadManager from "../World/LoadManager/LoadManager.mjs";

if(false && self.gc) void function CollectGarbage(){
  self.setTimeout(CollectGarbage, 10000);
  self.gc();
}();

self.EventHandler = {};
let MainLoadManager;

self.Settings = {
  "VirtualRegionDepths": 7,
  "LoadDistance": 4
};

self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
};

EventHandler.SaveStuff = function(Data){
  MainLoadManager = new LoadManager(Data);
};