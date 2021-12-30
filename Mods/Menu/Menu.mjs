import BaseMenu from "./DefaultMenus/BaseMenu/BaseMenu.mjs";
import MainLogic from "./DefaultMenus/Main/Logic.mjs";
import OptionsLogic from "./DefaultMenus/Options/Logic.mjs";
import GraphicsLogic from "./DefaultMenus/Graphics/Logic.mjs";
import ControlConfigLogic from "./DefaultMenus/Controls/Logic.mjs";
import WorldConfigLogic from "./DefaultMenus/World/Logic.mjs";
import PlayerConfigLogic from "./DefaultMenus/Player/Logic.mjs";
import LanguageConfigLogic from "./DefaultMenus/Language/Logic.mjs";
import SettingsConfigLogic from "./DefaultMenus/Settings/Logic.mjs";
import ConfigConfigLogic from "./DefaultMenus/Config/Logic.mjs";
import DebugConfigLogic from "./DefaultMenus/Debug/Logic.mjs";

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
  static Identifier = "Menu";
  static Version = "0.0.2";
  static Build = 2;
  static MLE = undefined;

  static Renderer = undefined;

  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    Main.Logic = {};
    Main.BaseInterfaceConfigs = {
      "Config": null,
      "Controls": null,
      "Debug": null,
      "Graphics": null,
      "Language": null,
      "Player": null,
      "Settings": null,
      "World": null
    };
    const ConfigCount = Object.keys(Main.BaseInterfaceConfigs).length;
    let ConfigLoadCount = 0;
    const LoadedConfigs = function(){
      Main.Logic = {
        "MainLogic": new MainLogic(Main),
        "OptionsLogic": new OptionsLogic(Main),
        "GraphicsLogic": new BaseMenu(Main.BaseInterfaceConfigs.Graphics, Main, GraphicsLogic),
        "ControlConfigLogic": new BaseMenu(Main.BaseInterfaceConfigs.Controls, Main, ControlConfigLogic),
        "WorldConfigLogic": new BaseMenu(Main.BaseInterfaceConfigs.World, Main, WorldConfigLogic),
        "PlayerConfigLogic": new BaseMenu(Main.BaseInterfaceConfigs.Player, Main, PlayerConfigLogic),
        "LanguageConfigLogic": new BaseMenu(Main.BaseInterfaceConfigs.Language, Main, LanguageConfigLogic),
        "SettingsConfigLogic": new BaseMenu(Main.BaseInterfaceConfigs.Settings, Main, SettingsConfigLogic),
        "ConfigConfigLogic": new BaseMenu(Main.BaseInterfaceConfigs.Config, Main, ConfigConfigLogic),
        "DebugConfigLogic": new BaseMenu(Main.BaseInterfaceConfigs.Debug, Main, DebugConfigLogic)
      };

      let Loaded = 0;
      const Items = Object.keys(Main.Logic).length;

      const Listener = function(){
        if(++Loaded === Items){
          Main.SetLang("en-uk");
        }
      };

      for(const Name in Main.Logic){
        Main.Logic[Name].Interface.IFrame.addEventListener("load", Listener);
      }
    };
    for(const FolderName in Main.BaseInterfaceConfigs){
      window.fetch("./Mods/Menu/DefaultMenus/" + FolderName + "/Config.json")
        .then(response => response.json())
        .then(function(Config){
          Main.BaseInterfaceConfigs[FolderName] = Config;
          if(++ConfigLoadCount === ConfigCount) LoadedConfigs();
        });
    }



    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }

  static SetLang(Language){
    console.log(import.meta.url); //Very useful!
    window.fetch("./Mods/Menu/lang/" + Language + ".json")
      .then(response => response.json())
      .then(function(FullLang){
        for(const Name in Main.Logic){
          const MenuLogic = Main.Logic[Name];
          const MenuLang = FullLang[MenuLogic.LangIdentifier] || {};

          const IDocument = MenuLogic.Interface.IFrame.contentDocument;
          const Elements = IDocument.querySelectorAll("[data-exp]");

          for(const Element of Elements){
            let Str = MenuLang[Element.dataset.exp] ?? MenuLogic.LangIdentifier + ":" + Element.dataset.exp;
            let Match = Str.match(/(?<!(?<!\\)\\)\[\%([^\]]*)\]/);
            while(Match){
              Str = Str.replace(Match[0], "Escape"); //TODO: Actually do something useful with this...
              Match = Str.match(/(?<!(?<!\\)\\)\[\%([^\]]*)\]/);
            }
            Str = Str.replaceAll("\\[%", "[%");
            Str = Str.replaceAll("\\\\", "\\"); //Reverse custom escape sequences
            Element.innerHTML = Str;
          }
        }
      });
  }
}
