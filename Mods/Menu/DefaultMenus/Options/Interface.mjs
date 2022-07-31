import InterfaceHTML from "./index.xhtml";
import "./style.css";
import "../../MenuStyle.css";
const Parser = new DOMParser;
const Node = document.importNode(Parser.parseFromString(InterfaceHTML, "text/html").body, true);

export default class Interface{
  constructor(){
    this.Element = document.createElement("div");
    this.Element.classList.add("Menu");
    this.Element.classList.add("Options");
    this.Element.append(...Node.childNodes);
    this.Hide();

    document.body.appendChild(this.Element);
  }
  Resize(Width, Height){

  }

  Show(){
    this.Element.style.display = "block";
  }
  Hide(){
    this.Element.style.display = "none";
  }
}
