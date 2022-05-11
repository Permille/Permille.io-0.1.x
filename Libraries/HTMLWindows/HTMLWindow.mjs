import Utilities from "../Utilities/0.7.13.9/Utilities.mjs";
import Listenable from "../Listenable/1.2/Listenable.mjs";

export default class HTMLWindow{
  static Windows = {};
  static CurrentZIndex = 1;
  static ContainerElement = null;
  static StyleElement = null;

  static _ = HTMLWindow.Initialise();
  static Initialise(){
    delete HTMLWindow._;
    delete HTMLWindow.Initialise;

    HTMLWindow.ContainerElement = document.createElement("div");

    HTMLWindow.ContainerElement.style.cssText = `
      position: absolute;
      display: block;
      min-width: 100%;
      min-height: 100%;
      z-index: 10;
      pointer-events: none;
      overflow: hidden;
    `;

    document.body.appendChild(HTMLWindow.ContainerElement);

    HTMLWindow.StyleElement = document.createElement("style");
    HTMLWindow.StyleElement.innerText = `
      .ResizeWrapper{ ` + /*This rule is for the parent element which is created with code in the constructor */ `
        pointer-events: auto;
        position: absolute;
        padding: 8px;
        user-select: none;
      }
      .WindowWrapper{
        font-family: Escape, Helvetica, sans-serif;
        font-size: 16px;
        display: flex;
        flex-direction: column;
        border: 1px solid black;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      .WindowWrapper > .Title{
        background-color: #00afff5f;
        border-bottom: 1px solid black;
        display: flex;
        align-items: center;
        max-height: 34px;
        height: 34px;
        width: 100%;
        position: relative;
        user-select: none;
        overflow: hidden;
        transition: height 0.5s;
      }
      .WindowWrapper > .Title.Collapsed{
        height: 1px;
      }
      .WindowWrapper > .Title.Collapsed:hover{
        height: 34px;
        transition: height 0.2s;
      }
      .WindowWrapper > .Title > .TitleText{
        margin-inline: 12px auto;
        pointer-events: none;
      }
      .WindowWrapper > .Title > img{
        height: 34px;
        -webkit-user-drag: none;
        cursor: pointer;
        transition: backdrop-filter 0.1s;
      }
      .WindowWrapper > .Title > img:hover{
        backdrop-filter: brightness(.8);
      }
      .WindowWrapper > iframe{
        border: none;
        margin: 0;
        padding: 0;
        flex-grow: 1;
        height: auto;
      }
    `;
    document.head.appendChild(HTMLWindow.StyleElement);
  }
  static HTMLTemplate = `
    <div class="WindowWrapper">
      <div class="Title">
        <div class="TitleText">Window title</div>
        <img data-action="Fullscreen" src="./Libraries/HTMLWindows/Fullscreen.svg" />
        <img data-action="Close" src="./Libraries/HTMLWindows/Close.svg" />
      </div>
      <iframe>
        Not loaded
      </iframe>
    </div>
  `;
  static DefaultParameters = {
    "src": null,
    "Width": 600,
    "Height": 280,
    "MinWidth": 100,
    "MinHeight": 70,
    "MaxWidth": Infinity,
    "MaxHeight": Infinity,
    "PositionX": 200,
    "PositionY": 200,
    "TitleColour": "#00afff5f",
    "TitleText": "Window Title",
    "BackdropFilter": "blur(3px)"
  };
  constructor(GivenParameters = {}){
    const Parameters = Utilities.MergeObjects(GivenParameters, HTMLWindow.DefaultParameters);

    this.Events = new Listenable;

    if(Parameters.ID in HTMLWindow.Windows || Parameters.ID === undefined){
      console.warn("Window ID was already in use or not provided.");
      this.ID = Utilities.CreateUUID();
    } else this.ID = Parameters.ID;
    HTMLWindow.Windows[this.ID] = this;

    this.Element = document.createElement("div");
    this.Element.className = "ResizeWrapper";
    this.Element.style.zIndex = HTMLWindow.CurrentZIndex++ + "";
    this.Element.innerHTML = HTMLWindow.HTMLTemplate;
    this.IFrame = this.Element.querySelector("iframe");

    this.Properties = this.InitialiseGettersSetters(Parameters);
    this.MakeDraggable();
    this.MakeResizeable();
    this.SetupEventListeners();

    HTMLWindow.ContainerElement.appendChild(this.Element);
  }
  InitialiseGettersSetters(Parameters){
    const InternalCopy = Object.assign({}, Parameters);
    const Properties = {};
    Object.defineProperties(Properties, {
      "src": {
        "get": function(){ return InternalCopy.src; },
        "set": function(Value){
          InternalCopy.src = Value;
          this.Element.querySelector("iframe").src = Value;
        }.bind(this)
      },
      "Width": {
        "get": function(){ return InternalCopy.Width; },
        "set": function(Value){
          Value = Math.max(Math.min(Value, InternalCopy.MaxWidth ?? Infinity), InternalCopy.MinWidth ?? 0);
          InternalCopy.Width = Value;
          this.Element.style.width = Value + "px";
        }.bind(this)
      },
      "Height": {
        "get": function(){ return InternalCopy.Height; },
        "set": function(Value){
          Value = Math.max(Math.min(Value, InternalCopy.MaxHeight ?? Infinity), InternalCopy.MinHeight ?? 0);
          InternalCopy.Height = Value;
          this.Element.style.height = Value + "px";
        }.bind(this)
      },
      "MinWidth": {
        "get": function(){ return InternalCopy.MinWidth; },
        "set": function(Value){
          InternalCopy.MinWidth = Math.max(Value, 80);
          Properties.Width = Properties.Width;
        }.bind(this)
      },
      "MinHeight": {
        "get": function(){ return InternalCopy.MinHeight; },
        "set": function(Value){
          InternalCopy.MinHeight = Math.max(Value, 50);
          Properties.Height = Properties.Height;
        }.bind(this)
      },
      "MaxWidth": {
        "get": function(){ return InternalCopy.MaxWidth; },
        "set": function(Value){
          InternalCopy.MaxWidth = Value;
          Properties.Width = Properties.Width;
        }.bind(this)
      },
      "MaxHeight": {
        "get": function(){ return InternalCopy.MaxHeight; },
        "set": function(Value){
          InternalCopy.MaxHeight = Value;
          Properties.Height = Properties.Height;
        }.bind(this)
      },
      "PositionX": {
        "get": function(){ return InternalCopy.PositionX; },
        "set": function(Value){
          Value = Math.max(Math.min(Value, window.innerWidth - Properties.Width / 2), -Properties.Width / 2);
          InternalCopy.PositionX = Value;
          this.Element.style.left = Value + "px";
        }.bind(this)
      },
      "PositionY": {
        "get": function(){ return InternalCopy.PositionY; },
        "set": function(Value){
          Value = Math.max(Math.min(Value, window.innerHeight - Properties.Height / 2), -8); //-8 is because of the resizing border
          InternalCopy.PositionY = Value;
          this.Element.style.top = Value + "px";
        }.bind(this)
      },
      "TitleColour": {
        "get": function(){ return InternalCopy.TitleColour; },
        "set": function(Value){
          InternalCopy.TitleColour = Value;
          this.Element.querySelector(".Title").style.backgroundColor = Value;
        }.bind(this)
      },
      "TitleText": {
        "get": function(){ return InternalCopy.TitleText; },
        "set": function(Value){
          InternalCopy.TitleText = Value;
          this.Element.querySelector(".TitleText").textContent = Value;
        }.bind(this)
      },
      "BackdropFilter": {
        "get": function(){ return InternalCopy.BackdropFilter; },
        "set": function(Value){
          InternalCopy.BackdropFilter = Value;
          this.Element.firstElementChild.style.backdropFilter = Value;
        }.bind(this)
      }
    });

    for(const Property in InternalCopy){
      Properties[Property] = InternalCopy[Property]; //Invoke setters
    }
    return Properties;
  }
  MakeDraggable(){
    const Element = this.Element;
    const IFrame = Element.querySelector("iframe");
    let Dragging = false;
    let PreviousX = null;
    let PreviousY = null;
    const Deactivate = function(){
      IFrame.style.pointerEvents = "auto";
      HTMLWindow.ContainerElement.style.pointerEvents = "none";
      Dragging = false;
      PreviousX = null;
      PreviousY = null;
    };
    Element.querySelector(".Title").addEventListener("mousedown", function(Event){
      if(Event.target !== this) return;
      IFrame.style.pointerEvents = "none";
      HTMLWindow.ContainerElement.style.pointerEvents = "auto";
      Dragging = true;
      PreviousX = Event.clientX;
      PreviousY = Event.clientY;

      window.addEventListener("mouseup", Deactivate, {"once": true});
    });
    window.addEventListener("mousemove", function(Event){
      if(!Dragging) return;
      if((Event.buttons & 1) === 0) return void Deactivate();

      const CurrentX = Event.clientX;
      const CurrentY = Event.clientY;

      const OffsetX = CurrentX - PreviousX;
      const OffsetY = CurrentY - PreviousY;

      PreviousX = CurrentX;
      PreviousY = CurrentY;

      this.Properties.PositionX = Number.parseInt(Element.style.left, 10) + OffsetX;
      this.Properties.PositionY = Number.parseInt(Element.style.top, 10) + OffsetY;
    }.bind(this));
  }
  MakeResizeable(){
    const Properties = this.Properties;
    const IFrame = this.Element.querySelector("iframe");
    let Resizing = false;
    let PreviousX = null;
    let PreviousY = null;
    let SignX = 0;
    let SignY = 0;

    const Deactivate = function(){
      IFrame.style.pointerEvents = "auto";
      HTMLWindow.ContainerElement.style.pointerEvents = "none";
      HTMLWindow.ContainerElement.style.cursor = "auto";
      Resizing = false;
      PreviousX = null;
      PreviousY = null;
      SignX = 0;
      SignY = 0;
    };


    this.Element.addEventListener("mousemove", function(Event){
      if(Event.target !== this){
        this.style.cursor = "auto";
        return;
      }
      const Rect = this.getBoundingClientRect();
      const RectX = Event.clientX - Rect.left;
      const RectY = Event.clientY - Rect.top;
      const ElementSignX = Math.floor((RectX - 8) / (Properties.Width - 16));
      const ElementSignY = Math.floor((RectY - 8) / (Properties.Height - 16));

      let Cursor = "";
      if(ElementSignY < 0) Cursor += "n";
      else if(ElementSignY > 0) Cursor += "s";
      if(ElementSignX < 0) Cursor += "w";
      else if(ElementSignX > 0) Cursor += "e";
      Cursor += "-resize";
      this.style.cursor = Cursor;
    });

    this.Element.addEventListener("mousedown", function(Event){
      if(Event.target !== this) return;
      Resizing = true;

      IFrame.style.pointerEvents = "none";
      HTMLWindow.ContainerElement.style.pointerEvents = "auto";

      PreviousX = Event.clientX;
      PreviousY = Event.clientY;

      const Rect = this.getBoundingClientRect();
      const RectX = Event.clientX - Rect.left;
      const RectY = Event.clientY - Rect.top;
      SignX = Math.floor((RectX - 8) / (Properties.Width - 16));
      SignY = Math.floor((RectY - 8) / (Properties.Height - 16));

      window.addEventListener("mouseup", Deactivate, {"once": true});
    });
    window.addEventListener("mousemove", function(Event){
      if(!Resizing) return;
      if((Event.buttons & 1) === 0) return void Deactivate();

      const CurrentX = Event.clientX;
      const CurrentY = Event.clientY;

      const OffsetX = CurrentX - PreviousX;
      const OffsetY = CurrentY - PreviousY;

      PreviousX = CurrentX;
      PreviousY = CurrentY;

      if(SignX < 0){
        const InitialWidth = Properties.Width;
        Properties.Width -= OffsetX;
        Properties.PositionX += InitialWidth - Properties.Width;
      } else if(SignX > 0){
        Properties.Width += OffsetX;
      }

      if(SignY < 0){
        const InitialHeight = Properties.Height;
        Properties.Height -= OffsetY;
        Properties.PositionY += InitialHeight - Properties.Height;
      } else if(SignY > 0){
        Properties.Height += OffsetY;
      }
    });
  }
  SetupEventListeners(){
    window.addEventListener("resize", function(){
      this.Properties.PositionX = this.Properties.PositionX;
      this.Properties.PositionY = this.Properties.PositionY; //Invoke setters so the position of the window doesn't go out of bounds
    }.bind(this));

    const WindowElement = this.Element.firstElementChild;
    const TitleElement = WindowElement.querySelector(".Title");

    const FullscreenButtonImage = this.Element.querySelector("img[data-action='Fullscreen']");
    FullscreenButtonImage.addEventListener("click", async function(){
      if(document.fullscreenElement === WindowElement){
        await document.exitFullscreen();
      } else{
        await WindowElement.requestFullscreen();
      }
    }.bind(this));
    WindowElement.addEventListener("fullscreenchange", function(){
      if(document.fullscreenElement){
        TitleElement.style.position = "absolute";
        WindowElement.style.border = "none";
        window.setTimeout(function(){
          TitleElement.classList.add("Collapsed");
        }, 1500);
      } else{
        TitleElement.style.position = "static";
        delete WindowElement.style.removeProperty("border");
        TitleElement.classList.remove("Collapsed");
      }
    });
    let PreviousWidth = 0;
    let PreviousHeight = 0;
    window.addEventListener("resize", function(){ //This is for when escape is pressed and the element is still fullscreened
      if(document.fullscreenElement) {
        if (PreviousWidth > window.innerWidth || PreviousHeight > window.innerHeight) document.exitFullscreen();
        PreviousWidth = window.innerWidth;
        PreviousHeight = window.innerHeight;
      }
    }.bind(this));

    this.Element.querySelector("img[data-action='Close']").addEventListener("click", function(){
      this.Hide();
    }.bind(this));

    this.IFrame.addEventListener("load", function(Event){
      this.Events.FireEventListeners("Loaded", Event);
    }.bind(this));
  }
  Hide(){
    this.Element.style.display = "none";
    this.Events.FireEventListeners("Hide");
  }
  Show(){
    this.Element.style.display = "block";
    this.Events.FireEventListeners("Show");
  }
};