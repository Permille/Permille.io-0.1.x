export default class Listenable{
  static Version = "1.3";
  static Build = 4;
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
    const Listeners = this.EventListeners[Event];
    if(Listeners === undefined) return;
    const ListenersCopy = [];
    for(let i = 0; i < Listeners.length; i++){
      const Listener = Listeners[i].Listener;
      if(!(this.EventListeners[Event][i].Options.TTL --> 0) || this.EventListeners[Event][i].Options.Once === true){
        this.EventListeners[Event].splice(i--, 1);
      }
      ListenersCopy.push(Listener);
    }
    //This is done to avoid infinite loop if another event listener of the same name is added in the callback
    for(const Listener of ListenersCopy) Listener(...Parameters);
  }
  on(...Args){
    this.AddEventListener(...Args);
  }
};