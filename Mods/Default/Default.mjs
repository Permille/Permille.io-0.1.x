import Block from "./../../Block/Block.mjs";
export const ModConfig = {
  "MLEBuildSupport":{
    "Earliest": undefined,
    "Target": 1,
    "Latest": undefined
  },
  "Dependencies":[],
  "Stages":{
    "PreInit":{
      "Priority": 127,
      "Requirements":[

      ]
    },
    "Init":{
      "Priority": 127,
      "Requirements":[

      ]
    },
    "PostInit":{
      "Priority": 127,
      "Requirements":[

      ]
    }
  }
};

export class Main{
  static Identifier = "default";
  static Version = "0.0.3";
  static Build = 3;
  static MLE = undefined;

  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    const BlockRegistry = Main.MLE.Application.Main.BlockRegistry;
    BlockRegistry.RegisterBlock(new Block("default:grass", {"Solid": true, "Invisible": false, "Transparent": false, "DrawAllFaces": false, "Texture": "Default/Textures/default/grass.png", "Precedence": 2}));
    BlockRegistry.RegisterBlock(new Block("default:rock", {"Solid": true, "Invisible": false, "Transparent": false, "DrawAllFaces": false, "Texture": "Default/Textures/default/rock.png"}));
    BlockRegistry.RegisterBlock(new Block("default:rock1", {"Solid": true, "Invisible": false, "Transparent": false, "DrawAllFaces": false, "Texture": "Default/Textures/default/rock1.png"}));
    BlockRegistry.RegisterBlock(new Block("default:water", {"Solid": false, "Invisible": false, "Transparent": true, "DrawAllFaces": false, "Texture": "Default/Textures/default/water.png"}));
    BlockRegistry.RegisterBlock(new Block("default:red", {"Solid": true, "Invisible": false, "Transparent": false, "DrawAllFaces": false, "Texture": "Default/Textures/default/red.png"}));
    BlockRegistry.RegisterBlock(new Block("default:leaves", {"Solid": true, "Invisible": false, "Transparent": false, "DrawAllFaces": true, "Texture": "Default/Textures/default/leaves.png", "Precedence": 17}));
    BlockRegistry.RegisterBlock(new Block("default:wood", {"Solid": true, "Invisible": false, "Transparent": false, "DrawAllFaces": false, "Texture": "Default/Textures/default/wood.png", "Precedence": 16}));
    BlockRegistry.RegisterBlock(new Block("default:oak_leaves", {"Solid": true, "Invisible": false, "Transparent": false, "DrawAllFaces": true, "Texture": "Default/Textures/default/oak_leaves.png", "Precedence": 17}));
    BlockRegistry.RegisterBlock(new Block("default:oak_wood", {"Solid": true, "Invisible": false, "Transparent": false, "DrawAllFaces": false, "Texture": "Default/Textures/default/oak_wood.png", "Precedence": 16}));

    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }
  static AnimationFrame(){

  }
}
