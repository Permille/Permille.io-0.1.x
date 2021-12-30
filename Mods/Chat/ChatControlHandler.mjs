import ChatControls from "./ChatControls.mjs";
export default class ChatControlHandler{
  constructor(Chat){
    this.Chat = Chat;
    this.ChatControls = new ChatControls;
    Application.Main.Game.ControlManager.Controls["ChatControls"] = this.ChatControls;

    //Register hook from GameControls
    const GameControls = Application.Main.Game.ControlManager.Controls["GameControls"];
    GameControls.Configuration.Set("Chat", "KeyT");
    GameControls.Events.AddEventListener("ControlDown", function(Event){
      if(Event.Control !== "Chat") return;
      this.Chat.Show();
    }.bind(this));

    this.ChatControls.Events.AddEventListener("ControlDown", function(Event){
      switch(Event.Control){
        case "Exit":{
          this.Chat.Exit();
          break;
        }
        case "Previous":{
          this.Chat.SelectPrevious();
          break;
        }
        case "Next":{
          this.Chat.SelectNext();
          break;
        }
        case "Send":{
          this.Chat.SendContents();
          break;
        }
        case "AutoComplete":{
          this.Chat.AutoComplete();
          break;
        }
        default:{
          return;
        }
      }
    }.bind(this));
  }
}
