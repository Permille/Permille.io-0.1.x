import DeferredPromise from "../../Libraries/DeferredPromise.mjs";
const Parser = new DOMParser;
export default class SVGGraph{
  static GraphTemplate = document.importNode(Parser.parseFromString(`
    <div style="--opaque: #663399; --transparent: #6633997f; --less-transparent: #663399bf;">
      <h1>FPS</h1>
      <div class="SettingsImage"></div>
      <div class="SettingsAndGraphWrapper">
        <p><ins data-unit=" fps">60</ins></p>
        <div class="SettingsMenu">
          <form>
            <p>Update frequency</p>
            <input class="Slider" type="range" name="Range" min="0" max="8" value="0" oninput="this.form.Input.value = this.value || 0;" step="1" />
            <input class="TextInput" type="number" name="Input" value="0" oninput="this.form.Range.value = this.value || 0;" step="any" />
          </form>
          <form>
            <p>History length</p>
            <input class="Slider" type="range" name="Range" min="0" max="8" value="0" oninput="this.form.Input.value = this.value || 0;" step="1" />
            <input class="TextInput" type="number" name="Input" value="0" oninput="this.form.Range.value = this.value || 0;" step="any" />
          </form>
          <form>
            <p>Max value</p>
            <input class="Slider" type="range" name="Range" min="0" max="8" value="0" oninput="this.form.Input.value = this.value || 0;" step="1" />
            <input class="TextInput" type="number" name="Input" value="0" oninput="this.form.Range.value = this.value || 0;" step="any" />
          </form>
          <form>
            <p>Min value</p>
            <input class="Slider" type="range" name="Range" min="0" max="8" value="0" oninput="this.form.Input.value = this.value || 0;" step="1" />
            <input class="TextInput" type="number" name="Input" value="0" oninput="this.form.Range.value = this.value || 0;" step="any" />
          </form>
          Show alert when... > 300
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 220">
          <defs>
            <clipPath id="GraphClipPath">
              <path d="M 0 0 L 400 0 L 400 200 L 0 200" />
            </clipPath>
          </defs>
          <g transform="translate(40, 0)">
            <g data-axis="x"></g>
            <g data-axis="y"></g>
          </g>
        </svg>
      </div>
    </div>
  `, "text/html").documentElement.querySelector("body > *"), true);
  //Important: I need to parse it as "text/html" so the elements have the correct namespace, but this automatically creates <html> and <body> elements, so I select the root element of the body which is the html fragment from the strings.
  static GraphContentTemplates = document.importNode(Parser.parseFromString(`
    <svg id="GraphFragmentTemplates" xmlns="http://www.w3.org/2000/svg" style="height: 0; width: 0; opacity: 0; position: absolute;">
      <defs>
        <g id="HorizontalLine">
          <g transform="translate(0, 20)">
            <line x1="-5" x2="400" stroke="#ffffff" stroke-opacity=".2" stroke-width="2"/>
            <text dy="5" x="-8" text-anchor="end" fill="#ffffff">450</text>
          </g>
        </g>
        <g id="VerticalLine">
          <g transform="translate(25, 0)">
            <line y2="205" stroke="#ffffff" stroke-opacity=".2" stroke-width="2"/>
            <text dy="18" y="200" text-anchor="middle" fill="#ffffff">17:44:20</text>
          </g>
        </g>
        <g id="GraphPath">
          <path clip-path="url(#GraphClipPath)" stroke="rebeccapurple" stroke-width="3" fill="rebeccapurple" fill-opacity=".5" d="M -100 200 L 0 50 L 10 30 L 20 24 L 30 5 L 40 19 L 50 54 L 60 48 L 70 68 L 80 64 L 90 51 L 100 55 L 110 66 L 120 62 L 130 61 L 140 59 L 150 46 L 160 38 L 170 33 L 180 45 L 190 27 L 200 23 L 210 36 L 220 54 L 230 51 L 240 100 L 250 92 L 260 98 L 270 141 L 280 160 L 290 153 L 300 172 L 310 189 L 320 166 L 330 163 L 340 174 L 350 159 L 360 133 L 370 135 L 380 128 L 390 134 L 400 141 L 500 200" />
        </g>
      </defs>
    </svg>
  `, "text/html").documentElement.querySelector("body > *"), true);
  static GraphPath = SVGGraph.GraphContentTemplates.querySelector("#GraphPath").firstElementChild;
  static GraphVerticalLine = SVGGraph.GraphContentTemplates.querySelector("#VerticalLine").firstElementChild;
  static GraphHorizontalLine = SVGGraph.GraphContentTemplates.querySelector("#HorizontalLine").firstElementChild;
  constructor(Name, Colour, HistoryLength, Unit, Generator){
    this.Name = Name;
    this.Colour = Colour;
    this.Generator = Generator;
    this.Graph = SVGGraph.GraphTemplate.cloneNode(true);
    this.GraphContent = this.Graph.querySelector("svg").querySelector("g");
    this.GraphPathElement = SVGGraph.GraphPath.cloneNode(true);
    this.GraphContent.appendChild(this.GraphPathElement);
    this.GraphXAxis = this.GraphContent.querySelector("g[data-axis='x']");
    this.GraphYAxis = this.GraphContent.querySelector("g[data-axis='y']");

    this.Graph.querySelector("h1").textContent = Name;
    this.UpdatedValueElement = this.Graph.querySelector("ins");
    this.UpdatedValueElement.dataset.unit = Unit;

    this.Graph.style = `
      --opaque: ${Colour};
      --transparent: ${Colour}7f;
      --less-transparent: ${Colour}bf;
    `;
    this.GraphPathElement.setAttributeNS(null, "stroke", Colour);
    this.GraphPathElement.setAttributeNS(null, "fill", Colour);

    this.History = [];
    this.HistoryLength = HistoryLength; //Milliseconds
    this.NeedsUpdate = false;

    this.ValidXDivisions = [1, 2, 5, 10, 20, 30, 60, 90, 120, 300, 600, 900, 1800, 3600];

    void async function(){
      while(true){
        let Timeout = new DeferredPromise;
        window.requestAnimationFrame(Timeout.resolve.bind(Timeout));
        const NewValue = (await this.Generator.next()).value;
        this.AddValue(NewValue);
        await Timeout;
      }
    }.bind(this)();

    this.IsVisible = false;
    this.IntersectionObserver = new IntersectionObserver(function(Entries){
      if(Entries[0].isIntersecting) {
        this.IsVisible = true;
        this.NeedsUpdate = true;
      }
      else this.IsVisible = false;
    }.bind(this), {
      root: null,
      threshold: 0.1, // set offset 0.1 means trigger if atleast 10% of element in viewport
    });
    this.IntersectionObserver.observe(this.Graph);

    void function Load(){
      window.requestAnimationFrame(Load.bind(this), 100.);
      //if(!this.NeedsUpdate) return;
      this.UpdateGraph();
    }.bind(this)();
  }
  AddValue(Value){
    if(Number.isNaN(Value)) return;
    this.NeedsUpdate = true;

    if(Value >= 100) this.UpdatedValueElement.textContent = Math.round(Value);
    else this.UpdatedValueElement.textContent = Math.round(Value / (10. ** Math.floor(Math.log10(Value))) * 100.) * (10. ** Math.floor(Math.log10(Value))) / 100.;


    const Now = window.performance.now();
    this.History.push({
      "Time": Now,
      "Value": Value
    });

    //Indexing 1 because I am letting 0 be too old so the graph doesn't look weird
    while(this.History.length > 2 && this.History[1].Time < Now - this.HistoryLength) this.History.shift();
  }

  UpdateGraph(){
    if(this.History.length < 2 || !this.IsVisible) return;
    this.NeedsUpdate = false;
    let MinValue = 0.;
    let MaxValue = -Infinity;
    for(const {Value} of this.History){
      if(MaxValue < Value) MaxValue = Value;
    }
    const LastUpdate = window.performance.now();//this.History[this.History.length - 1].Time;
    const FirstUpdate = this.History[0].Time;
    let LineString = "M -100 200 ";
    for(let i = 0, Length = this.History.length; i < Length; ++i){
      const X = (1. - (LastUpdate - this.History[i].Time) / this.HistoryLength) * 400.;
      const Y = ((MaxValue - this.History[i].Value) / MaxValue) * 200.;
      if(i === 0 && X > 0.) LineString += `L ${X} 200 `;
      LineString += `L ${X} ${Y} `;
      if(i === Length - 1) LineString += `L 400 ${Y} `; //This is to put the final point so it doesn't go down
    }
    LineString += "L 500 200";

    this.GraphPathElement.setAttributeNS(null, "d", LineString);

    const XAxisElements = [...this.GraphXAxis.querySelectorAll("g")];
    const YAxisElements = [...this.GraphYAxis.querySelectorAll("g")];

    let XRange = this.HistoryLength;
    let YRange = MaxValue - MinValue;

    let XStep = null;
    {
      let RoughStep = XRange / 5.;

      let Logged = RoughStep / 1000.;
      for (let i = 0; i < this.ValidXDivisions.length - 1; ++i) {
        if (this.ValidXDivisions[i] < Logged && this.ValidXDivisions[i + 1] > Logged) {
          if (Math.abs(this.ValidXDivisions[i] - Logged) < Math.abs(this.ValidXDivisions[i + 1] - Logged)) {
            XStep = this.ValidXDivisions[i] * 10 ** Math.floor(Math.log10(RoughStep));
          } else XStep = this.ValidXDivisions[i + 1] * 10 ** Math.floor(Math.log10(RoughStep));
          break;
        }
      }
      if(XStep === null) XStep = RoughStep;
    }

    let YStep;
    {
      let RoughStep = YRange / 5.;

      let PossibleValues = [1, 2, 5, 10];
      let Logged = RoughStep / (10 ** Math.floor(Math.log10(RoughStep)));
      for (let i = 0; i < PossibleValues.length; ++i) {
        if (PossibleValues[i] < Logged && PossibleValues[i + 1] > Logged) {
          if (Math.abs(PossibleValues[i] - Logged) < Math.abs(PossibleValues[i + 1] - Logged)) {
            YStep = PossibleValues[i] * 10 ** Math.floor(Math.log10(RoughStep));
          } else YStep = PossibleValues[i + 1] * 10 ** Math.floor(Math.log10(RoughStep));
          break;
        }
      }
    }

    for(let i = 0, CurrentX = Math.floor(FirstUpdate / XStep) * XStep; i < 20; ++i, CurrentX += XStep){
      if(CurrentX < FirstUpdate) continue;
      if(CurrentX > LastUpdate) break;
      const XPosition = (1. - ((LastUpdate - CurrentX) / XRange)) * 400.;
      if(XPosition < 10. || XPosition > 390.) continue;
      let Element = XAxisElements.pop();
      if(!Element){
        Element = SVGGraph.GraphVerticalLine.cloneNode(true);
        this.GraphXAxis.appendChild(Element);
      }
      const DateAtX = new Date(new Date - (LastUpdate - CurrentX));
      const TextX = DateAtX.toTimeString().substr(0, 8);
      Element.querySelector("text").textContent = TextX;
      Element.setAttributeNS(null, "transform", "translate(" + XPosition + ", 0)");
      Element.style.transform = "translate(" + XPosition + "px, 0)";
    }
    while(XAxisElements.length !== 0) XAxisElements.pop().remove();

    for(let i = 0, CurrentY = Math.floor(MinValue / YStep) * YStep; i < 10; ++i, CurrentY += YStep){
      if(CurrentY < MinValue) continue;
      if(CurrentY > MaxValue) break;
      let Element = YAxisElements.pop();
      if(!Element){
        Element = SVGGraph.GraphHorizontalLine.cloneNode(true);
        this.GraphYAxis.appendChild(Element);
      }
      const TextY = (Math.abs(CurrentY) < 1e-4 || Math.abs(CurrentY) > 1e6) && CurrentY !== 0 ? CurrentY.toExponential(5).replace(/\.([0-9]*[1-9])?0*/g, ".$1").replace(/\.e/, ".0e") : CurrentY;
      Element.querySelector("text").textContent = TextY;
      Element.setAttributeNS(null, "transform", "translate(0, " + ((MaxValue - CurrentY) / YRange) * 200. + ")");
      Element.style.transform = "translate(0, " + ((MaxValue - CurrentY) / YRange) * 200. + "px)";
    }
    while(YAxisElements.length !== 0) YAxisElements.pop().remove();
  }
};