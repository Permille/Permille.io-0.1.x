export default class Listenable{
  static Version = "1.1";
  static Build = 2;
  constructor(){
    this.EventListeners = [];
  }
  AddEventListener(Event, Listener, Options = {"TTL": Infinity, "Once": false}){
    this.EventListeners.push({
      "Event": Event,
      "Listener": Listener,
      "Options": Options
    });
    return this.EventListeners.length - 1;
  }
  RemoveEventListener(ID){
    this.EventListeners.splice(ID, 1);
  }
  FireEventListeners(Event, ...Parameters){
    for(let i = 0; i < this.EventListeners.length; i++){
      if(Event === this.EventListeners[i].Event){
        this.EventListeners[i].Listener(...Parameters);
        if(!(this.EventListeners[i].Options.TTL --> 0) || this.EventListeners[i].Options.Once === true){
          this.EventListeners.splice(i--, 1);
        }
      }
    }
  }
  on(...Args){
    this.AddEventListener(...Args);
  }
}
