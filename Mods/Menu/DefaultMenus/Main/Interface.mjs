import InterfaceHTML from "./index.xhtml";
import "./style.css";
const Parser = new DOMParser;
const Node = document.importNode(Parser.parseFromString(InterfaceHTML, "text/html").body, true);

export default class Interface{
  constructor(){
    this.Element = document.createElement("div");
    this.Element.classList.add("Menu");
    this.Element.classList.add("Main");
    this.Element.append(...Node.childNodes);
    this.Hide();

    document.body.appendChild(this.Element);
  }
  Resize(Width, Height){

  }

  Show(){
    this.Element.style.marginLeft = "0";//display = "block";
  }
  Hide(){
    //Stupid css animations firing whenever the iframe becomes visible again...
    this.Element.style.marginLeft =  "-9999px";//display = "none";
  }
}
