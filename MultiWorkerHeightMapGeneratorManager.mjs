import Listenable from "./Libraries/Listenable/Listenable.mjs";

let EventHandler = {};
let Count = 0;
let Workers = [];
let Queue = [];
const MaxWorkers = 3;
const MaxWorkerQueue = 5;

let RequiredRegionsSelection;

EventHandler.TransferRRS = function(Data){
  RequiredRegionsSelection = Data.RequiredRegionsSelection;
};

class WorkerHeightMapGenerator{
  constructor(){
    this.Events = new Listenable;
    this.Worker = new Worker("./WorkerHeightMapGenerator.mjs", {"type": "module"});
    this.OwnQueueSize = new Uint8Array(new SharedArrayBuffer(1));

    this.Worker.postMessage({
      "Request": "ShareQueueSize",
      "OwnQueueSize": this.OwnQueueSize
    });

    this.Worker.postMessage({
      "Request": "TransferRequiredRegionsArray",
      "RequiredRegionsSelection": RequiredRegionsSelection
    });

    this.Worker.addEventListener("message", function(Event){
      self.postMessage(Event.data); //"SaveHeightMap", ...
      this.Events.FireEventListeners("Finished");
    }.bind(this));
  }
}

for(let i = 0; i < MaxWorkers; i++){
  let WorkerClass = new WorkerHeightMapGenerator;
  Workers.push(WorkerClass);
  WorkerClass.Events.AddEventListener("Finished", (function(ID){
    return function(){
      QueueStep(ID);
    };
  }.bind(this))(i));
}

self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
}

void function Load(){
  self.setTimeout(Load, 1);
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

  if(SmallestWorkerID !== -1){//If the queue has space, immediately send the request to the workers.
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

EventHandler.SetSeed = function(Data){
  for(let i = 0; i < MaxWorkers; i++){
    Workers[i].Worker.postMessage(Data);
  }
}

EventHandler.GenerateHeightMap = function(Data){
  QueueWorkerTask(Data);
}
