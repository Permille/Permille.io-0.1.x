import SVM from "./SVM.mjs";
export default class ScalesContainer{
  constructor(Scales, InterpolationMethod = SVM.INTERPOLATION_NEAREST_NEIGHBOUR, BlockRegistry = null){
    this.Scales = Scales;
    this.InterpolationMethod = InterpolationMethod;
    this.BlockRegistry = BlockRegistry;
  }
  GetScale(Scale, p_BlockRegistry = null){
    if(this.Scales[Scale]) return this.Scales[Scale];
    const BlockRegistry = p_BlockRegistry || this.BlockRegistry;
    if(!BlockRegistry){
      throw new Error("Scale Containers need access to a block registry to calculate smaller scales.");
    }
    // Interpolate new scale, and then save it in the Scales for easier reuse.
    // Assumes that the 1:1 scale is available.
    const Scale1 = this.Scales[1];
    const Scale1Data = Scale1.Data;
    const OriginalXLength = this.Scales[1].XLength;
    const OriginalYLength = this.Scales[1].YLength;
    const OriginalZLength = this.Scales[1].ZLength;
    const ScaledXLength = Math.ceil(OriginalXLength / Scale);
    const ScaledYLength = Math.ceil(OriginalYLength / Scale);
    const ScaledZLength = Math.ceil(OriginalZLength / Scale);

    const Data = new Uint16Array(ScaledXLength * ScaledYLength * ScaledZLength);
    for(let x = 0, Stride = 0; x < ScaledXLength; x++) for(let y = 0; y < ScaledYLength; y++) for(let z = 0; z < ScaledZLength; z++, Stride++){
      const NewX = Math.floor(x * Scale);
      const NewY = Math.floor(y * Scale);
      const NewZ = Math.floor(z * Scale);
      let Block = 0;
      let CurrentPrecedence = -Infinity;
      for(let dx = NewX; dx < Scale + NewX && dx < OriginalXLength; dx++) for(let dy = NewY; dy < Scale + NewY && dy < OriginalYLength; dy++) for(let dz = NewZ; dz < Scale + NewZ && dz < OriginalZLength; dz++){
        const NewBlock = Scale1Data[dx * OriginalYLength * OriginalZLength + dy * OriginalZLength + dz];
        const NewPrecedence = BlockRegistry.GetBlockByID(NewBlock).Properties.Precedence || 0;
        if(CurrentPrecedence < NewPrecedence || NewBlock === 6){
          CurrentPrecedence = NewPrecedence;
          Block = NewBlock;
        }
      }
      Data[Stride] = Block;
    }
    this.Scales[Scale] = {
      "XOffset": Math.floor(Scale1.XOffset / Scale),
      "YOffset": Math.floor(Scale1.YOffset / Scale),
      "ZOffset": Math.floor(Scale1.ZOffset / Scale),
      "XLength": ScaledXLength,
      "YLength": ScaledYLength,
      "ZLength": ScaledZLength,
      "Data": Data
    };
    return this.Scales[Scale];
  }

  GetScale_NearestNeighbour(Scale){
    if(this.Scales[Scale]) return this.Scales[Scale];

    // Interpolate new scale, and then save it in the Scales for easier reuse.
    // Assumes that the 1:1 scale is available.
    const Scale1 = this.Scales[1];
    const Scale1Data = Scale1.Data;
    const OriginalXLength = this.Scales[1].XLength;
    const OriginalYLength = this.Scales[1].YLength;
    const OriginalZLength = this.Scales[1].ZLength;
    const ScaledXLength = Math.ceil(OriginalXLength / Scale);
    const ScaledYLength = Math.ceil(OriginalYLength / Scale);
    const ScaledZLength = Math.ceil(OriginalZLength / Scale);

    const Data = new Uint16Array(ScaledXLength * ScaledYLength * ScaledZLength);
    for(let x = 0, Stride = 0; x < ScaledXLength; x++) for(let y = 0; y < ScaledYLength; y++) for(let z = 0; z < ScaledZLength; z++, Stride++){
      const NewX = Math.floor(x * Scale);
      const NewY = Math.floor(y * Scale);
      const NewZ = Math.floor(z * Scale);
      Data[Stride] = Scale1Data[NewX * OriginalYLength * OriginalZLength + NewY * OriginalZLength + NewZ];
    }
    this.Scales[Scale] = {
      "XOffset": Math.floor(Scale1.XOffset / Scale),
      "YOffset": Math.floor(Scale1.YOffset / Scale),
      "ZOffset": Math.floor(Scale1.ZOffset / Scale),
      "XLength": ScaledXLength,
      "YLength": ScaledYLength,
      "ZLength": ScaledZLength,
      "Data": Data
    };
    return this.Scales[Scale];
  }
  //Biased for non-air.
  GetVerticalScale(Scale){
    if(this.Scales["Y" + Scale]) return this.Scales["Y" + Scale];
    const Scale1 = this.Scales[1];
    const Scale1Data = Scale1.Data;
    const OriginalXLength = this.Scales[1].XLength;
    const OriginalYLength = this.Scales[1].YLength;
    const OriginalZLength = this.Scales[1].ZLength;
    const ScaledYLength = Math.ceil(OriginalYLength / Scale);

    const Data = new Uint16Array(OriginalXLength * ScaledYLength * OriginalZLength);
    for(let x = 0, Stride = 0; x < OriginalXLength; x++) for(let y = 0; y < ScaledYLength; y++) for(let z = 0; z < OriginalZLength; z++, Stride++){
      const NewX = x;
      const NewY = Math.floor(y * Scale);
      const NewZ = z;

      let Block = 0; //Air
      for(let dy = NewY; dy < OriginalYLength && dy < NewY + Scale; dy++) Block ||= Scale1Data[NewX * OriginalYLength * OriginalZLength + dy * OriginalZLength + NewZ];

      Data[Stride] = Block;
    }
    this.Scales["Y" + Scale] = {
      "XOffset": Scale1.XOffset,
      "YOffset": Math.floor(Scale1.YOffset / Scale),
      "ZOffset": Scale1.ZOffset,
      "XLength": OriginalXLength,
      "YLength": ScaledYLength,
      "ZLength": OriginalZLength,
      "Data": Data
    };
    return this.Scales["Y" + Scale];
  }
  _GetVerticalScale(Scale){
    if(this.Scales["Y" + Scale]) return this.Scales["Y" + Scale];
    const Scale1 = this.Scales[1];
    const Scale1Data = Scale1.Data;
    const OriginalXLength = this.Scales[1].XLength;
    const OriginalYLength = this.Scales[1].YLength;
    const OriginalZLength = this.Scales[1].ZLength;
    const ScaledYLength = Math.ceil(OriginalYLength / Scale);

    const Data = new Uint16Array(OriginalXLength * ScaledYLength * OriginalZLength);
    for(let x = 0, Stride = 0; x < OriginalXLength; x++) for(let y = 0; y < ScaledYLength; y++) for(let z = 0; z < OriginalZLength; z++, Stride++){
      const NewX = x;
      const NewY = Math.floor(y * Scale);
      const NewZ = z;
      Data[Stride] = Scale1Data[NewX * OriginalYLength * OriginalZLength + NewY * OriginalZLength + NewZ];
    }
    this.Scales["Y" + Scale] = {
      "XOffset": Scale1.XOffset,
      "YOffset": Math.floor(Scale1.YOffset / Scale),
      "ZOffset": Scale1.ZOffset,
      "XLength": OriginalXLength,
      "YLength": ScaledYLength,
      "ZLength": OriginalZLength,
      "Data": Data
    };
    return this.Scales["Y" + Scale];
  }
};
