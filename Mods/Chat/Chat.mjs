import ChatControlHandler from "./ChatControlHandler.mjs";
import ChatInterface from "./ChatInterface.mjs";

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
  static Identifier = "Chat";
  static Version = "0.0.2";
  static Build = 2;
  static MLE = undefined;

  static Chat;

  static Renderer = undefined;

  static Register(MLE){
    Main.MLE = MLE;
  }
  static PreInit(){
    Main.Chat = new Chat;
    Main.MLE.PreInit.Done(Main.Identifier);
  }
  static Init(){
    Main.MLE.Init.Done(Main.Identifier);
  }
  static PostInit(){
    Main.MLE.PostInit.Done(Main.Identifier);
  }
}

const DefaultChatCommands = {
  ["tp"]: function(GivenX, GivenY, GivenZ){
    const X = Number.parseFloat(GivenX);
    const Y = Number.parseFloat(GivenY);
    const Z = Number.parseFloat(GivenZ);
    if(isNaN(X)) return "<span style=\"color:#ff0000\">[tp] Error: X coordinate is invalid.</span>";
    if(isNaN(Y)) return "<span style=\"color:#ff0000\">[tp] Error: Y coordinate is invalid.</span>";
    if(isNaN(Z)) return "<span style=\"color:#ff0000\">[tp] Error: Z coordinate is invalid.</span>";
    Application.Main.Renderer.Camera.position.x = X;
    Application.Main.Renderer.Camera.position.y = Y;
    Application.Main.Renderer.Camera.position.z = Z;
    return "[tp] Teleported to " + X + ", " + Y + ", " + Z;
  }
};

export class Chat{
  constructor(){
    this.ChatInterface = new ChatInterface;
    this.ChatControlHandler = new ChatControlHandler(this);

    this.MessageHistory = [];
    this.CurrentSelection = 0;

    this.ChatCommands = DefaultChatCommands;
  }
  Show(){
    this.CurrentSelection = this.MessageHistory.length;
    Application.Main.Game.ControlManager.FocusControl("ChatControls");
    window.setTimeout(function(){
      this.ChatInterface.Show();
      this.ChatInterface.Input.focus();
    }.bind(this), 5);
  }
  Exit(){
    this.CurrentSelection = this.MessageHistory.length;
    Application.Main.Game.ControlManager.FocusControl("GameControls");
    this.ChatInterface.Hide();
    window.focus();
    Application.Main.Game.GamePointerLockHandler.PointerLock.Element.focus();
  }
  SelectPrevious(){
    this.CurrentSelection = Math.max(0, this.CurrentSelection - 1);
    if(this.MessageHistory[this.CurrentSelection]) this.ChatInterface.Input.innerHTML = this.MessageHistory[this.CurrentSelection];
  }
  SelectNext(){
    this.CurrentSelection = Math.min(this.MessageHistory.length, this.CurrentSelection + 1);
    if(this.MessageHistory[this.CurrentSelection]) this.ChatInterface.Input.innerHTML = this.MessageHistory[this.CurrentSelection];
    else this.ChatInterface.Input.innerHTML = "";
  }
  SendContents(){
    let Text = this.ChatInterface.Input.innerHTML;
    Text = Text.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    let Response = "";

    if(/^\//.test(Text)){
      let Parts = Text.replace(/^\//, "").split(" ");
      let Command = this.ChatCommands[Parts.shift()];
      if(!Command) Response = "<span style=\"color:#ff0000\">Unknown command.</span>";
      else Response = Command(...Parts) ?? "";

    } else Response = Text; //Just send message normally.

    if(Text !== "") this.MessageHistory.push(Text);

    if(Response !== ""){
      this.CurrentSelection = this.MessageHistory.length;
      this.ChatInterface.Input.innerHTML = "";

      let Parsed = this.ParseMessage(Response);
      this.Receive(Parsed);
    }

    this.Exit();
  }
  AutoComplete(){

  }
  Receive(Message){
    let NewElement = document.createElement("div");
    NewElement.innerHTML = Message;
    const ChatLog = this.ChatInterface.ChatLog;
    ChatLog.append(NewElement);
    ChatLog.parentElement.scrollTo(0, ChatLog.parentElement.scrollHeight);
  }
  ParseMessage(Text){
    let Match;
    while(Match = Text.match(/(?<!(?<!\\)\\)\!\{([^\]]*)\}/)){
      Text = Text.replace(Match[0], `<span style="color: ${Match[0].slice(2, -1)}">`);
      Text += "</span>";
    }
    return Text;
  }
}
