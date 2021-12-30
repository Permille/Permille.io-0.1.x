import Utilities from "../../Libraries/Utilities/0.7.13.8/Utilities.mjs";
import ScalesContainer from "./ScalesContainer.mjs";
export default class SVM{
  static INTERPOLATION_NEAREST_NEIGHBOUR = 1;
  static INTERPOLATION_HIGHEST_FREQUENCY = 2;
  static INTERPOLATION_COMMON_BLOCKS = 3;
  constructor(Scales, Metadata = null, Info = {}){
    this.Scales = Scales;
    this.Metadata = Metadata;
    this.Info = Info;
  }
  DirectPaste(X, Y, Z, ScaleID, BlockRegistry, Setter, IgnoreAir = false){
    const Scale = this.Scales.GetScale(ScaleID, BlockRegistry);
    const StartX = X + Scale.XOffset;
    const StartY = Y + Scale.YOffset;
    const StartZ = Z + Scale.ZOffset;
    const Data = Scale.Data;
    for(let x = StartX, XMax = Scale.XLength + StartX, Stride = 0; x < XMax; x++){
      for(let y = StartY, YMax = Scale.YLength + StartY; y < YMax; y++){
        for(let z = StartZ, ZMax = Scale.ZLength + StartZ; z < ZMax; z++, Stride++){
          if(!IgnoreAir || Data[Stride] !== 0) Setter(x, y, z, Data[Stride]);
        }
      }
    }
  }
  static FromObject(OriginalSVMObject){
    const SVMObject = {};
    Object.assign(SVMObject, OriginalSVMObject);
    Object.setPrototypeOf(SVMObject, SVM.prototype);
    Object.setPrototypeOf(SVMObject.Scales, ScalesContainer.prototype);
    return SVMObject;
  }
};
