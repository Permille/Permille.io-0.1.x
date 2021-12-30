export default class TwoWayMap{
  constructor(Map, Overwrite = false){
    this.Map = Map;
    this.ReverseMap = {};
    for(const Key in Map) this.ReverseMap[Map[Key]] = Key;

    this.Overwrite = Overwrite;
  }
  Get(Key){
    return this.Map[Key];
  }
  ReverseGet(Key){
    return this.ReverseMap[Key];
  }
  Set(Key, Value){
    if(!this.Overwrite && this.ReverseMap[Value] !== undefined) return;
    delete this.ReverseMap[this.Map[Key]];
    delete this.Map[this.ReverseMap[Value]];
    this.Map[Key] = Value;
    this.ReverseMap[Value] = Key;
  }
}
