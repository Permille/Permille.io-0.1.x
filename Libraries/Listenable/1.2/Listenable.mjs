export default class Listenable{
  static Version = "1.2";
  static Build = 3;
  constructor(){
    this.EventListeners = [];
  }
  AddEventListener(Event, Listener, Options = {"TTL": Infinity, "Once": false}){
    if(this.EventListeners[Event] === undefined) this.EventListeners[Event] = [];
    this.EventListeners[Event].push({
      "Event": Event,
      "Listener": Listener,
      "Options": Options
    });
    return this.EventListeners[Event].length - 1;
  }
  RemoveEventListener(Event, ID){
    this.EventListeners[Event].splice(ID, 1);
  }
  FireEventListeners(Event, ...Parameters){
    if(this.EventListeners[Event] === undefined) return;
    for(let i = 0; i < this.EventListeners[Event].length; i++){
      this.EventListeners[Event][i].Listener(...Parameters);
      if(!(this.EventListeners[Event][i].Options.TTL --> 0) || this.EventListeners[Event][i].Options.Once === true){
        this.EventListeners[Event].splice(i--, 1);
      }
    }
  }
  on(...Args){
    this.AddEventListener(...Args);
  }
}
