import ICC from "../../InterfaceComponentConfigurator.mjs";
import Listenable from "../../../../Libraries/Listenable/Listenable.mjs";
import InterfaceHTML from "./index.xhtml";
import "./style.css";
import "../../MenuStyle.css";
const Parser = new DOMParser;
const Node = document.importNode(Parser.parseFromString(InterfaceHTML, "text/html").body, true);

export default class Interface{
  constructor(Config){
    this.Events = new Listenable;
    this.Element = document.createElement("div");
    this.Element.classList.add("Menu");
    this.Element.classList.add("Base");
    this.Element.append(...Node.cloneNode(true).childNodes);
    this.Hide();

    document.body.appendChild(this.Element);


    this.Element.querySelector(".Title").dataset.exp = Config.Meta.LangIdentifier;

    for(const GroupName in Config.Groups){
      const SectionContainer = document.createElement("div");
      SectionContainer.classList.add("SectionContainer");
      this.Element.querySelector(".Container").appendChild(SectionContainer);
      const Title = document.createElement("h2");
      Title.classList.add("SectionTitle");
      if(GroupName !== "") Title.dataset.exp = GroupName;
      SectionContainer.appendChild(Title);
      const PropertyContainer = document.createElement("div");
      PropertyContainer.classList.add("PropertyContainer");
      SectionContainer.appendChild(PropertyContainer);
      const Group = Config.Groups[GroupName];
      for(const PropertyName in Group){
        const Property = Group[PropertyName];
        let PropertyElement = this.Element.querySelector(`template.${Property.Type}`)?.content.firstElementChild.cloneNode(true);
        if(!PropertyElement){
          PropertyElement = document.createElement("div");
          let Inner = document.createElement("span");
          Inner.innerHTML = "Type not found.";
          PropertyElement.appendChild(Inner);
        } else{
          ICC[Property.Type](PropertyElement, Property);
        }
        if(Property.ID) PropertyElement.classList.add(`-ID-${Property.ID}`);
        PropertyContainer.append(PropertyElement);
        //debugger;
        const SpanElement = PropertyElement.querySelector(":scope > span:first-child");
        if(SpanElement) SpanElement.dataset.exp = PropertyName;
      }
    }

  }
  Resize(Width, Height){
    return;
  }

  Show(){
    this.Element.style.display = "block";
  }
  Hide(){
    this.Element.style.display = "none";
  }
}
