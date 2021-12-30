export default class ChatInterface{
  constructor(){
    this.IFrame = document.createElement("iframe");
    this.IFrame.style.position = "absolute";
    this.IFrame.style.display = "none";
    //this.IFrame.sandbox = "";
    this.IFrame.setAttribute("src", "./Mods/Chat/index.xhtml");
    document.body.appendChild(this.IFrame);

    this.IFrame.addEventListener("load", function(){
      this.IFrame.contentDocument.documentElement.addEventListener("click", function(Event){
        if(Event.target === this.IFrame.contentDocument.documentElement){
          let x = Event.pageX - this.IFrame.offsetLeft;
          let y = Event.pageY - this.IFrame.offsetTop;

          this.IFrame.style.pointerEvents = "none"; //Need to turn this off so it doesn't click itself, but the element underneath.
          document.elementFromPoint(x, y)?.click();
          this.IFrame.style.pointerEvents = "all";

          let Input = this.IFrame.contentDocument.getElementById("Input");
          Input.focus();
          //Input.selectionStart = Input.selectionEnd = 1000;
          let Range = this.IFrame.contentDocument.createRange();
          let Selection = this.IFrame.contentWindow.getSelection();

          Range.setStart(Input.childNodes[0], Input.innerHTML.length);
          Range.collapse(true);

          Selection.removeAllRanges();
          Selection.addRange(Range);
        }
      }.bind(this));
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
