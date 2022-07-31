import SVM from "./SVM.mjs";
import ScalesContainer from "./ScalesContainer.mjs";
import Utilities from "../../Libraries/Utilities/0.7.13.8/Utilities.mjs";
import {SetUint, GetUint} from "../BitSetter/BitSetter.mjs";
import DefaultForeignMapping from "../../Block/DefaultForeignMapping.json";

const SIZE_HEADER = 3;
const SIZE_VERSION = 2;
const SIZE_OID_HEADER = 1;
const SIZE_CID_HEADER = 1;
const SIZE_INTERPOLATION = 1;
const SIZE_SIZE_INDICATOR = 4;
const SIZE_SCALE_NUMBER = 4;
const SIZE_SCALE_LOCATION = 4;

const SIZE_COORDINATE = 4;

//Everything will be in big endian because it will be easier to address
export default class SVMUtils{
  static VERSION = 1;
  static DefaultSVMOptions = {
    "BitsPerOID": 16,
    "BitsPerCID": -1,
    "ScaleInterpolationMethod": SVM.INTERPOLATION_NEAREST_NEIGHBOUR
  };
  static CreateSVM(Options, Scales){
    Options = Utilities.MergeObjects(Options, SVMUtils.DefaultSVMOptions);
    const BitsPerOID = Options.BitsPerOID;
    const BytesPerOID = Math.ceil(BitsPerOID / 8);

    let BufferSize = 0;
    const IDMapping = new Map;
    let CompressedIDs = 0;
    for(const Scale of Scales){
      const Data = Scale.Data;
      for(let i = 0, Length = Data.length; i < Length; i++){
        if(!IDMapping.has(Data[i])) IDMapping.set(Data[i], CompressedIDs++);
      }
    }
    const BitsPerCID = Math.ceil(Math.log2(CompressedIDs + 1));

    BufferSize += SIZE_HEADER
                + SIZE_VERSION
                + SIZE_OID_HEADER
                + SIZE_CID_HEADER
                + SIZE_SIZE_INDICATOR
                + BytesPerOID * 2 * CompressedIDs
                + SIZE_SIZE_INDICATOR
                + Scales.length * (SIZE_SCALE_NUMBER + SIZE_SCALE_LOCATION)
                + SIZE_SIZE_INDICATOR
                + (Options.Metadata?.byteLength ?? 0)
                + SIZE_INTERPOLATION
                + Scales.length * 6 * SIZE_COORDINATE
                + 4; //This +4 is to make reading data easier. Don't worry about it.

    for(const Scale of Scales){
      BufferSize += Math.ceil(Scale.Data.length * BitsPerCID / 8);
    }

    const Buffer = new ArrayBuffer(BufferSize);
    const View = new DataView(Buffer);

    let ByteOffset = 0;

    for(const Char of "svm") View.setUint8(ByteOffset++, Char.charCodeAt(0));

    View.setUint16(ByteOffset, SVMUtils.VERSION);
    ByteOffset += 2;

    View.setUint8(ByteOffset++, BitsPerOID);
    View.setUint8(ByteOffset++, BitsPerCID);

    View.setUint32(ByteOffset, BytesPerOID * 2 * CompressedIDs);
    ByteOffset += 4;

    {
      let Setter;
      let Increment;
      if(BytesPerOID === 1) Setter = View.setUint8.bind(View), Increment = 1;
      else if(BytesPerOID === 2) Setter = View.setUint16.bind(View), Increment = 2;
      else Setter = View.setUint32.bind(View), Increment = 4;
      for(const [OriginalID, CompressedID] of IDMapping){
        Setter(ByteOffset, OriginalID);
        ByteOffset += Increment;
        Setter(ByteOffset, CompressedID);
        ByteOffset += Increment;
      }
    }

    View.setUint8(ByteOffset++, Options.ScaleInterpolationMethod);

    View.setUint32(ByteOffset, Scales.length * (4 + 4));
    ByteOffset += 4;

    const ScaleByteOffsetOffsets = {};
    for(const Scale of Scales){
      View.setFloat32(ByteOffset, Scale.Scale);
      ByteOffset += 4;
      ScaleByteOffsetOffsets[Scale.Scale] = ByteOffset;
      ByteOffset += 4;
    }

    View.setUint32(ByteOffset, Options.Metadata?.byteLength ?? 0);
    ByteOffset += 4;

    if(Options.Metadata){
      const MetadataArray = new Uint8Array(Options.Metadata); //Could've also made a DataView but this might be faster.
      //Not sure how safe TypedArray.set would be here due to possible endianness issues...
      for(let i = 0, Length = MetadataArray.length; i < Length; i++){
        View.setUint8(ByteOffset++, MetadataArray[i]);
      }
    }

    for(const Scale of Scales){
      View.setUint32(ScaleByteOffsetOffsets[Scale.Scale], ByteOffset);

      View.setUint32(ByteOffset, Scale.XLength);
      ByteOffset += 4;
      View.setUint32(ByteOffset, Scale.YLength);
      ByteOffset += 4;
      View.setUint32(ByteOffset, Scale.ZLength);
      ByteOffset += 4;
      View.setUint32(ByteOffset, Scale.XOffset);
      ByteOffset += 4;
      View.setUint32(ByteOffset, Scale.YOffset);
      ByteOffset += 4;
      View.setUint32(ByteOffset, Scale.ZOffset);
      ByteOffset += 4;

      const CompressedSetter = SetUint(View, ByteOffset, BitsPerCID);
      const Data = Scale.Data;

      for(let i = 0, Length = Data.length; i < Length; i++){
        CompressedSetter(i, IDMapping.get(Data[i]));
      }

      ByteOffset += Math.ceil(Data.length * BitsPerCID / 8);
    }

    return Buffer;
  }

  static DeserialiseSVM(SVM){
    let View = new DataView(SVM);
    let ByteOffset = 0;

    let ValidHeader = true;
    if(
      String.fromCharCode(View.getUint8(0)) !== "s" ||
      String.fromCharCode(View.getUint8(1)) !== "v" ||
      String.fromCharCode(View.getUint8(2)) !== "m"){

      console.warn("Invalid header. This probably isn't an svm.");
      ValidHeader = false;
    }
    ByteOffset += 3;

    const Version = View.getUint16(ByteOffset);
    ByteOffset += 2;

    const BitsPerOID = View.getUint8(ByteOffset++);
    const BytesPerOID = Math.ceil(BitsPerOID / 8);
    const BitsPerCID = View.getUint8(ByteOffset++);
    const BytesPerCID = Math.ceil(BitsPerCID / 8);

    const ReverseIDMapping = new Map;

    {
      const IDMappingSize = View.getUint32(ByteOffset);
      ByteOffset += 4;

      let Getter;
      let Increment;
      if(BytesPerOID === 1) Getter = View.getUint8.bind(View), Increment = 1;
      else if(BytesPerOID === 2) Getter = View.getUint16.bind(View), Increment = 2;
      else Getter = View.getUint32.bind(View), Increment = 4;

      const FinalOffset = ByteOffset + IDMappingSize;
      while(ByteOffset < FinalOffset){
        ReverseIDMapping.set(Getter(ByteOffset + Increment), Getter(ByteOffset));
        ByteOffset += Increment * 2;
      }
    }

    const InterpolationMethod = View.getUint8(ByteOffset++);

    const ScaleIndex = new Map;

    {
      const ScaleIndexSize = View.getUint32(ByteOffset);
      ByteOffset += 4;

      const FinalOffset = ScaleIndexSize + ByteOffset;
      while(ByteOffset < FinalOffset){
        ScaleIndex.set(View.getFloat32(ByteOffset), View.getUint32(ByteOffset + 4));
        ByteOffset += 8;
      }
    }

    const MetadataSize = View.getUint32(ByteOffset);
    ByteOffset += 4;

    const Metadata = new ArrayBuffer(MetadataSize);

    {
      const MetadataArray = new Uint8Array(Metadata);

      for(let i = 0, Length = MetadataArray.length; i < Length; i++){
        MetadataArray[i] = View.getUint8(ByteOffset++);
      }
    }


    const Scales = {};

    for(const [ScaleValue, Offset] of ScaleIndex){
      Scales[ScaleValue] = {};
      const ScaleObject = Scales[ScaleValue];
      ScaleObject.Scale = ScaleValue;

      ScaleObject.XLength = View.getUint32(Offset + 0);
      ScaleObject.YLength = View.getUint32(Offset + 4);
      ScaleObject.ZLength = View.getUint32(Offset + 8);
      ScaleObject.XOffset = View.getUint32(Offset + 12);
      ScaleObject.YOffset = View.getUint32(Offset + 16);
      ScaleObject.ZOffset = View.getUint32(Offset + 20);

      const CompressedGetter = GetUint(View, Offset + 24, BitsPerCID);

      let Data;

      const Size = ScaleObject.XLength * ScaleObject.YLength * ScaleObject.ZLength;

      if(BytesPerOID === 1) Data = new Uint8Array(Size);
      else if(BytesPerOID === 2) Data = new Uint16Array(Size);
      else Data = new Uint32Array(Size);

      //I am creating typed arrays instead of DataViews because I want to convert the data to the system's endianness.

      for(let i = 0, Length = Data.length; i < Length; i++){
        Data[i] = ReverseIDMapping.get(CompressedGetter(i));
      }

      ScaleObject.Data = Data;
    }

    return new SVM(new ScalesContainer(Scales, InterpolationMethod), Metadata, {
      "Version": Version,
      "ValidHeader": ValidHeader
    });
  }

  static DeserialiseBOP(BOPFile, Mapping, Offset){
    if(!Mapping){
      Mapping = {
        "biomesoplenty:leaves_4:2": Application.Main.BlockRegistry.GetBlockByIdentifier("default:leaves").ID,
        "biomesoplenty:log_2": Application.Main.BlockRegistry.GetBlockByIdentifier("default:wood").ID,
        "biomesoplenty:log_2:8": Application.Main.BlockRegistry.GetBlockByIdentifier("default:wood").ID,
        "minecraft:spruce_log": Application.Main.BlockRegistry.GetBlockByIdentifier("default:wood").ID,
        "minecraft:spruce_leaves": Application.Main.BlockRegistry.GetBlockByIdentifier("default:leaves").ID,
        "minecraft:oak_log": Application.Main.BlockRegistry.GetBlockByIdentifier("default:oak_wood").ID,
        "minecraft:oak_leaves": Application.Main.BlockRegistry.GetBlockByIdentifier("default:oak_leaves").ID,
        "NotFound": Application.Main.BlockRegistry.GetBlockByIdentifier("primary:error").ID,
        "LOG": Application.Main.BlockRegistry.GetBlockByIdentifier("default:oak_wood").ID,
        "LEAVES": Application.Main.BlockRegistry.GetBlockByIdentifier("default:oak_leaves").ID
      };
    }
    let Lines = BOPFile.split("\u000a");

    const MappedBlocks = new Map;

    const XOffset = Offset.X;
    const YOffset = Offset.Y;
    const ZOffset = Offset.Z;

    let MinX = Infinity, MinY = Infinity, MinZ = Infinity;
    let MaxX = -Infinity, MaxY = -Infinity, MaxZ = -Infinity;

    for(let i = 0; i < Lines.length; i++){
      if(!(Lines[i].includes("(") && (Lines[i].split("(")[0] === "Block" || Lines[i].split("(")[0] === "B"))) continue;
      let Params = Lines[i].split("(")[1].split(")")[0].split(/\,\s?(?![^\[]*\])/);

      const RelativeX = Number.parseInt(Params[0]) + XOffset;
      const RelativeY = Number.parseInt(Params[1]) + YOffset;
      const RelativeZ = Number.parseInt(Params[2]) + ZOffset;
      const ForeignType = Params[3].replace(/ *\[[^)]*\] */g, "");

      MappedBlocks.set(RelativeX + ", " + RelativeY + ", " + RelativeZ, {
        "RelativeX": RelativeX,
        "RelativeY": RelativeY,
        "RelativeZ": RelativeZ,
        "ForeignType": ForeignType
      });

      if(MinX > RelativeX) MinX = RelativeX;
      if(MaxX < RelativeX) MaxX = RelativeX;
      if(MinY > RelativeY) MinY = RelativeY;
      if(MaxY < RelativeY) MaxY = RelativeY;
      if(MinZ > RelativeZ) MinZ = RelativeZ;
      if(MaxZ < RelativeZ) MaxZ = RelativeZ;
    }

    const XLength = MaxX - MinX + 1;
    const YLength = MaxY - MinY + 1;
    const ZLength = MaxZ - MinZ + 1;

    const DataArray = new Uint16Array(XLength * YLength * ZLength);

    for(const [Identifier, Block] of MappedBlocks){
      const X = Block.RelativeX - MinX;
      const Y = Block.RelativeY - MinY;
      const Z = Block.RelativeZ - MinZ;
      const Index = X * YLength * ZLength + Y * ZLength + Z;
      DataArray[Index] = Mapping[Block.ForeignType] ?? Mapping["NotFound"];
    }

    return new SVM(new ScalesContainer({
      1: {
        "XOffset": MinX,
        "YOffset": MinY,
        "ZOffset": MinZ,
        "XLength": XLength,
        "YLength": YLength,
        "ZLength": ZLength,
        "Data": DataArray
      }
    }), null, {"FromBOP": true}); //Nearest neighbour interpolation method
  }
};
