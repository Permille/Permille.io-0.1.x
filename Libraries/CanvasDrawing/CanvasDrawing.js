class CanvasDrawing{
  static Version = "0.7.13.1";
  static Build = 113;
	static DrawRectangle(X,Y,W,H,Co,Ca,CheckRainbow = true) {
		/*
		Summary: Draws a rectangle at a specific point with a certain width and height.
		Parameters:
		X: X xoord
		Y: Y coord
		W: Width
		H: Height
		Co: Colour
		Ca: Canvas Context
		A: (Optional) Alpha
		*/
		if(CheckRainbow && Co.split(" ")[0] === "Rainbow") {
			this.GetRainbow(Co,Ca);
		} else {
			Ca.fillStyle = Co;
		}
		Ca.fillRect(X,Y,W,H);
	}
	static DrawTransparentRectangle(X,Y,W,H,Ca) {
		/*
		Summary: Clears the canvas in a rectangular shape between two points.
		Parameters:
		X: X xoord
		Y: Y coord
		W: Width
		H: Height
		Ca: Canvas Context
		*/
		Ca.clearRect(X,Y,W,H);
	}
	static DrawRect(X1,Y1,X2,Y2,Co,Ca,CheckRainbow = true) {
		/*
		Summary: Draws a rectangle between two points.
		Parameters:
		X1: X xoord for first point
		Y1: Y coord for first point
		X2: X xoord for second point
		Y2: Y coord for second point
		Co: Colour
		Ca: Canvas Context
		A: (Optional) Alpha
		*/
		if(CheckRainbow && Co.split(" ")[0] === "Rainbow") {
			this.GetRainbow(Co,Ca);
		} else {
			Ca.fillStyle = Co;
		}
		Ca.fillRect(X1,Y1,X2-X1,Y2-Y1);
	}

	static DrawCircle(X, Y, R, Co, Ca) {
		/*
		Summary: Draws a circle at a specific point.
		Parameters:
		X: X Coordinate
		Y: Y Coordinate
		R: Radius
		Co: Colour
		Ca: Canvas Context
		A: (Optional) Alpha
		*/

		/*
		if(A !== undefined) {
			Ca.globalAlpha = A;
		}
		// This was removed because Javascript supports default parameters.
		*/

		if(Co.split(" ")[0] === "Rainbow") {
			this.GetRainbow(Co,Ca);
		} else {
			Ca.fillStyle = Co;
		}
		Ca.beginPath();
		Ca.arc(X, Y, R, 0, Math.PI * 2, true);
		Ca.fill();
	}
	static DrawCircleA(X, Y, R, Co, Ca, A = 1.0) {
		/*
		Summary: Draws a circle at a specific point.
		Parameters:
		X: X Coordinate
		Y: Y Coordinate
		R: Radius
		Co: Colour
		Ca: Canvas Context
		A: (Optional) Alpha
		*/

		/*
		if(A !== undefined) {
			Ca.globalAlpha = A;
		}
		// This was removed because Javascript supports default parameters.
		*/
		Ca.globalAlpha = A;
		if(Co.split(" ")[0] === "Rainbow") {
			this.GetRainbow(Co,Ca);
		} else {
			Ca.fillStyle = Co;
		}
		Ca.beginPath();
		Ca.arc(X, Y, R, 0, Math.PI * 2, true);
		Ca.fill();
		Ca.globalAlpha = 1.0;
	}
	static DrawText(X,Y,Message,Size,Co,Ca, Align = "start",Font = "ESCAPE") {
		/*
		Summary: Draws text at a specific point.
		Parameters:
		X: X Coordinate
		Y: Y Coordinate
		Message: Text to be written
		Size: Site of text
		Co: Colour of text
		Ca: Canvas
		A: (Optional) Alpha
		Align: (Optional) Utilizes [textAlign]; default is "start"
		Font: (Optional) Changes the font; default is [ESCAPE]
		Explanatory:

		[textAlign]
		textAlign determines how the text is aligned;
		A value of "start" means that the text flow will start from the coordinate supplied.
		A value of "end" means that the text flow will end at the coordinate supplied.
		A value of "center" means that the text flow will be centred at the coordiate supplied.
		A value of "left" will align the text left of the coordinates supplied.
		A value of "right" will align the text right of the coordinates supplied.

		[ESCAPE]
		The font named "ESCAPE.ttf" which is supplied with the release.

		*/



		Ca.textBaseline = "middle"; //So that it is easier to draw borders around them...
		if(Font === "ESCAPE"){
			if(Size === 8 || Size === 9) Ca.font = "9px Escape0805";
			else{
				if(Size % 13 === 0) Ca.font = Size + "px ESCAPE";
				else if(Size % 20 === 0) Ca.font = Size + "px Escape1509";
				else Ca.font = 16 * (Size / 20) + "px ESCAPE";
			}
		} else{
			Ca.font = Size + "px " + Font; ///Note TextFormatting.GetTextWidth!!!!!!!!!!!!
		}
		if(Co !== undefined){
			if(Co.split(" ")[0] === "Rainbow") {
				this.GetRainbow(Co,Ca);
			} else {
				Ca.fillStyle = Co;
			}
		}
		Ca.textAlign = Align;
		Ca.fillText(Message, X, Y);



		/*
		Ca.textBaseline = "middle"; //So that it is easier to draw borders around them...
		Ca.globalAlpha = A;
		Ca.font = " " + (13.04) + "px " + Font;

		///[13]: 13.04, 13.5
		///
		///
		///
		///
		///
		///




		if(Co !== undefined){
			if(Co.split(" ")[0] === "Rainbow") {
				this.GetRainbow(Co,Ca);
			} else {
				Ca.fillStyle = Co;
				Ca.strokeStyle = Co;
			}
		}
		Ca.textAlign = Align;

		Ca.strokeText(Message, X, Y);

		Ca.globalAlpha = 1.0;
		*/

	}
	static DrawTextWithBackground(X,Y,Message,Size,Co,Ca, BWidth, BHeight, BColour, Align = "start", Font = "ESCAPE"){
		Ca.textBaseline = "middle"; //So that it is easier to draw borders around them...
		Ca.font = Size + "px " + Font;
		let TextWidth = Ca.measureText(Message).width;

		if(Align === "start") this.DrawRectangle(X - BWidth, Y - BHeight - Size / 2, TextWidth + BWidth * 2, BHeight * 2 + Size, BColour, Ca);
		else if(Align === "center") this.DrawRectangle(X - BWidth - TextWidth / 2, Y - BHeight - Size / 2, TextWidth + BWidth * 2, BHeight * 2 + Size, BColour, Ca);
		//this.DrawRectangle(X, Y - Size / 2, TextWidth, Size, BColour, Ca, BAlpha); // will only work for Align: "start"...
		this.DrawText(X, Y, Message, Size, Co, Ca, Align, Font);
	}
	static DrawRotatedText(X,Y,Rot,Message,Size,Co,Ca,A = 1.0, Align = "center",Font = "ESCAPE") {
		/*
		Summary: Draws text at a specific point.
		Parameters:
		X: X Coordinate
		Y: Y Coordinate
		Rot: Rotation in degrees, see [Rot]
		Message: Text to be written
		Size: Size of text
		Co: Colour of text
		Ca: Canvas
		A: (Optional) Alpha
		Align: (Optional) Utilizes [textAlign]; default is "center"
		Font: (Optional) Changes the font; default is [ESCAPE]
		Explanatory:

		[textAlign]
		textAlign determines how the text is aligned;
		A value of "start" means that the text flow will start from the coordinate supplied.
		A value of "end" means that the text flow will end at the coordinate supplied.
		A value of "center" means that the text flow will be centred at the coordiate supplied.
		A value of "left" will align the text left of the coordinates supplied.
		A value of "right" will align the text right of the coordinates supplied.

		[ESCAPE]
		The font named "ESCAPE.ttf" which is supplied with the release.

		[Rot]
		Rotates the text.
		The rotation can be made dynamic, though:
		Requirements: A loop rendering the text multiple times per second so that the
		dynamic rotation is enabled. Alternatively, this can be used to get a semi-random
		rotation of text (semi-random because window.performance.now() will be used).
		Format: "[Degrees]:[Full cycle length];[Wave height]".
		[Degrees]: The initial rotation of the text, e.g. 15.
		[Full cycle length]: The rotation cycle length, in seconds, e.g. 0.7.
		[Wave height]: Deviation from the original rotation, e.g. 5.
		Example: "15:0.25;5".
		Note that only the degrees are needed for this to work, the rest are optional arguments.

		Application:
		The title screen applies this function to display a random message.
		*/


		Ca.textBaseline = "middle"; //So that it is easier to draw borders around them...
		Ca.font = Size + "px " + Font;
		if(Co.split(" ")[0] === "Rainbow") {
			this.GetRainbow(Co,Ca);
		} else {
			Ca.fillStyle = Co;
		}
		Ca.textAlign = Align;
		Ca.translate(X, Y);
		this.GetRotation(Rot,Ca);
		Ca.fillText(Message, 0, 0); //The canvas has already been aligned to the given position
		Ca.setTransform(1, 0, 0, 1, 0, 0); //Resets the rotation and alignment of the canvas

	}

	static GetRotation(Parameter,Ca) {
		if(typeof Parameter === "number"){
			Ca.rotate(-Parameter / 57.3);
			return;
		}
		let Degrees = 0;
		let FullCycleLength = 1;
		let WaveHeight = 1;
		let Enabled = 0;
		if(Parameter.includes(":")) {
			Enabled = 1;
			Degrees = Parameter.split(":")[0];
			FullCycleLength = Parameter.split(":")[1].split(";")[0];
			WaveHeight = Parameter.split(":")[1].split(";")[1];
		}
		else {
			Degrees = Parameter; //It is assumed that there is no other format and that [Degrees] is a number.
		}
		Ca.rotate(Math.sin((Enabled * window.performance.now() / 1000) / FullCycleLength) / WaveHeight - Degrees / 57.3);
	}

	static GetRainbow(Parameter, Ca) {
		/*
		Summary:
		This method will convert the Rainbow parameter and set it to the colour of the current canvas.

		Remarks:
		This is intended to be a private class; sadly, it's impossible to declare one as such in ES6.

		Explanatory:
		This makes the colour of the text change each time it is drawn.
		To achieve the rainbow effect, the method call should be placed inside of a setInterval.
		Properties:
		Explanation: Rainbow [Offset,Rate of change,Saturation,Vibrance[,Alpha]]
		For example: "Rainbow -45,0.3,70,50,0.3"
		*/

		if(Configuration.Graphics.EnableRainbows){
			if(Parameter.split(" ")[1].split(",")[4] === undefined){
				Ca.fillStyle = "hsl(" + ((window.performance.now() * Parameter.split(" ")[1].split(",")[1]) - Parameter.split(" ")[1].split(",")[0]) + ", " + Parameter.split(" ")[1].split(",")[2] + "%, " + Parameter.split(" ")[1].split(",")[3] + "%)";
				Ca.strokeStyle = "hsl(" + ((window.performance.now() * Parameter.split(" ")[1].split(",")[1]) - Parameter.split(" ")[1].split(",")[0]) + ", " + Parameter.split(" ")[1].split(",")[2] + "%, " + Parameter.split(" ")[1].split(",")[3] + "%)";
			}else{
				Ca.fillStyle = "hsla(" + ((window.performance.now() * Parameter.split(" ")[1].split(",")[1]) - Parameter.split(" ")[1].split(",")[0]) + ", " + Parameter.split(" ")[1].split(",")[2] + "%, " + Parameter.split(" ")[1].split(",")[3] + "%, " + Parameter.split(" ")[1].split(",")[4] + ")";
				Ca.strokeStyle = "hsla(" + ((window.performance.now() * Parameter.split(" ")[1].split(",")[1]) - Parameter.split(" ")[1].split(",")[0]) + ", " + Parameter.split(" ")[1].split(",")[2] + "%, " + Parameter.split(" ")[1].split(",")[3] + "%, " + Parameter.split(" ")[1].split(",")[4] + ")";
			}
		} else{
			if(Parameter.split(" ")[1].split(",")[4] === undefined){
				Ca.fillStyle = "hsl(" + ((Parameter.split(" ")[1].split(",")[1]) - Parameter.split(" ")[1].split(",")[0]) + ", " + Parameter.split(" ")[1].split(",")[2] + "%, " + Parameter.split(" ")[1].split(",")[3] + "%)";
				Ca.strokeStyle = "hsl(" + ((Parameter.split(" ")[1].split(",")[1]) - Parameter.split(" ")[1].split(",")[0]) + ", " + Parameter.split(" ")[1].split(",")[2] + "%, " + Parameter.split(" ")[1].split(",")[3] + "%)";
			}else{
				Ca.fillStyle = "hsla(" + ((Parameter.split(" ")[1].split(",")[1]) - Parameter.split(" ")[1].split(",")[0]) + ", " + Parameter.split(" ")[1].split(",")[2] + "%, " + Parameter.split(" ")[1].split(",")[3] + "%, " + Parameter.split(" ")[1].split(",")[4] + ")";
				Ca.strokeStyle = "hsla(" + ((Parameter.split(" ")[1].split(",")[1]) - Parameter.split(" ")[1].split(",")[0]) + ", " + Parameter.split(" ")[1].split(",")[2] + "%, " + Parameter.split(" ")[1].split(",")[3] + "%, " + Parameter.split(" ")[1].split(",")[4] + ")";
			}
		}
	}
	static _ReduceOpacity(X, Y, W, H, A, Ca) {
		console.warn("Deprecated");
		/*
			Summary:
			Decreases the opacity of specific pixels.
			Has very bad performance effects.
		*/
		let CanvasData = Ca.getImageData(X, Y, W, H);
		for(let i = 3; i < CanvasData.data.length; i+=4){
			CanvasData.data[i] *= A;
		}
		Ca.putImageData(CanvasData, X, Y);
	}

	static ReduceOpacity(A, Ctx) {

		/*if(!Settings.Graphics.EnableOpacityReduction){
			this.DrawTransparentRectangle(0, 0, 1280, 720, Ca);
			return;
		}*/


		let TempContext = Application.ExperimentalCanvas.getContext("2d");
		TempContext.clearRect(0,0,1280,720);
		TempContext.globalAlpha = A;
		TempContext.drawImage(Ctx.canvas,0,0);
		Ctx.clearRect(0,0,1280,720);
		Ctx.drawImage(Application.ExperimentalCanvas,0,0);
	}
	static DrawLine(X1, Y1, X2, Y2, Co, Ctx, W = 1){
		X1 += 0.5;
		Y1 += 0.5;
		X2 += 0.5;
		Y2 += 0.5;
		//^So that the line isn't antialiased over two pixels when the width is 1...
		if(Co.split(" ")[0] === "Rainbow") {
			this.GetRainbow(Co,Ctx);
		} else {
			Ctx.strokeStyle = Co;
		}
		Ctx.lineWidth = W;
		Ctx.beginPath();
		Ctx.moveTo(X1, Y1);
		Ctx.lineTo(X2, Y2);
		Ctx.stroke();
	}
	static DrawBorder(X1, Y1, X2, Y2, Co, Ctx, W = 1){
		/*Left*/  this.DrawLine(X1, Y1, X1, Y2, Co, Ctx, W);
		/*Right*/ this.DrawLine(X2, Y1, X2, Y2, Co, Ctx, W);
		/*Top*/   this.DrawLine(X1, Y1, X2, Y1, Co, Ctx, W);
		/*Bottom*/this.DrawLine(X1, Y2, X2, Y2, Co, Ctx, W);
	}
	static DrawImage(X,Y,Image,CanvasCtx,Wait = true){
		if(!Image.complete && Wait) {
			Image.addEventListener("load", function(){Drawing.DrawImage(X, Y, Image,CanvasCtx,Wait);}.bind(this));
			return;
		}
		CanvasCtx.drawImage(Image,X,Y);
	}

}
