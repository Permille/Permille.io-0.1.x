import * as Mods from "./ModIndex.mjs";
import SetOperations from "../Libraries/SetOperations.mjs";
import Listenable from "../Libraries/Listenable/Listenable.mjs";
const ModLoadingEngine = new class{
  static Version = "Alpha 0.0.3";
  static Build = 3;
  constructor(){
    this.Events = new Listenable;
    this.ModList = new Set;
    this.ModProperties = {};
    this.ModConfig = {};
    this.Application = undefined;
    this.Mods = undefined;

    this.Register();

    let RegisterLoadingStage = function(Name, Successor){
      let Finished = new Set;
      let Initiated = new Set;
      let LoadRequirementsForMod = {};
      const ModListArray = [...this.ModList];
      for(const Identifier of ModListArray){
        LoadRequirementsForMod[Identifier] = new Set(...[this.ModConfig[Identifier].Stages[Name].Requirements]);
      }
      this[Name] = function(){
        for(const Mod in Mods){
          const Identifier = Mods[Mod].Main.Identifier;
          if(Initiated.has(Identifier)) continue;
          if(Mods[Mod].Main[Name]){
            if(SetOperations.IsSubset(LoadRequirementsForMod[Identifier], Finished)){
              Initiated.add(Identifier);
              Mods[Mod].Main[Name]();
            }
            else continue;
          }
          else{
            Initiated.add(Identifier);
            this[Name].Done(Mods[Mod].Main.Identifier);
          }
        }
      }.bind(this);
      this[Name].Done = (function(Scope){
        let Done = false;
        let AmountOfMods = Scope.ModList.size;

        return function(Identifier){
          if(Done) throw new Error("The " + Name + " stage is over.");
          if(!Scope.ModList.has(Identifier)) throw new Error("The " + Name + " of the unregistered mod " + Identifier + " completed.")
          if(Finished.has(Identifier)) throw new Error("The mod with identifier " + Identifier + "(" + Scope.ModProperties[Identifier].Version + "[" + Scope.ModProperties[Identifier].Build + "]) already signalled that it was done with " + Name + ".");
          Finished.add(Identifier);

          Scope[Name](); //This will probably not work, and will instead cause a stack overflow. Can't wait for the program to break in new and exciting ways!

          if(Finished.size === AmountOfMods){
            Done = true;
            Scope.Events.FireEventListeners("Finished" + Name);
            Scope.Events.FireEventListeners("Prepare" + Successor);
            Finished.clear();
            Scope[Successor]();
          }
        }
      }.bind(this))(this);
    }.bind(this);

    RegisterLoadingStage("PreInit", "Init");
    RegisterLoadingStage("Init", "PostInit");
    RegisterLoadingStage("PostInit", "Finish");

  }
  Register(){
    this.Mods = Mods;
    for(const Mod in Mods){
      this.ModList.add(Mods[Mod].Main.Identifier);
      this.ModProperties[Mods[Mod].Main.Identifier] = {
        "Version": Mods[Mod].Main.Version,
        "Build": Mods[Mod].Main.Build
      };
      this.ModConfig[Mods[Mod].Main.Identifier] = Mods[Mod].ModConfig;
      Mods[Mod].Main.Register(this);
    }
  }
  Finish(){
    this.Events.FireEventListeners("Finished");
  }
}

export default ModLoadingEngine;
