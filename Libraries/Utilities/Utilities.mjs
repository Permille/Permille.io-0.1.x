export default class Utilities{
	static Version = "0.7.13.9";
	static Build = 120;
	static DecToHex(Number, Hash) { ///Converts a number from decimal to hexadecimal.
		let Hex = Number.toString(16);
		while (Hex.length < 6) {
			Hex = "0" + Hex;
		}
		if (Hash == true){
			Hex = "#" + Hex;
		}
		return Hex;
	}
	static Mod(Num1, Num2){
		return (Num1 >= 0 || Num1 % Num2 === -0) ? Math.abs(Num1 % Num2) : Num1 % Num2 + Num2;
	}
	static SetProperty(TargetedObject, Path, Value) {
		let CurrentObject = TargetedObject;
		let PathArray = Path.split(".");
		let Length = PathArray.length;
		for(let i = 0; i < Length - 1; i++) {
			let Element = PathArray[i];
			if(Object.prototype.toString.call(CurrentObject[Element]) !== "[object Object]") CurrentObject[Element] = {};
			CurrentObject = CurrentObject[Element];
		}
		CurrentObject[PathArray[Length - 1]] = Value;
		return CurrentObject;
	}
	static MergeObjects(...Objects){
		if(Objects.length === 1) return Objects[0];
		let MergedObject = {};
		for(let i = Objects.length - 1; i >= 0; i--){
			if(Object.prototype.toString.call(Objects[i]) !== "[object Object]"){
				MergedObject = Objects[i];
				continue;
			}
			for(let Property in Objects[i]) {
				if(Object.prototype.toString.call(Objects[i][Property]) === "[object Array]"){
					if(MergedObject[Property] === undefined) MergedObject[Property] = [];
					for(let j = 0; j < Objects[i][Property].length; j++){
						MergedObject[Property][j] = Objects[i][Property][j];
					}
				} else if(Object.prototype.toString.call(Objects[i][Property]) === "[object Object]"){
					MergedObject[Property] = Utilities.MergeObjects(Objects[i][Property], MergedObject[Property]);
				} else{
					if(Object.prototype.toString.call(MergedObject) !== "[object Object]") MergedObject = {};
					MergedObject[Property] = Objects[i][Property];
				}
			}
		}
		return MergedObject;
	}
	static CreateArray(length) {
		let arr = new Array(length || 0),
			i = length;

		if (arguments.length > 1) {
			let args = Array.prototype.slice.call(arguments, 1);
			while (i--) arr[length - 1 - i] = this.CreateArray.apply(this, args);
		}
		return arr;
	}
	static CreateCanvas(Width,Height,ZIndex,Display){ ///Creates a HTMLCanvas.
		let CanvasElement = document.createElement("canvas");
		if(ZIndex !== undefined) CanvasElement.style.zIndex = ZIndex;
		CanvasElement.width = Width || 1280;
		CanvasElement.height = Height || 720;
		CanvasElement.style.display = Display || "block";
		return CanvasElement;
	}
	static CreateWrapperDiv(Width,Height,ZIndex,Display, Overflow){ ///Creates a HTMLCanvas.
		let WrapperElement = document.createElement("div");
		if(ZIndex !== undefined) WrapperElement.style.zIndex = ZIndex;
		WrapperElement.style.width = (Width || 1280) + "px";
		WrapperElement.style.height = (Height || 720) + "px";
		WrapperElement.style.display = Display || "block";
		WrapperElement.style.overflow = Overflow || "hidden";
		return WrapperElement;
	}
	static CreateSVG(Width, Height, ZIndex, Display){
		let SVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		if(ZIndex !== undefined) SVGElement.style.zIndex = ZIndex;
		SVGElement.style.position = "absolute";
		Utilities.SetSVGElementProperty(SVGElement, "width", Width || 1280);
		Utilities.SetSVGElementProperty(SVGElement, "height", Height || 720);
		SVGElement.style.display = Display || "block";
		return SVGElement;

	}
	static CreateSVGElement(Type){
		return document.createElementNS("http://www.w3.org/2000/svg", Type);
	}
	static SetSVGElementProperty(SVGElement, Property, Value){
		SVGElement.setAttributeNS(null, Property, Value);
	}
	static GetSVGElementProperty(SVGElement, Property){
		return SVGElement.getAttributeNS(null, Property);
	}
	static CreateUUID(){ //https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
	}
	static CircleRectCollision(CircleX, CircleY, CircleRad, RectX, RectY, RectWidth, RectHeight){
		if(RectHeight === undefined) RectWidth = RectHeight;

		//https://stackoverflow.com/questions/401847/circle-rectangle-collision-detection-intersection
		//Answer by StackOverflow user Cygon:
		let ClosestX = Math.max(Math.min(CircleX, RectX + RectWidth), RectX);
		let ClosestY = Math.max(Math.min(CircleY, RectY + RectHeight), RectY);

		// Calculate the distance between the circle's center and this closest point
		// Calculate the distance between the circle's center and this closest point
		let DistanceX = CircleX - ClosestX;
		let DistanceY = CircleY - ClosestY;

		// If the distance is less than the circle's radius, an intersection occurs
		let DistanceSquared = Math.pow(DistanceX, 2) + Math.pow(DistanceY, 2);
		return DistanceSquared < Math.pow(CircleRad, 2);
	}
	static WeightedAverage(Numbers, Weight = 1){ ///Calculates the weighted average of an array with a given weight. (unused)
		let Sum = 0;
		for(let i = 0; i < Numbers.length; i++) Sum += Math.pow(Numbers[i], Weight);
		return Math.pow(Sum / Numbers.length, 1 / Weight);
	}
	static GetScientificNotation(GivenNumber, Precision = 1){ ///Returns the scientific notation of a number.
		let Negative = false;
		if(GivenNumber < 0) Negative = true;
		GivenNumber = String(Math.floor(GivenNumber));
		let Exponent;
		if(GivenNumber.match(/e+/)) Exponent = Number(GivenNumber.split("e+")[1]);
		else{
			if(GivenNumber.match(/-/)) Exponent = GivenNumber.length - 1;
			else Exponent = GivenNumber.length;
		}
		let Decimals;
		if(!Negative) Decimals = (GivenNumber.substring(1, 1 + Precision)).split("e")[0];
		else Decimals = (GivenNumber.substring(2, 2 + Precision)).split("e")[0];
		let Result;
		if(!Negative) Result = GivenNumber[0] + "." + Decimals + "x10^" + Exponent;
		else Result = GivenNumber.substring(0, 2) + "." + Decimals + "x10^" + Exponent;
		return Result;
	}
	static HTTPPost(URL, Data, Callback){ ///HTTPPost request with specific data, with a callback. (async)
		///https://stackoverflow.com/questions/24468459/sending-a-json-to-server-and-retrieving-a-json-in-return-without-jquery hex494D49
		let XHR = new XMLHttpRequest();
		XHR.open("POST", URL, true);

		//Send the proper header information along with the request
		XHR.setRequestHeader("Content-type", "application/json");

		XHR.send(Data);


		XHR.onreadystatechange = function() {//Call a function when the state changes.
			if(XHR.readyState === 4) {
				let Response = XHR.responseText;
				if(Callback !== undefined) Callback(Response, XHR);
			}
		}.bind(this);
	}
	static HTTPGet(URL, Callback){ ///HTTPGet request, with a callback. (async)
		let XHR = new XMLHttpRequest();
		XHR.open("GET", URL, true);

		XHR.send();

		XHR.onreadystatechange = function(){
			if(XHR.readyState === 4) {
				let Response = XHR.responseText;
				if(Callback !== undefined) Callback(Response, XHR);
			}
		}.bind(this);
	}
	static GetOrdinalIndicator(_Num){ ///For example, if _Num = 1, then "st" is returned, if _Num = 3 then "rd" is returned, and if _Num = 11 then "th" is returned.
		let Num = String(_Num);
		if(Number(Num[Num.length - 1]) >= 4 || Number(Num[Num.length - 1]) === 0) return "th";
		else{
			if(Number(Num[Num.length - 2]) === 1) return "th";
			else{
				if(Number(Num[Num.length - 1]) === 1) return "st";
				if(Number(Num[Num.length - 1]) === 2) return "nd";
				if(Number(Num[Num.length - 1]) === 3) return "rd";
			}
		}
	}
	static RedirectTo(Link){
		//window.location.href = Link;
		//setTimeout(function(){document.location.href = Link;}, 100);
		let Element = document.createElement("a");
	    Element.setAttribute("href", Link);
	    document.body.appendChild(Element);
	    Element.click();
	    document.body.removeChild(Element);
	}
	static RequestUserFile(Callback){
		let Element = document.createElement("input");
		Element.type = "file";
		Element.click();
		Element.addEventListener("change", function(e){
			console.log(Element.files);

			let Reader = new FileReader();
			Reader.readAsText(Element.files[0]);
			Reader.addEventListener("load", function(e){
				Callback(e.target.result);
			}.bind(this));
		}.bind(this));
	}
	static Download(FilePath, FileName){
		let Element = document.createElement("a");
		Element.download = FileName ?? "";
		Element.href = FilePath;
		Element.click();
	}
	static CopyToClipboard(Text){
		let OnError = function(Error){
			alert("Copying failed: " + Error + "\nAttempted copy:\n" + Text);
		}.bind(this);
		if(navigator.clipboard === undefined){
			OnError("You have loaded the HTTP version of this site. To use the clipboard API, you need to switch to the HTTPS version. If it's available, simply change the protocol in the address bar. If not, the attempted copy can be seen below.");
			return;
		}
		navigator.clipboard.writeText(Text).catch(OnError);
	}
	static RequestPrinting(){
		window.print();
	}
	static RequestIFramePrint(IFrame){
		//IFrame.focus();
		IFrame.contentWindow.print();
	}
	static RequestCrossOriginIFramePrint(url) { //http://blog.davidjs.com/2018/03/print-document-from-cross-origin-iframe/
	  var proxyIframe = document.createElement('iframe');
	  var body = document.getElementsByTagName('body')[0];
	  body.appendChild(proxyIframe);
	  proxyIframe.style.width = '100%';
	  proxyIframe.style.height = '100%';
	  proxyIframe.style.display = 'none';

	  var contentWindow = proxyIframe.contentWindow;
	  contentWindow.document.open();
	  // Set dimensions according to your needs.
	  // You may need to calculate the dynamically after the content has loaded
	  contentWindow.document.write('<iframe src="' + url + '" onload="print();" width="1000" height="1800" frameborder="0" marginheight="0" marginwidth="0">');
	  contentWindow.document.close();
	}
	static DownloadTextFile(Name, Content){ //https://stackoverflow.com/a/18197341
		let Element = document.createElement("a");
	  Element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(Content));
	  Element.setAttribute("download", Name);

	  Element.style.display = "none";
	  document.body.appendChild(Element);

	  Element.click();

	  document.body.removeChild(Element);
	}
	static DownloadIFrame(FileName, Element){
		let Content = "<!DOCTYPE html>\r\n<html xmlns=\"http://www.w3.org/1999/xhtml\" lang=\"en\">" + Element.contentDocument.getElementsByTagName("html")[0].innerHTML + "</html>";
		Utilities.DownloadTextFile(FileName, Content);
	}
  static GetQueryStringValues(QueryString = location.search){ //https://stackoverflow.com/a/21152762
    var qd = {};
    if (location.search) location.search.substr(1).split("&").forEach(function(item) {
        var s = item.split("="),
            k = s[0],
            v = s[1] && decodeURIComponent(s[1]); //  null-coalescing / short-circuit
        //(k in qd) ? qd[k].push(v) : qd[k] = [v]
        (qd[k] = qd[k] || []).push(v) // null-coalescing / short-circuit
    });
    return qd;
  }
  static FormatDate(GivenDate){
    return (GivenDate.getFullYear() + "").padStart(4, "0") + "-" + (1 + GivenDate.getMonth() + "").padStart(2, "0") + "-" + (GivenDate.getDate() + "").padStart(2, "0") + " " + (GivenDate.getHours() + "").padStart(2, "0") + ":" + (GivenDate.getMinutes() + "").padStart(2, "0") + ":" + (GivenDate.getSeconds() + "").padStart(2, "0");
  }
  static ObjectifyModule(Module){
    const ModuleObject = {};
    for(const Identifier in Module) ModuleObject[Identifier] = Module[Identifier];
    return ModuleObject;
  }
};
