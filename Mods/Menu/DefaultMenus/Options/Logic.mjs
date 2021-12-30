import Interface from "./Interface.mjs";
import ControlHandler from "./ControlHandler.mjs";

export default class OptionsLogic{
  constructor(Main){
    this.Main = Main;
    this.Interface = new Interface;
    this.ControlHandler = new ControlHandler(this);
    this.LangIdentifier = "Options";

    this.LastVisibilityToggle = 0;

    const IFrame = this.Interface.IFrame;

    IFrame.addEventListener("load", function(){
      const IDocument = IFrame.contentDocument;

      Application.Main.Game.ControlManager.RegisterIFrame(IFrame);
      IDocument.getElementById("Exit").addEventListener("click", function(){
        this.Exit();
      }.bind(this));
      IDocument.getElementById("Graphics").addEventListener("click", function(){
        this.LastVisibilityToggle = window.performance.now();

        Application.Main.Game.ControlManager.FocusControl("GraphicsControls");
        this.Interface.Hide();
        this.Main.Logic.GraphicsLogic.Interface.Show();
      }.bind(this));

      IDocument.getElementById("Controls").addEventListener("click", function(){
        this.LastVisibilityToggle = window.performance.now();

        Application.Main.Game.ControlManager.FocusControl("ControlConfigControls");
        this.Interface.Hide();
        this.Main.Logic.ControlConfigLogic.Interface.Show();
      }.bind(this));

      IDocument.getElementById("World").addEventListener("click", function(){
        this.LastVisibilityToggle = window.performance.now();

        Application.Main.Game.ControlManager.FocusControl("WorldConfigControls");
        this.Interface.Hide();
        this.Main.Logic.WorldConfigLogic.Interface.Show();
      }.bind(this));

      IDocument.getElementById("Player").addEventListener("click", function(){
        this.LastVisibilityToggle = window.performance.now();

        Application.Main.Game.ControlManager.FocusControl("PlayerConfigControls");
        this.Interface.Hide();
        this.Main.Logic.PlayerConfigLogic.Interface.Show();
      }.bind(this));

      IDocument.getElementById("Language").addEventListener("click", function(){
        this.LastVisibilityToggle = window.performance.now();

        Application.Main.Game.ControlManager.FocusControl("LanguageConfigControls");
        this.Interface.Hide();
        this.Main.Logic.LanguageConfigLogic.Interface.Show();
      }.bind(this));

      IDocument.getElementById("Settings").addEventListener("click", function(){
        this.LastVisibilityToggle = window.performance.now();

        Application.Main.Game.ControlManager.FocusControl("SettingsConfigControls");
        this.Interface.Hide();
        this.Main.Logic.SettingsConfigLogic.Interface.Show();
      }.bind(this));

      IDocument.getElementById("Config").addEventListener("click", function(){
        this.LastVisibilityToggle = window.performance.now();

        Application.Main.Game.ControlManager.FocusControl("ConfigConfigControls");
        this.Interface.Hide();
        this.Main.Logic.ConfigConfigLogic.Interface.Show();
      }.bind(this));

      IDocument.getElementById("Debug").addEventListener("click", function(){
        this.LastVisibilityToggle = window.performance.now();

        Application.Main.Game.ControlManager.FocusControl("DebugConfigControls");
        this.Interface.Hide();
        this.Main.Logic.DebugConfigLogic.Interface.Show();
      }.bind(this));
      /*IDocument.getElementById("Restart").addEventListener("click", function(){
        window.location.reload();
      }.bind(this));*/

    }.bind(this));
  }
  Show(){
    if(window.performance.now() - 5 < this.LastVisibilityToggle) return; //Dumb solution, but whatever; this prevents the menu from showing and immediately closing, and vice versa.
    console.warn(this.LastVisibilityToggle + ", " + window.performance.now());
    this.LastVisibilityToggle = window.performance.now();

    Application.Main.Game.ControlManager.FocusControl("OptionsControls");
    this.Interface.Show();
    this.Interface.IFrame.contentWindow.focus(); //Important: need to focus iframe window AND the element within it.
  }
  Exit(){
    if(window.performance.now() - 5 < this.LastVisibilityToggle) return;
    console.warn(this.LastVisibilityToggle + ", " + window.performance.now());
    this.LastVisibilityToggle = window.performance.now();

    Application.Main.Game.ControlManager.FocusControl("MainMenuControls");
    this.Interface.Hide();

    this.Main.Logic.MainLogic.Interface.IFrame.contentWindow.focus();
    this.Main.Logic.MainLogic.Show();
  }
}
