import GraphOverlay from "./GraphOverlay.mjs";
export default class PerformanceOverlay{
  static Version = "Alpha 0.1.5";
  static Build = 27;
  constructor(){
    this.Graph = new GraphOverlay;
    this.ZIndex = this.Graph.Properties.ZIndex + 1;
    this.Wrapper = document.createElement("div");
    document.getElementsByTagName("body")[0].appendChild(this.Wrapper);
    this.Wrapper.style.zIndex = this.ZIndex;
    this.Wrapper.classList.add("DebugInfoOverlayWrapper");
    this.Info = [];
    this.GraphSource = function(){return 0};

    document.addEventListener("keydown", function(Event){
      if(Event.key === "F3"){
        Event.preventDefault();
        this.ToggleVisibility();
      }
    }.bind(this));
    window.requestAnimationFrame(function(){
      this.Update();
    }.bind(this));
  }
  AddInfo(Functions){
    for(let i = 0, Length = Functions.length; i < Length; i++){

      let TextElement = document.createElement("p");
      this.Wrapper.appendChild(TextElement);
      this.Wrapper.appendChild(document.createElement("br"));

      this.Info.push({"Function": Functions[i], "TextElement": TextElement});
    }
    return this;
  }
  ToggleVisibility(){
    if(this.Wrapper.style.display === "none"){
      this.Wrapper.style.display = "block";
      this.Graph.Renderer.view.style.display = "block";
    }
    else{
      this.Wrapper.style.display = "none";
      this.Graph.Renderer.view.style.display = "none";
    }
    return this;
  }
  Update(){
    window.requestAnimationFrame(function(){
      this.Update();
    }.bind(this));
    this.Graph.AddItem(this.GraphSource());
    for(let i = 0, Length = this.Info.length; i < Length; i++){
      this.Info[i].TextElement.innerHTML = this.Info[i].Function();
    }
  }
}
