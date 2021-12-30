import ICVQ from "../../InterfaceComponentValueQuerier.mjs";
import ICCD from "../../InterfaceComponentChangeDetector.mjs";

export default class Logic{
  constructor(BaseMenu, Main){
    this.BaseMenu = BaseMenu;
    this.Main = Main;
    this.Interface = BaseMenu.Interface;

    this.Interface.Events.AddEventListener("Loaded", function(){
      const IDocument = this.Interface.IFrame.contentDocument;

      IDocument.getElementById("Exit").addEventListener("click", function(){
        this.BaseMenu.Exit();
      }.bind(this));

      ICCD.Range(IDocument.getElementById("Sensitivity"), function(){
        Application.Main.Game.GamePointerLockHandler.Settings.MouseSensitivity = +ICVQ.Range(IDocument.getElementById("Sensitivity"));
      });

      ICCD.Switch(IDocument.getElementById("InvertY"), function(){
        Application.Main.Game.GamePointerLockHandler.Settings.InvertY = ICVQ.Switch(IDocument.getElementById("InvertY"));
      });

      for(const Control of ["Forwards", "Backwards", "Leftwards", "Rightwards", "Downwards", "Upwards", "BreakBlock", "PlaceBlock", "PickBlock", "Chat"]){
        const Element = IDocument.getElementById(Control);
        ICCD.Key(Element, function(){
          Application.Main.Game.ControlManager.Controls["GameControls"].Configuration.Set(Control, ICVQ.Key(Element));
        });
      }
    }.bind(this));
  }
}
