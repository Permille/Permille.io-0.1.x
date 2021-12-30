///https://stackoverflow.com/a/16400626
/*Function.prototype.BindArgs =
    function (...boundArgs)
    {
        const targetFunction = this;
        return function (...args) { return targetFunction.call(this, ...boundArgs, ...args); };
    };*/
class ApplicationFrame{
	static Version = "0.8";
	static Build = 113;
	///Application frame that can host different HTML elements such as a canvas element.
	constructor(GivenApplicationProperties = {}){
		///Only some of the following features were implemented.
		let PropertiesTemplate = {
			"Border":{

			},
			"Dimensions":{
				"Current":{

				}
			},
			"Colours":{

			},
			"Title":{

			}
		};
		Object.defineProperty(PropertiesTemplate, "XPos", {
			"get": function(){
				return this.__XPos__;
			},
			"set": function(Scope, Val){
				this.__XPos__ = Val;
				Scope.WrapperElement.style.left = Val + "px";
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate, "YPos", {
			"get": function(){
				return this.__YPos__;
			},
			"set": function(Scope, Val){
				this.__YPos__ = Val;
				Scope.WrapperElement.style.top = Val + "px";
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate, "ZIndex", {
			"get": function(){
				return this.__ZIndex__;
			},
			"set": function(Scope, Val){
				this.__ZIndex__ = Val;
				Scope.WrapperElement.style.zIndex = Val;
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate.Border, "TransparentBorderWidth", {
			"get": function(){
				return this.__TransparentBorderWidth__;
			},
			"set": function(Scope, Val){
				this.__TransparentBorderWidth__ = Val;
				Scope.WrapperElement.style.padding = Val + "px";
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate.Dimensions.Current, "Width", {
			"get": function(){
				return this.__Width__;
			},
			"set": function(Scope, Val){
				//if(Scope?.Properties?.Dimensions?.Minimum?.Width === undefined);
				if(!(Scope.Properties && Scope.Properties.Dimensions && Scope.Properties.Dimensions.Minimum && Scope.Properties.Dimensions.Minimum.Width));
				else if(Val < Scope.Properties.Dimensions.Minimum.Width) Val = Scope.Properties.Dimensions.Minimum.Width;
				else if(!(Scope.Properties && Scope.Properties.Dimensions && Scope.Properties.Dimensions.Minimum && Scope.Properties.Dimensions.Maximum.Width));
				else if (Val > Scope.Properties.Dimensions.Maximum.Width) Val = Scope.Properties.Dimensions.Maximum.Width;
				this.__Width__ = Val;
				Scope.WrapperElement.style.width = Val + "px";
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate.Dimensions.Current, "Height", {
			"get": function(){
				return this.__Height__;
			},
			"set": function(Scope, Val){
				//if(Scope?.Properties?.Dimensions?.Minimum?.Height === undefined);
				if(!(Scope.Properties && Scope.Properties.Dimensions && Scope.Properties.Dimensions.Minimum && Scope.Properties.Dimensions.Minimum.Height));
				else if(Val < Scope.Properties.Dimensions.Minimum.Height) Val = Scope.Properties.Dimensions.Minimum.Height;
				else if(!(Scope.Properties && Scope.Properties.Dimensions && Scope.Properties.Dimensions.Maximum && Scope.Properties.Dimensions.Maximum.Height));
				else if (Val > Scope.Properties.Dimensions.Maximum.Height) Val = Scope.Properties.Dimensions.Maximum.Height;
				this.__Height__ = Val;
				Scope.WrapperElement.style.height = Val + "px";
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate.Border, "Width", {
			"get": function(){
				return this.__Width__;
			},
			"set": function(Scope, Val){
				this.__Width__ = Val;
				Scope.Elements.TableElement.style.border = Val + "px solid black";
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate.Colours, "Background", {
			"get": function(){
				return this.__Background__;
			},
			"set": function(Scope, Val){
				this.__Background__ = Val;
				Scope.Elements.BodyElement.style.backgroundColor = Val;
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate.Colours, "TitleBar", {
			"get": function(){
				return this.__TitleBar__;
			},
			"set": function(Scope, Val){
				this.__TitleBar__ = Val;
				Scope.Elements.TitleElement.style.backgroundColor = Val;
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate.Title, "Text", {
			"get": function(){
				return this.__Text__;
			},
			"set": function(Scope, Val){
				this.__Text__ = Val;
				Scope.Elements.TitleText.nodeValue = Val;
			}.BindArgs(this)
		});
		Object.defineProperty(PropertiesTemplate.Title, "Padding", {
			"get": function(){
				return this.__Padding__;
			},
			"set": function(Scope, Val){
				this.__Padding__ = Val;
				Scope.Elements.Title.style.padding = Val;
			}.BindArgs(this)
		});
		let DefaultApplicationProperties = { //The default properties.
			"XPos": 0,
			"YPos": 0,
			"ZIndex": 1073741824,
			"Dimensions":{
				"LockAspectRatio": true,
				"Current":{
					"Width": 1282,
					"Height": 742
				},
				"Minimum":{
					"Width": 200,
					"Height": 100
				},
				"Maximum":{
					"Width": 1920,
					"Height": 1080
				}
			},
			"Colours":{
				"Window": "#dfdfdf",
				"Border": "#0000007f",
				"TitleSelected": "#007f7f",
				"TitleNormal": "#dfdfdf7f"
			},
			"Border":{
				"Width": 1,
				"TransparentBorderWidth": 7 //This is used to resize the window.
			},
			"Title":{
				"TextSize": 13,
				"Font": "ESCAPE",
				"Padding": "3px",
				"Text": "ApplicationFrame"
			},
			"TitleButtons":[
				{
					"Name": "Close",
					"Tooltip": "Close",
					"ButtonIndex": 0 //The position of the button in the buttons table.
				}
			]
		};

		this.EventListeners = [];
		this.Resizing = false;
		this.Dragging = false;
		this.Elements = {};

		this.InitializeHTML();
		this.Properties = Utilities.MergeObjects(GivenApplicationProperties, DefaultApplicationProperties, PropertiesTemplate);
		this.InitializeProperties();
	}
	InitializeNativeEventListeners(){
		this.AddEventListener("Resize", function(NewWidth, NewHeight){ ///Refactor!!!!!!!!!!!!!!!!!
			NewWidth -= 2;
			NewHeight -= 22;
			this.Elements.Main.style.transformOrigin = "0% 0% 0px";
			this.Elements.Main.style.transform = "scale(" + (NewWidth / 1280) + "," + (NewHeight / 720) + ")";
		}.bind(this));
	}
	InitializeHTML(){
		///This is mostly just HTML markup in javascript
		//Window Element Initialization
		this.WrapperElement = document.createElement("div");
		document.getElementsByTagName("body")[0].appendChild(this.WrapperElement);
		this.WrapperElement.style.backgroundColor = "#00000000";
		this.WrapperElement.style.position = "absolute";
		this.Elements.TableElement = document.createElement("table");
		this.Elements.TitleElement = document.createElement("tr");
		this.Elements.BodyElement = document.createElement("tr");
		this.Elements.TableElement.appendChild(this.Elements.TitleElement);
		this.Elements.TableElement.appendChild(this.Elements.BodyElement);
		this.WrapperElement.appendChild(this.Elements.TableElement);


		this.Elements.Main = document.createElement("div");
		this.Elements.Main.style.backgroundColor = "#00000000";
		this.Elements.Main.style.width = "0%"; ///This is because scaling messes up the width of this element, and it's just a wrapper anyway
		this.Elements.Main.style.height = "0%";

		this.Elements.MainWrapper = document.createElement("div");
		this.Elements.MainWrapper.style.width = "100%";
		this.Elements.MainWrapper.style.height = "100%";
		this.Elements.MainWrapper.appendChild(this.Elements.Main);
		this.Elements.BodyElement.appendChild(this.Elements.MainWrapper);

		this.Elements.TableElement.style.borderCollapse = "collapse";
		this.Elements.TableElement.style.width = "100%";
		this.Elements.TableElement.style.height = "100%";
		this.Elements.TitleElement.style.width = "100%";
		this.Elements.BodyElement.style.width = "100%";
		this.Elements.BodyElement.style.height = "100%";


		this.Elements.Title = document.createElement("div");
		this.Elements.TitleWrapper = document.createElement("div");
		this.Elements.TitleWrapper.appendChild(this.Elements.Title);
		this.Elements.TitleElement.appendChild(this.Elements.TitleWrapper);

		this.Elements.Title.appendChild(this.Elements.TitleText = document.createTextNode(""));
		this.Elements.Title.style.display = "inline-block";
	}
	InitializeProperties(){
		this.InitializeNativeEventListeners();
		///This function will apply all of the properties.
		//Window Element Initialization


		///All of these properties should be set with object setters!!!


		//this.WrapperElement.style.padding = this.Properties.Border.TransparentBorderWidth + "px";

		//this.WrapperElement.style.zIndex = this.Properties.ZIndex;

		//this.WrapperElement.style.left = this.Properties.XPos + "px";
		//this.WrapperElement.style.top = this.Properties.YPos + "px";

		//this.WrapperElement.style.width = this.Properties.Dimensions.Default.Width + "px";
		//this.WrapperElement.style.height = this.Properties.Dimensions.Default.Height + "px";

		//this.Elements.TableElement.style.border = this.Properties.Border.Width + "px solid black";

		//this.Elements.BodyElement.style.backgroundColor = this.Properties.Colours.Background;
		//this.Elements.TitleElement.style.backgroundColor = this.Properties.Colours.TitleBar;

		//this.Elements.TitleText.nodeValue = this.Properties.Title.Text;

		//this.Elements.Title.style.padding = this.Properties.Title.Padding;

		/*let WindowIcon = document.createElement("img");
		WindowIcon.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABxSURBVDhPYzQwMPjPQAEAG/D7xw9GKJ8kwMrB8R9uAIgDFScKwPQwQflgABIkBkOVgwGKAeSA4W7A1Rs3oCzcAKcBIM3aGhpQHm6A1QBiNYMAhgGkaAYBDANI0QwCKAaAkiYxGKocDKiTmaB8MgADAwDspEvnAOfIRwAAAABJRU5ErkJggg==";
		WindowIcon.style.float = "left";
		WindowIcon.style.margin = "2px";
		WindowIcon.style.display = "inline-block";
		this.Elements.Title.parentElement.appendChild(WindowIcon);

		let OtherIcon = document.createElement("img");
		OtherIcon.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABxSURBVDhPYzQwMPjPQAEAG/D7xw9GKJ8kwMrB8R9uAIgDFScKwPQwQflgABIkBkOVgwGKAeSA4W7A1Rs3oCzcAKcBIM3aGhpQHm6A1QBiNYMAhgGkaAYBDANI0QwCKAaAkiYxGKocDKiTmaB8MgADAwDspEvnAOfIRwAAAABJRU5ErkJggg==";
		OtherIcon.style.float = "right";
		OtherIcon.style.margin = "2px";
		OtherIcon.style.display = "inline-block";
		this.Elements.Title.parentElement.appendChild(OtherIcon);*/

		{
			let DivElement = document.createElement("div");
			DivElement.innerHTML = "Go Fullscreen";
			DivElement.style.backgroundColor = "#007fffaf";
			DivElement.style.height = "13px";
			DivElement.style.padding = "3px 3px 0px 3px";
			DivElement.style.margin = "2px 1px 2px 1px";
			DivElement.style.float = "right";
			DivElement.style.display = "inline-block";
			this.Elements.Title.parentElement.appendChild(DivElement);

			let DivElement2 = document.createElement("div");
			DivElement2.innerHTML = "Resolution: 1280 * 720";
			DivElement2.style.backgroundColor = "#007fffaf";
			DivElement2.style.height = "13px";
			DivElement2.style.padding = "3px 3px 0px 3px";
			DivElement2.style.margin = "2px 1px 2px 1px";
			DivElement2.style.float = "right";
			DivElement2.style.display = "inline-block";
			this.Elements.Title.parentElement.appendChild(DivElement2);
		}
		///#############################################



		//Native Event Listener Initialization

		let InitialX;
		let InitialY;
		let ResizeType;
		let WindowX;
		let WindowY;
		let Width;
		let Height;

		let TransparentBorderWidth = this.Properties.Border.TransparentBorderWidth;

		///I've used some of the code from here: https://www.w3schools.com/howto/howto_js_draggable.asp

		///This is to show the custom resizing cursor.
		this.WrapperElement.addEventListener("mouseover", function(Event){
			InitialX = Event.clientX;
			InitialY = Event.clientY;
			WindowX = InitialX - this.WrapperElement.offsetLeft; //Fair enough...
			WindowY = InitialY - this.WrapperElement.offsetTop;


			Width = this.Properties.Dimensions.Current.Width;
			Height = this.Properties.Dimensions.Current.Height;

			this.WrapperElement.style.cursor = "default";
			//Determine the direction in which the window would be resized.
			if(WindowX >= 0 && WindowX <= TransparentBorderWidth) this.WrapperElement.style.cursor = "w-resize";
			if(WindowY >= TransparentBorderWidth + Height && WindowY <= 2 * TransparentBorderWidth + Height) this.WrapperElement.style.cursor = "s-resize";
			if(WindowX >= TransparentBorderWidth + Width && WindowX <= 2 * TransparentBorderWidth + Width) this.WrapperElement.style.cursor = "e-resize";
			if(WindowY >= 0 && WindowY <= TransparentBorderWidth) this.WrapperElement.style.cursor = "n-resize";

			if(WindowX >= 0 && WindowX <= TransparentBorderWidth && WindowY >= TransparentBorderWidth + Height && WindowY <= 2 * TransparentBorderWidth + Height) this.WrapperElement.style.cursor = "sw-resize";
			if(WindowY >= 0 && WindowY <= TransparentBorderWidth && WindowX >= 0 && WindowX <= TransparentBorderWidth) this.WrapperElement.style.cursor = "nw-resize";
			if(WindowY >= 0 && WindowY <= TransparentBorderWidth && WindowX >= TransparentBorderWidth + Width && WindowX <= 2 * TransparentBorderWidth + Width) this.WrapperElement.style.cursor = "ne-resize";
			if(WindowX >= TransparentBorderWidth + Width && WindowX <= 2 * TransparentBorderWidth + Width && WindowY >= TransparentBorderWidth + Height && WindowY <= 2 * TransparentBorderWidth + Height) this.WrapperElement.style.cursor = "se-resize";
		}.bind(this));





		///This will initialise the resizing operation.
		this.WrapperElement.addEventListener("mousedown", function(Event){
			//Determine which part of the window border, if any, was clicked.
			InitialX = Event.clientX;
			InitialY = Event.clientY;
			WindowX = InitialX - this.WrapperElement.offsetLeft;
			WindowY = InitialY - this.WrapperElement.offsetTop;

			ResizeType = undefined;

			Width = this.Properties.Dimensions.Current.Width;
			Height = this.Properties.Dimensions.Current.Height;

			//Determine the direction in which the window will be resized.
			if(WindowX >= 0 && WindowX <= TransparentBorderWidth) ResizeType = "W"; //West (left)
			if(WindowY >= TransparentBorderWidth + Height && WindowY <= 2 * TransparentBorderWidth + Height) ResizeType = "S"; //South (down)
			if(WindowX >= TransparentBorderWidth + Width && WindowX <= 2 * TransparentBorderWidth + Width) ResizeType = "E"; //East (right)
			if(WindowY >= 0 && WindowY <= TransparentBorderWidth) ResizeType = "N"; //North (up)

			if(WindowX >= 0 && WindowX <= TransparentBorderWidth && WindowY >= TransparentBorderWidth + Height && WindowY <= 2 * TransparentBorderWidth + Height) ResizeType = "SW";
			if(WindowY >= 0 && WindowY <= TransparentBorderWidth && WindowX >= 0 && WindowX <= TransparentBorderWidth) ResizeType = "NW";
			if(WindowY >= 0 && WindowY <= TransparentBorderWidth && WindowX >= TransparentBorderWidth + Width && WindowX <= 2 * TransparentBorderWidth + Width) ResizeType = "NE";
			if(WindowX >= TransparentBorderWidth + Width && WindowX <= 2 * TransparentBorderWidth + Width && WindowY >= TransparentBorderWidth + Height && WindowY <= 2 * TransparentBorderWidth + Height) ResizeType = "SE";

			if(ResizeType !== undefined) this.Resizing = true;


		}.bind(this));



		this.WrapperElement.addEventListener("dragstart", //I don't want to "drag" the element.
		function(Event){
			if(this.Resizing) Event.preventDefault;
		}.bind(this), {once: true});

		window.addEventListener("mouseup", //Has to be window in the case that the cursor went outside of the wrapper element while resizing
		function(Event){
			Event = Event || window.event;
			Event.preventDefault();
			this.Resizing = false;
			ResizeType = undefined;
		}.bind(this));

		///Resizes the window each time the mouse moves.
		window.addEventListener("mousemove",
		function(Event){
			if(!this.Resizing) return;

			let OffsetX = InitialX - Event.clientX;
			let OffsetY = InitialY - Event.clientY;
			InitialX = Event.clientX;
			InitialY = Event.clientY;


			WindowX = InitialX - this.WrapperElement.offsetLeft;
			WindowY = InitialY - this.WrapperElement.offsetTop;



			switch(ResizeType){
				case "N":
					this.Properties.Dimensions.Current.Height += OffsetY;
					this.Properties.YPos -= OffsetY;
				break;
				case "E":
					this.Properties.Dimensions.Current.Width -= OffsetX;
				break;
				case "W":
					this.Properties.Dimensions.Current.Width += OffsetX;
					this.Properties.XPos -= OffsetX;
				break;
				case "S":
					this.Properties.Dimensions.Current.Height -= OffsetY;
				break;
				case "NE":
					this.Properties.Dimensions.Current.Height += OffsetY;
					this.Properties.YPos -= OffsetY;
					this.Properties.Dimensions.Current.Width -= OffsetX;
				break;
				case "SE":
					this.Properties.Dimensions.Current.Height -= OffsetY;
					this.Properties.Dimensions.Current.Width -= OffsetX;
				break;
				case "SW":
					this.Properties.Dimensions.Current.Height -= OffsetY;
					this.Properties.Dimensions.Current.Width += OffsetX;
					this.Properties.XPos -= OffsetX;
				break;
				case "NW":
					this.Properties.Dimensions.Current.Height += OffsetY;
					this.Properties.YPos -= OffsetY;
					this.Properties.Dimensions.Current.Width += OffsetX;
					this.Properties.XPos -= OffsetX;
				break;
			}

			this.FireEventListeners("Resize", parseInt(this.WrapperElement.style.width.split("px")[0]), parseInt(this.WrapperElement.style.height.split("px")[0]));
		}.bind(this));




		///This is for moving around the window.
		this.Elements.Title.parentElement.addEventListener("mousedown",
		///This is when it starts
		function(e){
			InitialX = e.clientX;
			InitialY = e.clientY;

			this.Dragging = true;

			///When the mouse is released, the window should stop following the mouse.
			window.addEventListener("mouseup",
			function(e){
				e.preventDefault();
				if(this.Dragging) this.Dragging = false;
			}.bind(this), {"once":true});
			///When the mouse is moved, the window should be moved by the same amount.
			window.addEventListener("mousemove",
			function(e){
				if(!this.Dragging) return;
				let OffsetX = InitialX - e.clientX;
				let OffsetY = InitialY - e.clientY;
				InitialX = e.clientX;
				InitialY = e.clientY;
				WindowX = InitialX - this.WrapperElement.offsetLeft;
				WindowY = InitialY - this.WrapperElement.offsetTop;
				if(WindowY < 200){
					e.preventDefault();
				}
				this.Properties.XPos -= OffsetX;
				this.Properties.YPos -= OffsetY;
			}.bind(this));

		}.bind(this));
	}
	SetApplicationProperty(){
		console.warn("This feature hasn't been implemented yet.");
	}
	AddApplicationElement(Element){
		this.Elements.Main.appendChild(Element); ///Is mostly used to layer canvas elements.
	}
	GetApplicationElement(){
		console.warn("This feature hasn't been implemented yet.");
	}
	GetApplicationElements(Type){
		console.warn("This feature hasn't been implemented yet.");
	}
	RemoveApplicationElement(ID){
		console.warn("This feature hasn't been implemented yet.");
	}
	AddEventListener(Event, Function){
		this.EventListeners.push({
			"Event": Event,
			"Function": Function
		});
	}
	FireEventListeners(Event, ...Parameters){
		for(let i = 0; i < this.EventListeners.length; i++) if(this.EventListeners[i].Event === Event) this.EventListeners[i].Function(...Parameters);
	}
	GetWidth(){
		return Number((this.WrapperElement.style.width).substring(0, (this.WrapperElement.style.width).length - 2));
	}
	GetHeight(){
		return Number((this.WrapperElement.style.height).substring(0, (this.WrapperElement.style.height).length - 2));
	}
	GetXPos(){
		return Number((this.WrapperElement.style.left).substring(0, (this.WrapperElement.style.left).length - 2)) + this.Properties.Border.TransparentBorderWidth;
	}
	GetYPos(){
		return Number((this.WrapperElement.style.top).substring(0, (this.WrapperElement.style.top).length - 2)) + this.Properties.Border.TransparentBorderWidth;
	}
	SetWidth(Width){
		this.WrapperElement.style.width = Width + "px";
	}
	SetHeight(Height){
		this.WrapperElement.style.height = Height + "px";
	}
	Open(){
		this.WrapperElement.style.display = "block";
	}
	Close(){
		this.WrapperElement.style.display = "none";
	}
}
