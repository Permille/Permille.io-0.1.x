import Listenable from "./Libraries/Listenable/Listenable.mjs";

let EventHandler = {};
let Workers = [];
let Queue = [];
let MaxWorkers = 0;
let SaveStuff;
const MaxWorkerQueue = 3;

class WorkerGeometryDataGenerator{
  constructor(){
    this.Events = new Listenable;
    this.Worker = new Worker(new URL("./WorkerGeometryDataGenerator.mjs", import.meta.url));
    this.OwnQueueSize = new Uint8Array(new SharedArrayBuffer(1));

    this.Worker.postMessage({
      ...SaveStuff,
      "OwnQueueSize": this.OwnQueueSize
    });

    this.Worker.addEventListener("message", function(Event){
      switch(Event.data.Request){
        case "GenerateBoundingGeometry":{
          self.postMessage(Event.data, [Event.data.Info.buffer]);
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
      const WorkerQueueSize = Atomics.load(Workers[i].OwnQueueSize, 0);
      if(WorkerQueueSize < SmallestQueueSize){
        SmallestQueueSize = WorkerQueueSize;
        SmallestWorkerID = i;
      }
    }
    if(SmallestWorkerID === -1) break;
    Workers[SmallestWorkerID].Worker.postMessage(Queue.shift());
    Atomics.add(Workers[SmallestWorkerID].OwnQueueSize, 0, 1);
  }
}();

function QueueWorkerTask(Data){
  let SmallestWorkerID = -1;
  let SmallestQueueSize = MaxWorkerQueue;
  for(let i = 0; i < MaxWorkers; i++){
    const WorkerQueueSize = Atomics.load(Workers[i].OwnQueueSize, 0);
    if(WorkerQueueSize < SmallestQueueSize){
      SmallestQueueSize = WorkerQueueSize;
      SmallestWorkerID = i;
    }
  }

  if(SmallestWorkerID !== -1){//If the queue has space, immediately send the request to the workers.
    Workers[SmallestWorkerID].Worker.postMessage(Data);
    Atomics.add(Workers[SmallestWorkerID].OwnQueueSize, 0, 1);
  }
  else Queue.push(Data); //Otherwise, add it to the queue.
}

function QueueStep(ID){
  if(Queue.length === 0) return;
  //console.log(ID);
  Workers[ID].Worker.postMessage(Queue.shift());
  Atomics.add(Workers[ID].OwnQueueSize, 0, 1);
}

EventHandler.GenerateBoundingGeometry = function(Data){
  QueueWorkerTask(Data);
};

EventHandler.SaveStuff = function(Data){
  MaxWorkers = Data.MaxWorkers;
  SaveStuff = Data;

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
