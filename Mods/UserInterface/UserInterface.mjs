import ChatInterface from "./Interfaces/Chat/Chat.mjs";

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

class UserInterface{
  constructor(){
    this.ChatInterface = new ChatInterface;
  }
}

export class Main{
  static Identifier = "UserInterface";
  static Version = "0.0.1";
  static Build = 1;
  static MLE = undefined;
  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    new UserInterface;
    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }
}
