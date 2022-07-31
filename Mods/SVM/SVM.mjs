import SVM from "../../Libraries/SVM/SVM.mjs";
import SVMUtils from "../../Libraries/SVM/SVMUtils.mjs";

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
  static Identifier = "svm";
  static Version = "0.0.1";
  static Build = 1;
  static MLE = undefined;

  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    Main.MLE.Mods["Chat"].Main.Chat.ChatCommands["paste-svm"] = function(){
      const Element = document.createElement("input");
      Element.type = "file";
      Element.click();
      Element.addEventListener("change", function(){
        const File = Element.files[0];
        Element.remove();

        let Reader = new FileReader();
        Reader.readAsText(File);
        Reader.addEventListener("load", function(Event){
          const LoadedFile = Event.target.result;



          const Selection = SVMUtils.DeserialiseBOP(LoadedFile, undefined, {"X": 0, "Y": 0, "Z": 0});

          void function Load(){
            //window.setTimeout(Load, 1000);
            const PlayerX = Application.Main.Renderer.Camera.position.x;
            const PlayerY = Application.Main.Renderer.Camera.position.y;
            const PlayerZ = Application.Main.Renderer.Camera.position.z;
            Selection.DirectPaste(PlayerX, PlayerY, PlayerZ, 1, Application.Main.BlockRegistry, Application.Main.World.SetBlock.bind(Application.Main.World), true);
          }();

        }.bind(this));
      }.bind(this));
    };

    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }
  static AnimationFrame(){

  }
}
