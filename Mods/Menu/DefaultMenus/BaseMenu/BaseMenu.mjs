import DefaultControlHandler from "./DefaultControlHandler.mjs";
import Interface from "./Interface.mjs";

export default class BaseMenu{
  static async GetMetadata(ConfigPath){
    return (await window.fetch(ConfigPath)).json();
  }
  constructor(Config, Main, Logic, ControlHandler = DefaultControlHandler){
    this.Config = Config;
    this.Main = Main;
    this.ControlsName = Config.Meta.ControlsName;
    this.ExitTo = Config.Meta.ExitTo;
    this.LangIdentifier = Config.Meta.LangIdentifier;
    this.Location = Config.Meta.Location;

    this.Interface = new Interface(Config);
    this.ControlHandler = new ControlHandler(this.ControlsName, this);
    this.Logic = new Logic(this, Main);

    this.LastVisibilityToggle = 0;

  }
  Show(){
    if(window.performance.now() - 5 < this.LastVisibilityToggle) return; //Dumb solution, but whatever; this prevents the menu from showing and immediately closing, and vice versa.
    console.warn(this.LastVisibilityToggle + ", " + window.performance.now());
    this.LastVisibilityToggle = window.performance.now();

    Application.Main.Game.ControlManager.FocusControl("LanguageConfigControls");
    this.Interface.Show();
    this.Interface.Element.focus(); //Important: need to focus iframe window AND the element within it.
  }
  Exit(){
    if(window.performance.now() - 5 < this.LastVisibilityToggle) return;
    console.warn(this.LastVisibilityToggle + ", " + window.performance.now());
    this.LastVisibilityToggle = window.performance.now();

    Application.Main.Game.ControlManager.FocusControl("OptionsControls");
    this.Interface.Hide();

    this.Main.Logic.OptionsLogic.Interface.Element.focus();
    this.Main.Logic.OptionsLogic.Show();
  }
}
