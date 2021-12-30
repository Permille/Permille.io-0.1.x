class ApplicationFrame{
	static Version = "0.7.13.1";
	static Build = 112;
	///Application frame that can host different HTML elements such as a canvas element.
	constructor(InitNow, GivenApplicationProperties = {}, PredefinedApplicationElements = {}){
		///Only some of the following features were implemented.
		this.DefaultApplicationProperties = { //The default properties.
			"XPos": 0,
			"YPos": 0,
			"ZIndex": 1073741824,
			"Dimensions":{
				"LockAspectRatio": true,
				"Default":{
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
		this.GivenApplicationProperties = GivenApplicationProperties;
		
		this.InnerResolution = {
			"Width": this.GetApplicationProperty("Dimensions", "Default", "Width") - 2, //Because of the borders...
			"Height": this.GetApplicationProperty("Dimensions", "Default", "Height") - 22
		};
		
		this.EventListeners = [];
		this.Resizing = false;
		this.Dragging = false;
		
		
		if(InitNow) this.Initialize();
	}
	GetApplicationProperty(...Properties){ //[Properties] is an array of strings/integers (passed through a series of parameters) that contain the path to the desired JSON property.
		///If the requested entry exists in [GivenApplicationProperties], that entry
		///will be returned. If it exists in [DefaultApplicationProperties], that default
		///entry will be returned. Otherwise, an exception will be thrown.
		///I should've used something similar to this when evaluating the properties of
		///interface elements.
		let Default = this.DefaultApplicationProperties;
		let Given = this.GivenApplicationProperties;
		for(let i = 0; i < Properties.length; i++){ ///Navigates to the requested property
			try{
				Default = Default[Properties[i]];
			} catch{
				throw("The non-existant property " + Properties[i] + " was queried on " + Default + " (" + i + ").");
			}
			try{
				Given = Given[Properties[i]];
			} catch{
				Given = undefined;
			}
		}
		if(Given === undefined) return Default;
		else return Given;
	}
	InitializeNativeEventListeners(){
		this.AddEventListener("Resize", function(NewWidth, NewHeight){
			this.InnerResolution.Width = NewWidth - 2;
			this.InnerResolution.Height = NewHeight - 22;
		}.bind(this));
	}
	Initialize(){
		this.InitializeNativeEventListeners();
		///This is mostly just HTML markup in javascript, and it also applies some of
		///the properties.
		//Window Element Initialization
		this.WrapperElement = document.createElement("div");
		document.getElementsByTagName("body")[0].appendChild(this.WrapperElement);
		
		this.WrapperElement.style.padding = this.GetApplicationProperty("Border", "TransparentBorderWidth") + "px";
		this.WrapperElement.style.backgroundColor = "#00000000";
		this.WrapperElement.style.zIndex = this.GetApplicationProperty("ZIndex");
		this.WrapperElement.style.position = "absolute";
		this.WrapperElement.style.left = this.GetApplicationProperty("XPos") + "px";
		this.WrapperElement.style.top = this.GetApplicationProperty("YPos") + "px";
		let TableElement = document.createElement("table");
		let TitleElement = document.createElement("tr");
		let BodyElement = document.createElement("tr");
		TableElement.appendChild(TitleElement);
		TableElement.appendChild(BodyElement);
		this.WrapperElement.appendChild(TableElement);
		
		
		this.MainElement = document.createElement("div");
		this.MainElement.style.backgroundColor = "#00000000";
		this.MainElement.style.width = "0%"; ///This is because scaling messes up the width of this element, and it's just a wrapper anyway
		this.MainElement.style.height = "0%";
		let MainWrapper = document.createElement("div");
		MainWrapper.style.width = "100%";
		MainWrapper.style.height = "100%";
		MainWrapper.appendChild(this.MainElement);
		BodyElement.appendChild(MainWrapper);
		this.WrapperElement.style.width = this.GetApplicationProperty("Dimensions", "Default", "Width") + "px";
		this.WrapperElement.style.height = this.GetApplicationProperty("Dimensions", "Default", "Height") + "px";
		
		TableElement.style.borderCollapse = "collapse";
		TableElement.style.border = this.GetApplicationProperty("Border", "Width") + "px solid black";
		TableElement.style.width = "100%";
		TableElement.style.height = "100%";
		TitleElement.style.width = "100%";
		BodyElement.style.width = "100%";
		BodyElement.style.height = "100%";
		BodyElement.style.backgroundColor = this.GetApplicationProperty("Colours", "Background");
		TitleElement.style.backgroundColor = this.GetApplicationProperty("Colours", "TitleBar");
		
		
		this.Title = document.createElement("div");
		let TitleWrapper = document.createElement("div");
		TitleWrapper.appendChild(this.Title);
		TitleElement.appendChild(TitleWrapper);
		
		this.Title.appendChild(document.createTextNode(this.GetApplicationProperty("Title", "Text")));
		//data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABxSURBVDhPYzQwMPjPQAEAG/D7xw9GKJ8kwMrB8R9uAIgDFScKwPQwQflgABIkBkOVgwGKAeSA4W7A1Rs3oCzcAKcBIM3aGhpQHm6A1QBiNYMAhgGkaAYBDANI0QwCKAaAkiYxGKocDKiTmaB8MgADAwDspEvnAOfIRwAAAABJRU5ErkJggg==
		///#############################################
		/*
		let WindowIcon = document.createElement("img");
		WindowIcon.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABxSURBVDhPYzQwMPjPQAEAG/D7xw9GKJ8kwMrB8R9uAIgDFScKwPQwQflgABIkBkOVgwGKAeSA4W7A1Rs3oCzcAKcBIM3aGhpQHm6A1QBiNYMAhgGkaAYBDANI0QwCKAaAkiYxGKocDKiTmaB8MgADAwDspEvnAOfIRwAAAABJRU5ErkJggg==";
		WindowIcon.style.float = "left";
		WindowIcon.style.margin = "2px";
		WindowIcon.style.display = "inline-block";
		this.Title.style.display = "inline-block";
		this.Title.parentElement.appendChild(WindowIcon);
		
		let OtherIcon = document.createElement("img");
		OtherIcon.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABxSURBVDhPYzQwMPjPQAEAG/D7xw9GKJ8kwMrB8R9uAIgDFScKwPQwQflgABIkBkOVgwGKAeSA4W7A1Rs3oCzcAKcBIM3aGhpQHm6A1QBiNYMAhgGkaAYBDANI0QwCKAaAkiYxGKocDKiTmaB8MgADAwDspEvnAOfIRwAAAABJRU5ErkJggg==";
		OtherIcon.style.float = "right";
		OtherIcon.style.margin = "2px";
		OtherIcon.style.display = "inline-block";
		this.Title.parentElement.appendChild(OtherIcon);
		
		let DivElement = document.createElement("div");
		DivElement.innerHTML = "Go Fullscreen";
		DivElement.style.backgroundColor = "#007fffaf";
		DivElement.style.height = "13px";
		DivElement.style.padding = "3px 3px 0px 3px";
		DivElement.style.margin = "2px 1px 2px 1px";
		DivElement.style.float = "right";
		DivElement.style.display = "inline-block";
		this.Title.parentElement.appendChild(DivElement);
		
		let DivElement2 = document.createElement("div");
		DivElement2.innerHTML = "Resolution: 1280 * 720";
		DivElement2.style.backgroundColor = "#007fffaf";
		DivElement2.style.height = "13px";
		DivElement2.style.padding = "3px 3px 0px 3px";
		DivElement2.style.margin = "2px 1px 2px 1px";
		DivElement2.style.float = "right";
		DivElement2.style.display = "inline-block";
		this.Title.parentElement.appendChild(DivElement2);
		*/
		///#############################################
		
		this.Title.style.padding = this.GetApplicationProperty("Title", "Padding");
		
		//Native Event Listener Initialization
		
		let InitialX;
		let InitialY;
		let ResizeType;
		let WindowX;
		let WindowY;
		let Width;
		let Height;
		
		let TransparentBorderWidth = this.GetApplicationProperty("Border", "TransparentBorderWidth");
		
		///I've used some of the code from here: https://www.w3schools.com/howto/howto_js_draggable.asp
		
		///This is to show the custom resizing cursor.
		this.WrapperElement.addEventListener("mouseover", function(Event){
			InitialX = Event.clientX;
			InitialY = Event.clientY;
			WindowX = InitialX - this.WrapperElement.offsetLeft;
			WindowY = InitialY - this.WrapperElement.offsetTop;
			
			
			Width = Number((this.WrapperElement.style.width).substring(0, (this.WrapperElement.style.width).length - 2));
			Height = Number((this.WrapperElement.style.height).substring(0, (this.WrapperElement.style.height).length - 2));
			
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
			
			Width = Number((this.WrapperElement.style.width).substring(0, (this.WrapperElement.style.width).length - 2));
			Height = Number((this.WrapperElement.style.height).substring(0, (this.WrapperElement.style.height).length - 2));
			
			
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
			
			
			
			if(ResizeType === "N"){
				this.WrapperElement.style.height = (parseInt(this.WrapperElement.style.height.split("px")[0]) + OffsetY) + "px";
				this.WrapperElement.style.top = (parseInt(this.WrapperElement.offsetTop) - OffsetY) + "px";
			}else if(ResizeType === "E"){
				this.WrapperElement.style.width = (parseInt(this.WrapperElement.style.width.split("px")[0]) - OffsetX) + "px";
			}else if(ResizeType === "W"){
				this.WrapperElement.style.width = (parseInt(this.WrapperElement.style.width.split("px")[0]) + OffsetX) + "px";
				this.WrapperElement.style.left = (parseInt(this.WrapperElement.offsetLeft) - OffsetX) + "px";
			}else if(ResizeType === "S"){
				this.WrapperElement.style.height = (parseInt(this.WrapperElement.style.height.split("px")[0]) - OffsetY) + "px";
			}else if(ResizeType === "NE"){
				this.WrapperElement.style.height = (parseInt(this.WrapperElement.style.height.split("px")[0]) + OffsetY) + "px";
				this.WrapperElement.style.top = (parseInt(this.WrapperElement.offsetTop) - OffsetY) + "px";
				this.WrapperElement.style.width = (parseInt(this.WrapperElement.style.width.split("px")[0]) - OffsetX) + "px";
			}else if(ResizeType === "SE"){
				this.WrapperElement.style.height = (parseInt(this.WrapperElement.style.height.split("px")[0]) - OffsetY) + "px";
				this.WrapperElement.style.width = (parseInt(this.WrapperElement.style.width.split("px")[0]) - OffsetX) + "px";
			}else if(ResizeType === "SW"){
				this.WrapperElement.style.height = (parseInt(this.WrapperElement.style.height.split("px")[0]) - OffsetY) + "px";
				this.WrapperElement.style.width = (parseInt(this.WrapperElement.style.width.split("px")[0]) + OffsetX) + "px";
				this.WrapperElement.style.left = (parseInt(this.WrapperElement.offsetLeft) - OffsetX) + "px";
			}else if(ResizeType === "NW"){
				this.WrapperElement.style.height = (parseInt(this.WrapperElement.style.height.split("px")[0]) + OffsetY) + "px";
				this.WrapperElement.style.top = (parseInt(this.WrapperElement.offsetTop) - OffsetY) + "px";
				this.WrapperElement.style.width = (parseInt(this.WrapperElement.style.width.split("px")[0]) + OffsetX) + "px";
				this.WrapperElement.style.left = (parseInt(this.WrapperElement.offsetLeft) - OffsetX) + "px";
			}
			
			this.FireEventListeners("Resize", parseInt(this.WrapperElement.style.width.split("px")[0]), parseInt(this.WrapperElement.style.height.split("px")[0]));
		}.bind(this)); 
		
		
		
		
		///This is for moving around the window.
		this.Title.parentElement.addEventListener("mousedown",
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
				this.WrapperElement.style.left = (this.WrapperElement.offsetLeft - OffsetX) + "px";
				this.WrapperElement.style.top = (this.WrapperElement.offsetTop - OffsetY) + "px";
			}.bind(this));
			
		}.bind(this));
		
		
		
		
		
	}
	SetApplicationProperty(){
		console.warn("This feature hasn't been implemented yet.");
	}
	AddApplicationElement(Element){
		this.MainElement.appendChild(Element); ///Is mostly used to layer canvas elements.
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
		return Number((this.WrapperElement.style.left).substring(0, (this.WrapperElement.style.left).length - 2)) + this.GetApplicationProperty("Border", "TransparentBorderWidth");
	}
	GetYPos(){
		return Number((this.WrapperElement.style.top).substring(0, (this.WrapperElement.style.top).length - 2)) + this.GetApplicationProperty("Border", "TransparentBorderWidth");
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