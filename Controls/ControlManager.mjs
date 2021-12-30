import GlobalControls from "./GlobalControls.mjs";
export default class ControlManager{
  constructor(){
    this.GlobalControls = new GlobalControls;
    this.GlobalControls.Focus();
    this.Controls = {};
    this.FocusedControl = undefined;
  }
  FocusControl(Name){
    this.Controls[this.FocusedControl]?.Unfocus();
    this.Controls[Name]?.Focus();
    this.FocusedControl = Name;
  }
  UnfocusControl(){
    this.Controls[this.FocusedControl]?.Unfocus();
  }
  RegisterIFrame(IFrame){
    IFrame.contentDocument.addEventListener("keydown", function(Event){
      document.dispatchEvent(new KeyboardEvent("keydown", Event));
    });
    IFrame.contentDocument.addEventListener("keyup", function(Event){
      document.dispatchEvent(new KeyboardEvent("keyup", Event));
    });
  }
}
