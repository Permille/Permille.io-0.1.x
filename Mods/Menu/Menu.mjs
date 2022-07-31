import BaseMenu from "./DefaultMenus/BaseMenu/BaseMenu.mjs";
import MainLogic from "./DefaultMenus/Main/Logic.mjs";
import OptionsLogic from "./DefaultMenus/Options/Logic.mjs";

import GraphicsLogic from "./DefaultMenus/Graphics/Logic.mjs";
import GraphicsConfig from "./DefaultMenus/Graphics/Config.json";
import ControlLogic from "./DefaultMenus/Controls/Logic.mjs";
import ControlConfig from "./DefaultMenus/Controls/Config.json";
import WorldLogic from "./DefaultMenus/World/Logic.mjs";
import WorldConfig from "./DefaultMenus/World/Config.json";
import PlayerLogic from "./DefaultMenus/Player/Logic.mjs";
import PlayerConfig from "./DefaultMenus/Player/Config.json";
import LanguageLogic from "./DefaultMenus/Language/Logic.mjs";
import LanguageConfig from "./DefaultMenus/Language/Config.json";
import SettingsLogic from "./DefaultMenus/Settings/Logic.mjs";
import SettingsConfig from "./DefaultMenus/Settings/Config.json";
import ConfigLogic from "./DefaultMenus/Config/Logic.mjs";
import ConfigConfig from "./DefaultMenus/Config/Config.json";
import DebugLogic from "./DefaultMenus/Debug/Logic.mjs";
import DebugConfig from "./DefaultMenus/Debug/Config.json";

import Things from "./Test.js";

console.log(Things);

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
    Main.Logic = {
      "MainLogic": new MainLogic(Main),
      "OptionsLogic": new OptionsLogic(Main),
      "GraphicsLogic": new BaseMenu(GraphicsConfig, Main, GraphicsLogic),
      "ControlLogic": new BaseMenu(ControlConfig, Main, ControlLogic),
      "WorldLogic": new BaseMenu(WorldConfig, Main, WorldLogic),
      "PlayerLogic": new BaseMenu(PlayerConfig, Main, PlayerLogic),
      "LanguageLogic": new BaseMenu(LanguageConfig, Main, LanguageLogic),
      "SettingsLogic": new BaseMenu(SettingsConfig, Main, SettingsLogic),
      "ConfigLogic": new BaseMenu(ConfigConfig, Main, ConfigLogic),
      "DebugLogic": new BaseMenu(DebugConfig, Main, DebugLogic)
    };

    Main.SetLang("en-uk");

    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }

  static async SetLang(Language){
    const Translation = (await import(`./lang/${Language}.json`)).default;

    for(const Name in Main.Logic){
      const MenuLogic = Main.Logic[Name];
      const MenuLang = Translation[MenuLogic.LangIdentifier] || {};

      const Elements = MenuLogic.Interface.Element.querySelectorAll("[data-exp]");

      for(const Element of Elements){
        let Str = MenuLang[Element.dataset.exp] ?? MenuLogic.LangIdentifier + ":" + Element.dataset.exp;

        //This is meant to do key mappings (e.g. [%KEY:Escape]) and also colour formatting
        let Match = Str.match(/(?<!(?<!\\)\\)\[\%([^\]]*)\]/);
        while(Match){
          Str = Str.replace(Match[0], "Escape"); //TODO: Add functionality to change this to the mapped keys
          Match = Str.match(/(?<!(?<!\\)\\)\[\%([^\]]*)\]/);
        }
        Str = Str.replaceAll("\\[%", "[%");
        Str = Str.replaceAll("\\\\", "\\"); //Reverse custom escape sequences

        Element.innerHTML = Str;
      }
    }
  }
}
