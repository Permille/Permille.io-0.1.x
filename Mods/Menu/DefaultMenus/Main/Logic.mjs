import Interface from "./Interface.mjs";
import ControlHandler from "./ControlHandler.mjs";

export default class MainLogic{
  constructor(Main){
    this.Main = Main;
    this.Interface = new Interface;
    this.ControlHandler = new ControlHandler(this);
    this.LangIdentifier = "Main";

    this.LastVisibilityToggle = 0;


    /*const IDocument = IFrame.contentDocument;
    let Options = ["OptionSlider", "OptionTextInput", "OptionSwitch", "OptionComboBox", "OptionKeyInput"];
    /*for(let i = 0; i < 1250; i++){
      IDocument.getElementById("QuickAccessItemsContainer").append(IDocument.getElementById(Options[Math.floor(Math.random() * Options.length)]).content.firstElementChild.cloneNode(true));
    }*/


    this.Interface.Element.querySelector(".Back").addEventListener("click", function(){
      this.Exit();
    }.bind(this));
    this.Interface.Element.querySelector(".Options").addEventListener("click", function(){
      this.ShowOptions();
    }.bind(this));
    this.Interface.Element.querySelector(".Restart").addEventListener("click", function(){
      window.location.reload();
    }.bind(this));

  }
  ShowOptions(){
    Application.Main.Game.ControlManager.FocusControl("OptionsControls");
    this.Interface.Hide();
    this.Main.Logic.OptionsLogic.Interface.Show();
  }
  Show(){
    if(window.performance.now() - 5 < this.LastVisibilityToggle) return; //Dumb solution, but whatever; this prevents the menu from showing and immediately closing, and vice versa.
    console.warn(this.LastVisibilityToggle + ", " + window.performance.now());
    this.LastVisibilityToggle = window.performance.now();

    Application.Main.Game.ControlManager.FocusControl("MainMenuControls");
    this.Interface.Show();
    this.Interface.Element.focus(); //Important: need to focus iframe window AND the element within it.
    document.exitPointerLock();
  }
  Exit(){
    if(window.performance.now() - 5 < this.LastVisibilityToggle) return;
    console.warn(this.LastVisibilityToggle + ", " + window.performance.now());
    this.LastVisibilityToggle = window.performance.now();

    Application.Main.Game.ControlManager.FocusControl("GameControls");
    this.Interface.Hide();
    window.focus();
    Application.Main.Game.GamePointerLockHandler.PointerLock.Element.focus();
    Application.Main.Game.GamePointerLockHandler.PointerLock.Element.requestPointerLock();
  }
}
