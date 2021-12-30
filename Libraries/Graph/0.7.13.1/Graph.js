class Graph{
  static Version = "0.7.13.1";
  static Build = 112;
	///Transferred from Prototype Alpha 0.6.-25
	constructor(Parameter){
		///Parameters:
		/*
			"ID": <[String]>,
			"Data": <[Array of any number]>,
			"ApplicationFrame": <[ApplicationFrame Instance]> [Default: Application.Frame],
			"HistoryLength": <[Integer]> [Default: 120],
			"Type": <"Bar" | "Connect"> [Default: "Bar"],
			"Colour": <[String of valid CSS colour or a custom colour pattern]> [Default: "#007fff7f"],
			"XPos": <[Number]>,
			"YPos": <[Number]>,
			"Height": <[Number]>,
			"EnableMovingAverage": <[Boolean]> [Default: false],
			"MovingAverageLength": <[Integer]> [Default: 10],
			"MovingAverageColour": <[String of valid CSS colour or a custom colour pattern]> [Default: "#00ff007f",
			"ColumnWidth": <[Number]> [Default: 1],
			"ClearingTransparency": <[Number below 1]> [Default: 0.8],
			"ZIndex": <[Integer]> [Default: 51100],
			"FitToNewMax": <[Number below 1]> [Default: 0.99], //The factor by which the maximum is being decreased if the maximum has changed.
			"VariableMax": <[Boolean]> [Default: true],
			"VariableMin": <[Boolean]> [Default = false],
			"Max": <[Number]> [Default: 0],
			"Min": <[Number]> [Default: 0],
			"KeepMax": <[Boolean]>, [Default: false]
			"ShowMeter": <[Boolean]>, [Default: false]
			"MeterDensity": <[Integer]>, [Default: 30] //1 meter entry per 30 pixels, or less.
			"MeterPosition": <["Left" | "Right"]> [Default: "Left"]
			"MaxMin": <[Number]> //The maximum minimum value for the graph [Default: 0]
			"Width": <[Integer]> //The width of the graph.
		*/
		this.ID = Parameter.ID;
		this.Min = Parameter.Min || 0;
		this.Max = Parameter.Max || 0;
		this.XPos = Parameter.XPos;
		this.YPos = Parameter.YPos;
		this.Data = Parameter.Data || [];
		this.Type = Parameter.Type || "Bar"; //Valid Types: "Connect", "Bar"
		this.Width = Parameter.Width || 1280;
		this.Colour = Parameter.Colour || "#007fff7f";
		this.Height = Parameter.Height || 720;
		this.MaxMin = Parameter.MaxMin || 0;
		this.ZIndex = Parameter.ZIndex || 51100;
		this.KeepMax = Parameter.KeepMax || false;
		this.Enabled = false;
		this.ShowMeter = Parameter.ShowMeter || false;
		this.VariableMin = Parameter.VariableMin || false;
		this.VariableMax = (Parameter.VariableMax === undefined) ? true : Parameter.VariableMax; // "a || b" wouldn't work here because if a === false and b === true, a would be considered a falsy value and only b would be used, thus making it impossible to set this property to false.
		this.FitToNewMax = Parameter.FitToNewMax || 0.99;
		this.ColumnWidth = Parameter.ColumnWidth || 1;
		this.MeterDensity = Parameter.MeterDensity || 30;
		this.MeterPosition = Parameter.MeterPosition || "Left";
		this.HistoryLength = Parameter.HistoryLength || 120;
		this.ApplicationFrame = Parameter.ApplicationFrame || Application.Frame;
		this.MovingAverageData = [0];
		this.EnableMovingAverage = Parameter.EnableMovingAverage || false;
		this.MovingAverageLength = Parameter.MovingAverageLength || 10;
		this.MovingAverageColour = Parameter.MovingAverageColour || "#00ff007f";
		this.ClearingTransparency = (Parameter.ClearingTransparency === undefined) ? 0.8 : Parameter.ClearingTransparency;

		this.Canvas = Utilities.CreateCanvas(this.Width + this.XPos + 5, this.Height + this.YPos + 5, this.ZIndex);
		this.Canvas.style.display = "none";
		this.Ctx = this.Canvas.getContext("2d");
		this.ApplicationFrame.AddApplicationElement(this.Canvas);
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
		if(this.Type === "Connect"){
			this.DrawConnect(); //I might implement this in the future.
		} else if(this.Type === "Bar"){
			this.DrawBar();
		}
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
