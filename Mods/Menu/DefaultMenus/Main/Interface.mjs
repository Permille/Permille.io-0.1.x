export default class Interface{
  constructor(){
    this.IFrame = document.createElement("iframe");
    this.IFrame.style.position = "absolute";
    //this.IFrame.style.display = "none";
    this.IFrame.style.display = "block";
    this.Hide();
    //this.IFrame.sandbox = "";
    this.IFrame.setAttribute("src", "./Mods/Menu/DefaultMenus/Main/index.xhtml");
    document.body.appendChild(this.IFrame);

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
    this.IFrame.style.marginLeft = "0";//display = "block";
  }
  Hide(){
    //Stupid css animations firing whenever the iframe becomes visible again...
    this.IFrame.style.marginLeft =  "-9999px";//display = "none";
  }
}
