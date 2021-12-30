export function SetUint(View, ReadOffset, BitSize){ //Wont work for >Uint24.
  return function(Position, Value){
    Value &= (1 << BitSize) - 1;
    const Index32 = ReadOffset + Math.floor(Position * BitSize / 8);
    const Index32Offset = (Position * BitSize) & 7;
    let Uint32 = View.getUint32(Index32, true);

    Uint32 &= ~(((1 << BitSize) - 1) << Index32Offset); //Clear bits
    Uint32 |= Value << Index32Offset; //Set bits

    View.setUint32(Index32, Uint32, true);
  };
};


export function GetUint(View, ReadOffset, BitSize){ //Wont work for >Uint24.
  return function(Position){
    const Index32 = ReadOffset + Math.floor(Position * BitSize / 8);
    const Index32Offset = (Position * BitSize) & 7;
    return (View.getUint32(Index32, true) >> Index32Offset) & ((1 << BitSize) - 1);
  };
};
