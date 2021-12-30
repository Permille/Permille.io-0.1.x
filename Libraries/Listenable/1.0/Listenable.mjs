export default class Listenable{
  static Version = "1.0";
  static Build = 1;
  constructor(){
    this.EventListeners = [];
  }
  AddEventListener(Event, Listener){
    this.EventListeners.push({
      "Event": Event,
      "Listener": Listener
    });
    return this.EventListeners.length - 1;
  }
  RemoveEventListener(ID){
    this.EventListeners.splice(ID, 1);
  }
  FireEventListeners(Event, ...Parameters){
    for(let i = 0, Length = this.EventListeners.length; i < Length; i++){
      if(Event === this.EventListeners[i].Event) this.EventListeners[i].Listener(...Parameters);
    }
  }
  on(...Args){
    this.AddEventListener(...Args);
  }
}
