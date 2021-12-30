const __ScriptPath__ = "./";

function IncludeStyleSheet(Source){
	let Element = document.createElement("link");
	Element.setAttribute("rel", "stylesheet");
	Element.type = "text/css";
	Element.href = Source;
	document.getElementsByTagName("head")[0].appendChild(Element);
}
[
	__ScriptPath__ + "/Default.css",
	__ScriptPath__ + "/IncludeEscape.css",
	__ScriptPath__ + "/DebugInfoOverlayWrapper.css"
].forEach(function(Source){IncludeStyleSheet(Source);});

function IncludeModule(Source){
	let Element = document.createElement("script");
	Element.async = false; //Important!
	Element.setAttribute("type","module");
	Element.setAttribute("src", Source);
	document.getElementsByTagName("head")[0].appendChild(Element);
}
[
	__ScriptPath__ + "/Main.mjs" ///This is the main source file. It is loaded last so that all the dependencies before it have already been loaded.
].forEach(function(Source){IncludeModule(Source);});
