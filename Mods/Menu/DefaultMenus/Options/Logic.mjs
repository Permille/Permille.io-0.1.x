import Interface from "./Interface.mjs";
import ControlHandler from "./ControlHandler.mjs";

export default class OptionsLogic{
  constructor(Main){
    this.Main = Main;
    this.Interface = new Interface;
    this.ControlHandler = new ControlHandler(this);
    this.LangIdentifier = "Options";

    this.LastVisibilityToggle = 0;


    this.Interface.Element.querySelector(".Exit").addEventListener("click", function(){
      this.Exit();
    }.bind(this));

    this.Interface.Element.querySelector(".Graphics").addEventListener("click", function(){
      this.LastVisibilityToggle = window.performance.now();

      Application.Main.Game.ControlManager.FocusControl("GraphicsControls");
      this.Interface.Hide();
      this.Main.Logic.GraphicsLogic.Interface.Show();
    }.bind(this));

    this.Interface.Element.querySelector(".Controls").addEventListener("click", function(){
      this.LastVisibilityToggle = window.performance.now();

      Application.Main.Game.ControlManager.FocusControl("ControlConfigControls");
      this.Interface.Hide();
      this.Main.Logic.ControlLogic.Interface.Show();
    }.bind(this));

    this.Interface.Element.querySelector(".World").addEventListener("click", function(){
      this.LastVisibilityToggle = window.performance.now();

      Application.Main.Game.ControlManager.FocusControl("WorldConfigControls");
      this.Interface.Hide();
      this.Main.Logic.WorldLogic.Interface.Show();
    }.bind(this));

    this.Interface.Element.querySelector(".Player").addEventListener("click", function(){
      this.LastVisibilityToggle = window.performance.now();

      Application.Main.Game.ControlManager.FocusControl("PlayerConfigControls");
      this.Interface.Hide();
      this.Main.Logic.PlayerLogic.Interface.Show();
    }.bind(this));

    this.Interface.Element.querySelector(".Language").addEventListener("click", function(){
      this.LastVisibilityToggle = window.performance.now();

      Application.Main.Game.ControlManager.FocusControl("LanguageConfigControls");
      this.Interface.Hide();
      this.Main.Logic.LanguageLogic.Interface.Show();
    }.bind(this));

    this.Interface.Element.querySelector(".Settings").addEventListener("click", function(){
      this.LastVisibilityToggle = window.performance.now();

      Application.Main.Game.ControlManager.FocusControl("SettingsConfigControls");
      this.Interface.Hide();
      this.Main.Logic.SettingsLogic.Interface.Show();
    }.bind(this));

    this.Interface.Element.querySelector(".Config").addEventListener("click", function(){
      this.LastVisibilityToggle = window.performance.now();

      Application.Main.Game.ControlManager.FocusControl("ConfigConfigControls");
      this.Interface.Hide();
      this.Main.Logic.ConfigLogic.Interface.Show();
    }.bind(this));

    this.Interface.Element.querySelector(".Debug").addEventListener("click", function(){
      this.LastVisibilityToggle = window.performance.now();

      Application.Main.Game.ControlManager.FocusControl("DebugConfigControls");
      this.Interface.Hide();
      this.Main.Logic.DebugLogic.Interface.Show();
    }.bind(this));
  }
  Show(){
    if(window.performance.now() - 5 < this.LastVisibilityToggle) return; //Dumb solution, but whatever; this prevents the menu from showing and immediately closing, and vice versa.
    console.warn(this.LastVisibilityToggle + ", " + window.performance.now());
    this.LastVisibilityToggle = window.performance.now();

    Application.Main.Game.ControlManager.FocusControl("OptionsControls");
    this.Interface.Show();
    this.Interface.Element.focus(); //Important: need to focus iframe window AND the element within it.
  }
  Exit(){
    if(window.performance.now() - 5 < this.LastVisibilityToggle) return;
    console.warn(this.LastVisibilityToggle + ", " + window.performance.now());
    this.LastVisibilityToggle = window.performance.now();

    Application.Main.Game.ControlManager.FocusControl("MainMenuControls");
    this.Interface.Hide();

    this.Main.Logic.MainLogic.Interface.Element.focus();
    this.Main.Logic.MainLogic.Show();
  }
}
