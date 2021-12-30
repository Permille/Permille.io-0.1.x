import Listenable from "./Libraries/Listenable/Listenable.mjs";

let EventHandler = {};
let Workers = [];
let Queue = [];
let MaxWorkers = 0;
let SaveStuff;
let RequiredRegions;
const MaxWorkerQueue = 3;

class WorkerGeometryDataGenerator{
  constructor(){
    this.Events = new Listenable;
    this.Worker = new Worker("./WorkerGeometryDataGenerator.mjs", {"type": "module"});
    this.OwnQueueSize = new Uint8Array(new SharedArrayBuffer(1));

    this.Worker.postMessage(Object.assign(SaveStuff, {
      "OwnQueueSize": this.OwnQueueSize
    }));

    this.Worker.addEventListener("message", function(Event){
      switch(Event.data.Request){
        case "SaveGeometryData":
        case "SaveVirtualGeometryData":{
          const Opaque = Event.data.Opaque;
          const Transparent = Event.data.Transparent;
          self.postMessage(Event.data, [
            Opaque.Positions.buffer,
            Transparent.Positions.buffer,
            Opaque.Normals.buffer,
            Transparent.Normals.buffer,
            Opaque.UVs.buffer,
            Transparent.UVs.buffer,
            Opaque.VertexAOs.buffer,
            Transparent.VertexAOs.buffer
          ]); //Need to transfer all of the contained buffers!
          this.Events.FireEventListeners("Finished");
          break;
        }
      }
    }.bind(this));
  }
}


self.onmessage = function(Event){
  EventHandler[Event.data.Request]?.(Event.data);
};

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

EventHandler.GenerateGeometryData = function(Data){
  QueueWorkerTask(Data);
};

EventHandler.GenerateVirtualGeometryData = function(Data){
  QueueWorkerTask(Data);
};

EventHandler.SaveStuff = function(Data){
  MaxWorkers = Data.Workers;
  delete Data.Workers;
  SaveStuff = Data;
  RequiredRegions = Data.RequiredRegions;
  Initialise();
};

function Initialise(){
  for(let i = 0; i < MaxWorkers; i++){
    let WorkerClass = new WorkerGeometryDataGenerator;
    Workers.push(WorkerClass);
    WorkerClass.Events.AddEventListener("Finished", (function(ID){
      return function(){
        QueueStep(ID);
      };
    }.bind(this))(i));
  }
}
