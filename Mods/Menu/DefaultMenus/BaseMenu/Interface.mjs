import ICC from "../../InterfaceComponentConfigurator.mjs";
import Listenable from "../../../../Libraries/Listenable/Listenable.mjs";

export default class Interface{
  constructor(Config){
    this.Events = new Listenable;
    this.IFrame = document.createElement("iframe");
    this.IFrame.style.position = "absolute";
    //this.IFrame.style.display = "none";
    this.IFrame.style.display = "block";
    this.Hide();
    //this.IFrame.sandbox = "";
    this.IFrame.setAttribute("src", Config.Meta.Location);
    document.body.appendChild(this.IFrame);

    this.IFrame.addEventListener("load", function(){
      const IDocument = this.IFrame.contentDocument;
      IDocument.getElementById("Title").dataset.exp = Config.Meta.LangIdentifier;
      
      for(const GroupName in Config.Groups){
        const SectionContainer = document.createElement("div");
        SectionContainer.classList.add("SectionContainer");
        IDocument.getElementById("Container").appendChild(SectionContainer);
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
          let PropertyElement = IDocument.getElementById(Property.Type)?.content.firstElementChild.cloneNode(true);
          if(!PropertyElement){
            PropertyElement = document.createElement("div");
            let Inner = document.createElement("span");
            Inner.innerHTML = "Type not found.";
            PropertyElement.appendChild(Inner);
          } else{
            ICC[Property.Type](PropertyElement, Property);
          }
          if(Property.ID) PropertyElement.setAttribute("id", Property.ID);
          PropertyContainer.append(PropertyElement);
          //debugger;
          const SpanElement = PropertyElement.querySelector(":scope > span:first-child");
          if(SpanElement) SpanElement.dataset.exp = PropertyName;
        }
      }
      this.Events.FireEventListeners("Loaded");
    }.bind(this));

    this.Resize(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", function(){
      this.Resize(window.innerWidth, window.innerHeight);
    }.bind(this));
  }
  Resize(Width, Height){
    this.IFrame.width = Width;
    this.IFrame.height = Height;
  }

  Show(){
    this.IFrame.style.display = "block";
  }
  Hide(){
    this.IFrame.style.display = "none";
  }
}
