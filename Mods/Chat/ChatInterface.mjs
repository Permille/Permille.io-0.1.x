import InterfaceHTML from "./index.html";
import "./style.css";
const Parser = new DOMParser;
const Node = document.importNode(Parser.parseFromString(InterfaceHTML, "text/html").body, true);

export default class ChatInterface{
  constructor(){
    this.Element = document.createElement("div");
    this.Element.classList.add("Chat");
    this.Element.append(...Node.childNodes);
    this.Hide();

    document.body.appendChild(this.Element);


    this.ChatLog = this.Element.querySelector(".ChatLog");
    this.Input = this.Element.querySelector(".Input");

    /*this.Element.addEventListener("click", function(Event){
      if(Event.target === this.Element){ //Clicked outside of any elements
        const x = Event.pageX - this.Element.offsetLeft;
        const y = Event.pageY - this.Element.offsetTop;

        this.Element.style.pointerEvents = "none";
        document.elementFromPoint(x, y)?.click?.();
        this.Element.style.pointerEvents = "all";
      }
    }.bind(this));*/
  }

  Show(){
    this.Element.style.display = "block";
  }
  Hide(){
    this.Element.style.display = "none";
  }
}
