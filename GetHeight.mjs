import Simplex from "./Simplex.js";

//Weighting functions:
//https://www.desmos.com/calculator/jc40rsanua

function SerpentineWeightingFunction(Value, Exponent){
  const Intermediate = (2 * Value - 1) / ((2 * Value - 1) ** 2 + 1);
  return (Math.sign(Intermediate) * Math.abs(Intermediate) ** Exponent + 0.5 ** Exponent) / Exponent ** (-Exponent);
}

function ExponentialWeightingFunction(Value, Exponent){
  return Math.expm1(Math.pow(Value, Exponent)) / Math.expm1(1);
}

const SerpentineWeighting = [];
for(let i = 0; i < 150; i++){
  SerpentineWeighting[i] = new Float32Array(501);
  for(let j = 0, Weighting = SerpentineWeighting[i]; j < 501; j++){
    Weighting[j] = SerpentineWeightingFunction(j / 500, i / 150);
  }
}

const ExponentialWeighting = [];
for(let i = 250; i < 450; i++){
  ExponentialWeighting[i] = new Float32Array(771);
  for(let j = 0, Weighting = ExponentialWeighting[i]; j < 771; j++){
    Weighting[j] = ExponentialWeightingFunction(j / 500, i / 150);
  }
}

//Less expensive approximation functions:

function GetSerpentineWeightingAt(Value, Exponent){
  let ValueIndex = Value * 100;
  let ExponentIndex = Exponent * 500;
  let ValueOffset = ValueIndex - (ValueIndex >>= 0);
  let ExponentOffset = ExponentIndex - (ExponentIndex >>= 0);
  //Precalculate derivatives?
  let CurrentValue = SerpentineWeighting[ValueIndex][ExponentIndex];
  return CurrentValue + (ValueOffset * (SerpentineWeighting[ValueIndex + 1][ExponentIndex] - CurrentValue) + ExponentOffset * (SerpentineWeighting[ValueIndex][ExponentIndex + 1] - CurrentValue));
}

function GetExponentialWeightingAt(Value, Exponent){
  let ValueIndex = Value * 100;
  let ExponentIndex = Exponent * 500;
  let ValueOffset = ValueIndex - (ValueIndex >>= 0);
  let ExponentOffset = ExponentIndex - (ExponentIndex >>= 0);
  //Precalculate derivatives?
  let CurrentValue = ExponentialWeighting[ValueIndex][ExponentIndex];
  return CurrentValue + (ValueOffset * (ExponentialWeighting[ValueIndex + 1][ExponentIndex] - CurrentValue) + ExponentOffset * (ExponentialWeighting[ValueIndex][ExponentIndex + 1] - CurrentValue));
}

function GetDerivedArcTangentWeightingAt(Value){
  return 1 / (Value ** 2 + 1);
}

function WeightTowards(PeakX, Distribution, Exponent){
  return function(X){
    return GetDerivedArcTangentWeightingAt((X - PeakX) / Distribution) ** Exponent;
  };
}

function GetSharpWeightingAt(Value){
  const z = 1;
  const f = 1;
  return (z ** 2 + 1) / ((Math.abs(f * Value) + z) ** 2 + 1);
}

function WeightTowardsSharp(PeakX, Distribution){
  return function(X){
    return GetSharpWeightingAt((X - PeakX) / Distribution);
  };
}

function GetRepeatingSharpWeightingAt(Value){
  return 1 - Math.abs(Math.sin(Value));
}

function WeightTowardsRepeatingSharp(PeakX, Distribution){
  return function(X){
    return GetRepeatingSharpWeightingAt((X - PeakX) / Distribution);
  };
}

let RockyWeighting = WeightTowards(1000, 200, 1);
let SmoothShoreWeighting = WeightTowards(-0, 30, 1);
let MountainWeighting = WeightTowards(300, 200, 1);
let OtherMountainWeighting = WeightTowards(1200, 300, 1);
let SmootherValleyWeighting = WeightTowards(0, 150, 1);
let OneWeighting = WeightTowards(1.02, 0.17, 1);
let OneSmallerWeighting = WeightTowards(1.01, 0.05, 1);

let Weighting150 = WeightTowardsSharp(150, 20);
let Weighting100 = WeightTowardsSharp(100, 25);

let Things = WeightTowardsRepeatingSharp(0, 0.1);

export function GetHeight(X, Z){
  X *= .5;
  Z *= .5;

  let Smoothness = GetSerpentineWeightingAt(1.4, Simplex.simplex3(X / 10000, Z / 10000, 1536) / 2 + 0.5);
  let FlatLevel = (Simplex.simplex3(X / 30000, Z / 30000, 1536) / 2 + 0.5) * 200;

  let OctaveSum = 0;
  for(let i = 1; i < 9; i++){
    OctaveSum += Simplex.simplex3(X / 2 ** (1.08 * i + 3), Z / 2 ** (1.08 * i + 3), 1536) * 2 ** i;
  }

  let Mountain = (1 - Math.abs( (Math.sin(Math.PI * (Simplex.simplex3(X / 2500, Z / 2500, 1100) - 0.5)) / 2 + 0.5) ** 0.5 ));

  let OtherMountain = (1 - Math.abs( (Math.sin(Math.PI * (Simplex.simplex3(X / 12500, Z / 12500, 1100) - 0.5)) / 2 + 0.5) ** 0.5 ));
  OtherMountain *= 0.7 * OneWeighting(OtherMountain) + 0.3 * OneSmallerWeighting(OtherMountain);

  OctaveSum *= Smoothness;
  OctaveSum += (1 - Smoothness) * FlatLevel;

  let OtherMountainLevel = (Simplex.simplex3(X / 15000, Z / 15000, 1236) / 2 + 0.5) * 1200;
  OtherMountainLevel *= Smoothness;

  const MountainWeight = MountainWeighting(OctaveSum);
  const OtherWeight = OtherMountainWeighting(OtherMountainLevel + OctaveSum);

  let Result = OctaveSum;
  Result += Mountain * MountainWeight * 200;
  Result += OtherMountain * OtherWeight * 800;
  Result += Weighting150(OctaveSum) * (1 - Mountain * MountainWeight) ** 1 * 40;
  Result -= Things(Simplex.simplex3(X / 1200, Z / 1200, 1100)) * OtherMountain * OtherWeight * 10;
  Result += Weighting100(OctaveSum) * (Mountain * MountainWeight) ** 0.7 * 70;

  Result *= 1 - SmoothShoreWeighting(Result);

  return Result / .5;
};

export function ReSeed(NewSeed){
  Simplex.seed(NewSeed);
};
