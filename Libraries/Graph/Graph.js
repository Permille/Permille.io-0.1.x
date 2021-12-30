class Graph{
  static Version = "Alpha 1.0";
  static Build = 113;

  static DefaultProperties = {
    "ID": undefined,
    "Bounds":{
      "Min": 0,
      "Max": 100,
      "MaxMin": 0,
      "MinMin": -Infinity,
      "MaxMax": Infinity,
      "MinMax": 0,
      "FitToNewMax": 0.99,
      "FitToNewMin": 0.99
    },
    "Meter":{
      "X":{
        "Density": 0,
        "Position": "Left"
      },
      "Y":{
        "Density": 0,
        "Position": "Bottom"
      }
    },
    "Enabled": true,
    "Data": [],
    "DataLength": "Auto", //Is based on the width of the parent element
    "Position":{
      "X": 0,
      "Y": 0
    },
    "Dimensions":{
      "Width": "Auto", //Fits it to the clientWidth of the parent element
      "Height": "Auto"//Fits it to the clientHeight of the parent element
    },
    "Colour": 0x007fff7f,
    "ZIndex": 51100,
    "ColumnWidth": 1,
    "ParentElement": document.getElementsByTagName("body")[0],
    "MovingAverage":{
      "Data": [0],
      "Enabled": true,
      "History": 10, //The amount of data that is averaged
      "Colour": 0x00ff7f7f
    }
  };

	///Transferred from Prototype Alpha 0.6.-25
	constructor(GivenProperties){
    let PropertiesTemplate = {
      "Bounds":{

      },
      "Meter":{
        "X":{

        },
        "Y":{

        }
      },
      "Position":{

      },
      "Dimensions":{

      },
      "MovingAverage":{

      }
    }
    Object.defineProperty(PropertiesTemplate, "ID", {
			"get": function(){
				return this.__ID__;
			},
			"set": function(Scope, Val){
				this.__ID__ = Val;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Bounds, "Min", {
			"get": function(){
				return this.__Min__;
			},
			"set": function(Scope, Val){
				this.__Min__ = Val;
				Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Bounds, "Max", {
			"get": function(){
				return this.__Max__;
			},
			"set": function(Scope, Val){
				this.__Max__ = Val;
				Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Bounds, "MaxMin", {
			"get": function(){
				return this.__MaxMin__;
			},
			"set": function(Scope, Val){
				this.__MaxMin__ = Val;
				Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Bounds, "MaxMax", {
			"get": function(){
				return this.__MaxMax__;
			},
			"set": function(Scope, Val){
				this.__MaxMax__ = Val;
				Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Bounds, "MinMin", {
			"get": function(){
				return this.__MinMin__;
			},
			"set": function(Scope, Val){
				this.__MinMin__ = Val;
				Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Bounds, "MinMax", {
			"get": function(){
				return this.__MinMax__;
			},
			"set": function(Scope, Val){
				this.__MinMax__ = Val;
				Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Bounds, "FitToNewMax", {
			"get": function(){
				return this.__FitToNewMax__;
			},
			"set": function(Scope, Val){
				this.__FitToNewMax__ = Val;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Bounds, "FitToNewMin", {
			"get": function(){
				return this.__FitToNewMin__;
			},
			"set": function(Scope, Val){
				this.__FitToNewMin__ = Val;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Meter.X, "Density", {
			"get": function(){
				return this.__Density__;
			},
			"set": function(Scope, Val){
				this.__Density__ = Val;
        Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Meter.Y, "Density", {
			"get": function(){
				return this.__Density__;
			},
			"set": function(Scope, Val){
				this.__Density__ = Val;
        Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Meter.X, "Position", {
			"get": function(){
				return this.__Position__;
			},
			"set": function(Scope, Val){
				this.__Position__ = Val;
        Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate, "Enabled", {
			"get": function(){
				return this.__Enabled__;
			},
			"set": function(Scope, Val){
				this.__Enabled__ = Val;
        Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate, "Data", {
			"get": function(){
				return this.__Data__;
			},
			"set": function(Scope, Val){
				this.__Data__ = Val;
        Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate, "DataLength", {
			"get": function(){
				return this.__DataLength__;
			},
			"set": function(Scope, Val){
				this.__DataLength__ = Val;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Position, "X", {
			"get": function(){
				return this.__X__;
			},
			"set": function(Scope, Val){
				this.__X__ = Val;
        Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Position, "Y", {
			"get": function(){
				return this.__Y__;
			},
			"set": function(Scope, Val){
				this.__Y__ = Val;
        Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Dimensions, "Width", {
			"get": function(){
				return this.__Width__;
			},
			"set": function(Scope, Val){
				this.__Width__ = Val;
        Scope.Changed = true;
			}.BindArgs(this)
		});
    Object.defineProperty(PropertiesTemplate.Dimensions, "Height", {
			"get": function(){
				return this.__Height__;
			},
			"set": function(Scope, Val){
				this.__Height__ = Val;
        Scope.Changed = true;
			}.BindArgs(this)
		});

    this.Changed = true;
	}
	ToggleVisibility(NewState){
		if(NewState === undefined) this.Enabled = !this.Enabled;
		else this.Enabled = NewState;
		if(this.Enabled){
			this.Canvas.style.display = "block";
		} else if(!this.Enabled){
			this.Canvas.style.display = "none";
		}
	}
	///Update graph properties
	SetDimensions(XPos, YPos, Width, Height, ChangeColumns = false){
		this.XPos = XPos;
		this.YPos = YPos;
		this.Width = Width;
		this.Height = Height;
		this.Canvas.width = this.Width + this.XPos + 5;
		this.Canvas.height = this.Height + this.YPos + 5;
		if(ChangeColumns) this.HistoryLength = Math.floor((this.Width - this.XPos) / this.ColumnWidth);
	}

	Draw(){
    this.DrawBar();
	}

	DrawBar(){
		this.GetMovingAverage();
		let ApplicableTimeResults = 0; //Used to find defined results to correctly calculate average
		let AverageTemporary = 0;
		if(this.VariableMax) this.Max *= this.FitToNewMax;
		if(this.VariableMin){
			if(this.Min * this.FitToNewMax < this.MaxMin){
				this.Min *= this.FitToNewMax;
			}
		}
		for (let i = this.Data.length; i > 0; i--) {
			if (this.VariableMin && this.Min > this.Data[i]) this.Min = this.Data[i];
			if (this.VariableMax && this.Max < this.Data[i]) this.Max = this.Data[i];
			if (this.Data[i] !== undefined) {
				ApplicableTimeResults++;
				AverageTemporary += this.Data[i];
			}
		}
		let AverageResults = Math.floor(AverageTemporary / ApplicableTimeResults * 1000) / 1000;
		if(this.Data[this.Data.length - 2] === undefined) {
			this.Min = 0;
			this.Max = 0;
		}
		Drawing.ReduceOpacity(this.ClearingTransparency, this.Ctx);
		if(this.Enabled){
			if(this.EnableMovingAverage) for(let i = 0; i < this.HistoryLength; i++) Drawing.DrawRectangle(this.XPos + i * this.ColumnWidth, this.YPos + this.Height - ((this.Data[i + this.MovingAverageLength] - this.Min) / (this.Max - this.Min)) * this.Height, this.ColumnWidth, ((this.Data[i + this.MovingAverageLength] - this.Min) / (this.Max - this.Min)) * this.Height, this.Colour, this.Ctx);
			else for(let i = 0; i < this.HistoryLength; i++) Drawing.DrawRectangle(this.XPos + i * this.ColumnWidth, this.YPos + this.Height - ((this.Data[i] - this.Min) / (this.Max - this.Min)) * this.Height, this.ColumnWidth, ((this.Data[i] - this.Min) / (this.Max - this.Min)) * this.Height, this.Colour, this.Ctx);
			if(this.EnableMovingAverage) for(let i = 0; i < this.HistoryLength; i++) Drawing.DrawRectangle(this.XPos + i * this.ColumnWidth, this.YPos + this.Height - ((this.MovingAverageData[i] - this.Min) / (this.Max - this.Min)) * this.Height, this.ColumnWidth, ((this.MovingAverageData[i] - this.Min) / (this.Max - this.Min)) * this.Height, this.MovingAverageColour, this.Ctx);

			if(this.ShowMeter === true){

				let AmountOfMeters = Math.floor(this.Height / this.MeterDensity);

				for(let i = 0; i <= AmountOfMeters; i++){
					let Y = Math.floor(this.YPos + i * this.Height / (AmountOfMeters));
					let CurrentValue = Math.floor(this.Max - (this.Max - this.Min) * (i / (AmountOfMeters)));
					if(Math.abs(CurrentValue) > 1000000) CurrentValue = Utilities.GetScientificNotation(CurrentValue, 2);

					Drawing.DrawRect(this.XPos - 6, Y - 1, this.XPos + 1, Y + 1, this.Colour, this.Ctx);
					Drawing.DrawText(this.XPos - 8, Y, CurrentValue, 13, this.Colour, this.Ctx, "end");
				}
			}

		}

	}
	GetMovingAverage(){
		this.MovingAverageData[0] = 0;
		for(let i = 0; i < this.MovingAverageLength; i++){
			this.MovingAverageData[0] += this.Data[this.MovingAverageLength - i] / this.MovingAverageLength;
		}

		for(let i = 1; i < this.HistoryLength; i++){
			this.MovingAverageData[i] = this.MovingAverageData[i - 1] + this.Data[i + this.MovingAverageLength] / this.MovingAverageLength - this.Data[i] / this.MovingAverageLength;
		}
	}
	DrawConnect(){
		console.warn("Not implemented. Please use type \"Bar\".");
	}
	///Sets the graph data to a specific array of numbers.
	SetData(NewData){
		this.Data = NewData;
	}
	///Adds entry to the graph and removes the oldest one if the history becomes too long.
	AddEntry(NewEntry){
		this.Data.push(NewEntry);
		while(this.Data.length > this.HistoryLength && this.HistoryLength > 1) this.Data.shift(); //It's a loop in case the history length was decreased and this has to be performed multiple times
	}
}
