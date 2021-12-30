export class Uint1Array{
  constructor(SizeOrBuffer){
    if(typeof SizeOrBuffer === "number"){
      this.Length = ((SizeOrBuffer - 1 >> 3) + 1) << 3;
      this.Buffer = new ArrayBuffer((this.Length >> 4) + 1);
      this.InternalUint8Array = new Uint8Array(this.Buffer);
    }
  }
  Get(Index){
    if(Index >= this.Length) return 0;
    const IndexMod = Index & 7;
    return (this.InternalUint8Array[Index >> 3] & (1 << IndexMod)) >> IndexMod;
  }
  UnsafeGet(Index){
    const IndexMod = Index & 7;
    return (this.InternalUint8Array[Index >> 3] & (1 << IndexMod)) >> IndexMod;
  }
  EmptySet(Index, Value){
    if(Index >= this.Length) return;
    this.InternalUint8Array[Index >> 3] |= Value << (Index & 7);
  }
  UnsafeEmptySet(Index, Value){
    this.InternalUint8Array[Index >> 3] |= Value << (Index & 7);
  }
  Set(Index, Value){
    if(Index >= this.Length) return;
    const IndexMod = Index & 7;
    const ArrayIndex = Index >> 3;
    this.InternalUint8Array[ArrayIndex] = (this.InternalUint8Array[ArrayIndex] & ~(1 << (Index & 7))) | (Value << (Index & 7));
  }
  UnsafeSet(Index, Value){
    const IndexMod = Index & 7;
    const ArrayIndex = Index >> 3;
    this.InternalUint8Array[ArrayIndex] = (this.InternalUint8Array[ArrayIndex] & ~(1 << (Index & 7))) | (Value << (Index & 7));
  }
}

export class PerformanceTest{
  static TestUint8ArrayGet(Size = 1048576){
    let a = new Uint8Array(Size);
    for(let i = 0; i < Size; i++) a[i] = (Math.random() * 256) >> 0;
    let Sum = 0;
    let Time = window.performance.now();
    for(let i = 0; i < Size; i++) Sum += a[i];
    return window.performance.now() - Time;
  }
  static TestUint8ArraySet(Size = 1048576){
    let a = new Uint8Array(Size);
    let Time = window.performance.now();
    for(let i = 0; i < Size; i++) a[i] = 1;
    return window.performance.now() - Time;
  }
  static TestSmallIntArrayUnsafeGet(ArrayType, Size = 1048576){
    let a = new ArrayType(Size);
    for(let i = 0; i < Size; i++) a.UnsafeEmptySet(i, Math.round(Math.random()));
    let Sum = 0;
    let Time = window.performance.now();
    for(let i = 0; i < Size; i++) Sum += a.UnsafeGet(i);
    return window.performance.now() - Time;
  }
  static TestSmallIntArrayUnsafeEmptySet(ArrayType, Size = 1048576){
    let a = new ArrayType(Size);
    let Time = window.performance.now();
    for(let i = 0; i < Size; i++) a.UnsafeEmptySet(i, 1);
    return window.performance.now() - Time;
  }
  static TestSmallIntArrayUnsafeSet(ArrayType, Size = 1048576){
    let a = new ArrayType(Size);
    let Time = window.performance.now();
    for(let i = 0; i < Size; i++) a.UnsafeSet(i, 1);
    return window.performance.now() - Time;
  }
  static TestSmallIntArrayGet(ArrayType, Size = 1048576){
    let a = new ArrayType(Size);
    for(let i = 0; i < Size; i++) a.UnsafeEmptySet(i, Math.round(Math.random()));
    let Sum = 0;
    let Time = window.performance.now();
    for(let i = 0; i < Size; i++) Sum += a.Get(i);
    return window.performance.now() - Time;
  }
  static TestSmallIntArrayEmptySet(ArrayType, Size = 1048576){
    let a = new ArrayType(Size);
    let Time = window.performance.now();
    for(let i = 0; i < Size; i++) a.EmptySet(i, 1);
    return window.performance.now() - Time;
  }
  static TestSmallIntArraySet(ArrayType, Size = 1048576){
    let a = new ArrayType(Size);
    let Time = window.performance.now();
    for(let i = 0; i < Size; i++) a.Set(i, 1);
    return window.performance.now() - Time;
  }
}
