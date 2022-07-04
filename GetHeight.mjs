import Simplex from "./Simplex.js";
import Worley from "./Libraries/TooLoud/src/Worley.js";
const WorleyNoise = new Worley;

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

function GetAsymmetricWeightingAt1(Value){
  return 2. / (1. + (Math.abs(((2. - Math.sign(Value)) * Value) ** (1.75 + Math.sign(Value) * .75)) + 1.) ** 2.);
}

function GetAsymmetricWeightingAt(Value){
  return 2. / (1. + (Math.abs((2. - 3. * Math.sign(Value)) * Value) + 1.) ** 2.);
}

function WeightTowardsSharp(PeakX, Distribution){
  return function(X){
    return GetSharpWeightingAt((X - PeakX) / Distribution);
  };
}

function WeightTowardsAsymmetric(PeakX, Distribution){
  return function(X){
    return GetAsymmetricWeightingAt((X - PeakX) / Distribution);
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

function GetRepeatingSharpWeightingAt2(Value){
  return 1 - Math.abs(Math.sin(.25 * Value));
}

function WeightTowardsRepeatingSharp2(PeakX, Distribution){
  return function(X){
    return GetRepeatingSharpWeightingAt2((X - PeakX) / Distribution);
  };
}

let RockyWeighting = WeightTowards(1000, 200, 1);
let SmoothShoreWeighting = WeightTowards(-0, 30, 1);
let MountainWeighting = WeightTowards(300, 200, 1);
let SharperMountainWeighting = WeightTowards(300, 50, 1);
let OtherMountainWeighting = WeightTowards(1200, 300, 1);
let SmootherValleyWeighting = WeightTowards(0, 150, 1);
let OneWeighting = WeightTowards(1.02, 0.17, 1);
let OneSmallerWeighting = WeightTowards(1.01, 0.05, 1);

let Weighting150 = WeightTowardsSharp(150, 20);
let Weighting100 = WeightTowardsSharp(100, 25);

let Things = WeightTowardsRepeatingSharp(0, 0.1);

let Cliffs1 = WeightTowardsRepeatingSharp(0., .0251);
const Cliffs2 = WeightTowardsRepeatingSharp2(0., .00251);


const Weighting1 = WeightTowards(.47, .12, .57);
const Weighting2 = WeightTowardsSharp(.4, .04);

const Weighting15 = WeightTowardsSharp(.15, .0014);

export function _GetHeight(X, Z){
  //return X / 140.;//0.;//(X + Z) / 6. + 64.;//128.;//254. + //
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
  Result /= .5;

  return Result;// + Math.floor((X + Z) / 100.) * 64.;
};

export function GetHeight(X, Z){
  X -= 500;
  //return 0;//(((X & 7) === 3 || (X & 7) === 4) && ((Z & 7) === 3 || (Z & 7) === 4)) ? 192. : 0.;
  //return 10;
  /* //Basic volcano
  const Worley = WorleyNoise.Euclidean(X / 1000., Z / 1000., 0.);
  return MountainWeighting(Worley[0] * 41100.) * 200.;
   */


  //Looks like a nice texture for mountains
  /*let OctaveSum = 0;
  for(let i = 1; i < 9; i++){
    OctaveSum += Simplex.simplex3(X / 2 ** (i + 3), Z / 2 ** (i + 3), 1536) * 2 ** i;
  }

  const Worley = WorleyNoise.Euclidean((X + OctaveSum / 2.) / 100., (Z + OctaveSum / 2.) / 100., 0.);
  return Math.pow(Worley[0], .3) * 200.;*/

  /* //Could be another good base for mountains
  let OctaveSum = 0;
  for(let i = 1; i < 9; i++){
    OctaveSum += Simplex.simplex3(X / 2 ** (i + 3), Z / 2 ** (i + 3), 1536) * 2 ** i;
  }

  const Worley = WorleyNoise.Euclidean((X + OctaveSum) / 100., (Z + OctaveSum) / 100., 0.);
  return MountainWeighting(Math.pow(Worley[0], .3) * 200. + 100.) * 200.;

   */

  /* //Very good mountain map
  let OctaveSum = 0;
  for(let i = 1; i < 9; i++){
    OctaveSum += Simplex.simplex3(X / 2 ** (i + 3), Z / 2 ** (i + 3), 1536) * 2 ** i;
  }

  return Weighting1(OctaveSum / 512.) * 200.;

   */
  //return WeightTowardsAsymmetric(300., 100.)(X) * 200.;

  //return WorleyNoise.FasterNoise(X / 130., Z / 130.) * 200.;

  const Octaves = new Float32Array(16);
  for(let i = 0; i < 15; i++){
    Octaves[i] = Simplex.simplex3(X / 2 ** i, Z / 2 ** i, 1536);
  }

  let OctaveSum6_15 = 0.;
  for(let i = 0, Min = 6, Max = 15, Count = Max - Min; i < Count; ++i) OctaveSum6_15 += Octaves[i + Min] / (2 ** (Count - i));

  let OctaveSum1_5 = 0.;
  for(let i = 0, Min = 1, Max = 5, Count = Max - Min; i < Count; ++i) OctaveSum1_5 += Octaves[i + Min] / (2 ** (Count - i));

  let OctaveSum3_9 = 0.;
  for(let i = 0, Min = 3, Max = 9, Count = Max - Min; i < Count; ++i) OctaveSum3_9 += Octaves[i + Min] / (2 ** (Count - i));



  //const Worley1 = WorleyNoise.Euclidean(X / 300. + OctaveSum1_5 / 45., Z / 300. + OctaveSum1_5 / 45., 0.);

  const DistributionNoise = Simplex.simplex3(X / 32768, Z / 32768, 1542);

  const CliffNoise1 = Simplex.simplex3(X / 512., Z / 512., 1539) * .75 * OctaveSum1_5 * .25;
  const CliffNoise2 = Simplex.simplex3(X / 256., Z / 256., 1539.4);

  const Worley2 = WorleyNoise.FasterNoise(X / 2000., Z / 2000.);// + WorleyNoise.FasterNoise(X / 3000., Z / 3000.);

  const Other1 = Simplex.simplex3(X / 16384., Z / 16384., 1555);
  const Other2 = Simplex.simplex3(X / 4096., Z / 4096., 1555);
  const Other3 = Simplex.simplex3(X / 16384., Z / 16384., 1555.5);

  let MountainMap = WeightTowards(.47 + .10 * Other3, .10 + .06 * (Other1 * .8 + Other2 * .2), .57)(OctaveSum6_15);

  MountainMap *= Worley2;
  MountainMap += WeightTowardsAsymmetric(.15, .0094)(MountainMap) * .0106 * Math.max(0., Octaves[8] * 2. - 1.);
  MountainMap += WeightTowardsAsymmetric(.43, .0094)(1. - OctaveSum6_15) * .0106 * Math.min(1., Math.max(0., 2. - MountainMap * 5.));// * Math.max(0., Octaves[9] * 2. - 1.);
  MountainMap += WeightTowardsAsymmetric(.38, .0094)(1. - OctaveSum6_15) * .0106 * Math.min(1., Math.max(0., 3.3 - MountainMap * 7.)) * (CliffNoise2 + 1.) / 2.;
  MountainMap += WeightTowardsAsymmetric(.33, .0096)(1. - OctaveSum6_15) * CliffNoise1 * .0106;
  MountainMap += Cliffs1(MountainMap) * .039 * OctaveSum3_9 * Math.max(0., Math.min(1.6 - 2. * MountainMap));
  //MountainMap += Cliffs2(MountainMap) * .00014 + .00007 * OctaveSum3_9;
  //MountainMap += .001 * OctaveSum1_5 * Worley2;


  return MountainMap * 2200.;

  //const Worley = WorleyNoise.Euclidean(X / 100., Z / 100., 0.);
  //return Worley[0] * 200.;

/*

  //return X / 140.;//0.;//(X + Z) / 6. + 64.;//128.;//254. + //
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
  Result /= .5;

  return Result;// + Math.floor((X + Z) / 100.) * 64.;

 */
};

export function ReSeed(NewSeed){
  Simplex.seed(NewSeed);
  WorleyNoise.setSeed(NewSeed);
};
