import Listenable from "../../Libraries/Listenable/Listenable.mjs";
import "../../Weightings.mjs";

debugger;

let EventHandler = {};
let Count = 0;
let Workers = [];
let Queue = [];
const MaxWorkers = 6;

let RequiredRegions;

class WorkerHeightCalculator{
  constructor(){
    this.Events = new Listenable;
    this.Busy = false;
    this.Worker = new Worker("./WorkerHeightCalculator.mjs", {"type": "module"});
    this.Worker.addEventListener("message", function(Event){
      switch(Event.data.Request){
        case "SaveHeightMap":{
          self.postMessage(Event.data);
          this.Events.FireEventListeners("Finished");
          break;
        }
      }
    }.bind(this));
    this.Worker.postMessage({
      "Request": "SaveWeightings",
      "Weightings": Weightings
    });
    this.Events.AddEventListener("Finished", function(){
      this.Busy = false;
    }.bind(this));
  }
}

for(let i = 0; i < MaxWorkers; i++){
  let WorkerClass = new WorkerHeightCalculator;
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

function QueueWorkerTask(Data){
  for(let i = 0; i < MaxWorkers; i++){
    if(!Workers[i].Busy){
      Workers[i].Worker.postMessage(Data);
      Workers[i].Busy = true;
      return;
    }
  }
  Queue.push(Data);
}

function QueueStep(ID){
  if(Queue.length === 0) return;
  //console.log(ID);
  Workers[ID].Worker.postMessage(Queue[0]);
  Queue.shift();
  Workers[ID].Busy = true;
}

EventHandler.SetSeed = function(Data){
  for(let i = 0; i < MaxWorkers; i++){
    Workers[i].Worker.postMessage(Data);
  }
}

EventHandler.GenerateHeightMap = function(Data){
  QueueWorkerTask(Data);
}
