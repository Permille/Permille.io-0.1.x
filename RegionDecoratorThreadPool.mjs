import Listenable from "./Libraries/Listenable/Listenable.mjs";
import BlockRegistry from "./Block/BlockRegistry.mjs";
import SVMUtils from "./Libraries/SVM/SVMUtils.mjs";

let EventHandler = {};
let Count = 0;
let Workers = [];
let Queue = [];
const MaxWorkers = 5;
const MaxWorkerQueue = 5;
let LoadedStructures = false;

let MainBlockRegistry;
let RequiredRegionSelection;

class WorkerRegionDecorator{
  constructor(){
    this.Events = new Listenable;
    this.Worker = new Worker("./WorkerRegionDecorator.mjs", {"type": "module"});
    this.OwnQueueSize = new Uint8Array(new SharedArrayBuffer(1));

    this.Worker.postMessage({
      "Request": "ShareQueueSize",
      "OwnQueueSize": this.OwnQueueSize
    });

    this.Worker.addEventListener("message", function(Event){
      if(Event.data.Request !== "Skipped") self.postMessage(Event.data); //"Finished"
      this.Events.FireEventListeners("Finished");
    }.bind(this));
  }
}

for(let i = 0; i < MaxWorkers; i++){
  let WorkerClass = new WorkerRegionDecorator;
  Workers.push(WorkerClass);
  WorkerClass.Events.AddEventListener("Finished", (function(ID){
    return function(){
      QueueStep(ID);
    };
  }.bind(this))(i));
}


void function Load(){
  self.setTimeout(Load, 1);
  if(!LoadedStructures) return; //Wait until the structures are loaded in the workers.
  while(Queue.length > 0){
    let SmallestWorkerID = -1;
    let SmallestQueueSize = MaxWorkerQueue;
    for(let i = 0; i < MaxWorkers; i++){
      const WorkerQueueSize = Workers[i].OwnQueueSize[0];
      if(WorkerQueueSize < SmallestQueueSize){
        SmallestQueueSize = WorkerQueueSize;
        SmallestWorkerID = i;
      }
    }
    if(SmallestWorkerID === -1) break;
    Workers[SmallestWorkerID].Worker.postMessage(Queue.shift());
    Workers[SmallestWorkerID].OwnQueueSize[0]++;
  }
}();

function QueueWorkerTask(Data){
  let SmallestWorkerID = -1;
  let SmallestQueueSize = MaxWorkerQueue;
  for(let i = 0; i < MaxWorkers; i++){
    const WorkerQueueSize = Workers[i].OwnQueueSize[0];
    if(WorkerQueueSize < SmallestQueueSize){
      SmallestQueueSize = WorkerQueueSize;
      SmallestWorkerID = i;
    }
  }

  if(LoadedStructures && SmallestWorkerID !== -1){//If the queue has space, immediately send the request to the workers.
    Workers[SmallestWorkerID].Worker.postMessage(Data);
    Workers[SmallestWorkerID].OwnQueueSize[0]++;
  }
  else Queue.push(Data); //Otherwise, add it to the queue.
}

function QueueStep(ID){
  if(Queue.length === 0) return;
  //console.log(ID);
  Workers[ID].Worker.postMessage(Queue.shift());
  Workers[ID].OwnQueueSize[0]++;
  //Atomics.add(Workers[i].OwnQueueSize, 0, 1);
}

self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
};

EventHandler.TransferRRSArray = function(Data){
  RequiredRegionSelection = Data.RequiredRegionSelection; //Saving this isn't necessary.

  for(let i = 0; i < MaxWorkers; i++){
    const WorkerClass = Workers[i];
    WorkerClass.Worker.postMessage({
      "Request": "TransferRRSArray",
      "RequiredRegionSelection": Data.RequiredRegionSelection
    });
  }
};

EventHandler.InitialiseBlockRegistry = function(Data){
  MainBlockRegistry = BlockRegistry.Initialise(Data.BlockIDMapping, Data.BlockIdentifierMapping); //Saving this isn't necessary.

  for(let i = 0; i < MaxWorkers; i++){
    const WorkerClass = Workers[i];
    WorkerClass.Worker.postMessage({
      "Request": "InitialiseBlockRegistry",
      "BlockIDMapping": Data.BlockIDMapping,
      "BlockIdentifierMapping": Data.BlockIdentifierMapping
    });
  }
};

EventHandler.SaveDistancedPointMap = function(Data){
  for(const Worker of Workers){
    Worker.Worker.postMessage({
      "Request": "SaveDistancedPointMap",
      "DistancedPointMap": Data.DistancedPointMap
    });
  }
};

function GetFile(Path, Callback){
  fetch(Path)
    .then(response => response.text())
    .then(Data => {
      Callback(Data);
    });
}

EventHandler.ShareStructures = function(Data){
  let Count = Data.Structures.length;
  let Completed = 0;
  const ForeignMapping = Data.ForeignMapping;
  for(const Structure of Data.Structures){
    GetFile(Structure.FilePath, function(LoadedFile, Error){
      if(!LoadedFile){
        console.warn("[RegionDecoratorThreadPool/ShareStructures/GetFile] An error occurred while loading a structure.");
        console.warn(Error);
      } else{
        Structure.Selection = SVMUtils.DeserialiseBOP(LoadedFile, ForeignMapping, Structure.Offset);
      }

      if(++Completed === Count){
        LoadedStructures = true;

        for(const Worker of Workers){
          Worker.Worker.postMessage({
            "Request": "ShareStructures",
            "Structures": Data.Structures
          });
        }
      }
    });
  }
};

EventHandler.DecorateRegion = function(Data){
  QueueWorkerTask(Data);
};