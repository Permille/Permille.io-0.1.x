import GameControlHandler from "../../Controls/GameControlHandler.mjs";
export default class MapMouseControls{
  constructor(WrapperElement, MapInterface, MapView){
    this.WrapperElement = WrapperElement;
    this.MapInterface = MapInterface;
    this.MapView = MapView;

    this.Waypoints = [];
    this.MeasureDistancePoints = [];
    this.MeasuringDistance = false;

    let LastX = -1;
    let LastY = -1;

    this.WrapperElement.addEventListener("mousedown", function(Event){
      LastX = Event.clientX;
      LastY = Event.clientY;
    }.bind(this));
    this.WrapperElement.addEventListener("mousemove", function(Event){
      if(LastX === -1 || LastY === -1) return;
      const CurrentX = Event.clientX;
      const CurrentY = Event.clientY;
      const XDiff = LastX - CurrentX;
      const YDiff = LastY - CurrentY;
      LastX = CurrentX;
      LastY = CurrentY;
      this.MapView.Pan(XDiff, YDiff);
    }.bind(this));
    this.WrapperElement.addEventListener("mouseup", function(){
      LastX = -1;
      LastY = -1;
    }.bind(this));
    this.WrapperElement.addEventListener("mouseleave", function(){
      LastX = -1;
      LastY = -1;
    }.bind(this));

    //Custon context menu
    const IDocument = this.MapInterface.IFrame.contentDocument;
    const ContextMenuElement = IDocument.getElementById("ContextMenu");

    this.IDocument = IDocument;

    let ContextMenuEvent;

    this.WrapperElement.addEventListener("contextmenu", function(Event){
      Event.preventDefault();
      ContextMenuEvent = Event;

      ContextMenuElement.style.display = "block";
      ContextMenuElement.style.top = Event.clientY + "px";
      ContextMenuElement.style.left = Event.clientX + "px";

      //Kinda hacky but whatever
      if(this.MeasuringDistance) ContextMenuElement.querySelector("[data-function='Distance']").innerText = "Clear measurement";
      else ContextMenuElement.querySelector("[data-function='Distance']").innerText = "Measure distance";
    }.bind(this));

    ContextMenuElement.addEventListener("click", function(Event){
      this["Function_" + Event.target.dataset.function]?.(Event, ContextMenuEvent);
    }.bind(this));

    {
      let InitialX;
      let InitialY;
      IDocument.addEventListener("mousedown", function(Event){
        InitialX = Event.clientX;
        InitialY = Event.clientY;
      });

      IDocument.addEventListener("click", function(Event){
        ContextMenuElement.style.display = "none";
        if(Event.target.parentElement === ContextMenuElement) return;

        if(Event.clientX !== InitialX || Event.clientY !== InitialY) return; //Mouse was moved, indicating a map pan.

        if(this.MeasuringDistance) this.AddMeasureDistancePoint(Event);
      }.bind(this));

    }


    //Waypoints

    void function Update(){
      Application.Main.Renderer.RequestPreAnimationFrame(Update.bind(this));

      /*Waypoints*/

      const XOffset = this.MapView.XOffset;
      const ZOffset = this.MapView.ZOffset;

      const PlayerX = Application.Main.Renderer.Camera.position.x;
      const PlayerZ = Application.Main.Renderer.Camera.position.z;

      for(const Waypoint of this.Waypoints){
        Waypoint.DataElement.dataset.distance = Math.round(Math.sqrt((PlayerX - Waypoint.XPos) ** 2 + (PlayerZ - Waypoint.ZPos) ** 2)) + "m";
        Waypoint.WaypointElement.style.top = (-ZOffset + Waypoint.ZPos / 8) - 15 + "px";
        Waypoint.WaypointElement.style.left = (-XOffset + Waypoint.XPos / 8) - 15 + "px";
      }

      /*Measure distance*/

      this.UpdateMeasureDistancePosition();

    }.bind(this)();


  }
  Function_Waypoint(Event, ContextMenuEvent){
    const XPos = (ContextMenuEvent.clientX + this.MapView.XOffset) * 8;
    const ZPos = (ContextMenuEvent.clientY + this.MapView.ZOffset) * 8;

    const WaypointElement = this.IDocument.getElementById("WaypointTemplate").content.firstElementChild.cloneNode(true);
    const DataElement = WaypointElement.querySelector(".WaypointInfo");
    const ID = this.Waypoints.length + 1;
    DataElement.innerText = "Waypoint #" + ID;

    WaypointElement.style.setProperty("--waypoint-colour", "hsl(" + Math.random() * 360 + ", " + 50 + Math.random() * 30 + "%, 75%)");

    this.IDocument.getElementById("Waypoints").appendChild(WaypointElement);

    const Range = this.IDocument.createRange();
    Range.selectNodeContents(DataElement);
    const Selection = this.IDocument.defaultView.getSelection();
    Selection.removeAllRanges();
    Selection.addRange(Range);
    DataElement.focus();

    DataElement.addEventListener("keydown", function(Event){
      if(Event.code === "Enter"){
        Event.preventDefault();
        this.IDocument.defaultView.getSelection().removeAllRanges();
      }
    }.bind(this));

    this.Waypoints.push({
      "XPos": XPos,
      "ZPos": ZPos,
      "WaypointElement": WaypointElement,
      "DataElement": DataElement,
      "ID": ID
    });
  }
  Function_Teleport(Event, ContextMenuEvent){
    Application.Main.Game.ControlManager.FocusControl("GameControls");
    this.MapInterface.Hide();
    const XPos = (ContextMenuEvent.clientX + this.MapView.XOffset) * 8;
    const ZPos = (ContextMenuEvent.clientY + this.MapView.ZOffset) * 8;

    //const IsFlying = Application.Main.Game.GameControlHandler.MovementPreset === GameControlHandler.MOVEMENT_PRESET_FLYING;

    const Height = this.MapView.GetHeight(XPos, ZPos) + 5;
    Application.Main.Renderer.Camera.position.x = XPos;
    Application.Main.Renderer.Camera.position.z = ZPos;
    Application.Main.Renderer.Camera.position.y = Height;
  }
  Function_Distance(Event, ContextMenuEvent){
    const Polyline = this.IDocument.getElementById("MeasureDistanceLine");
    if(this.MeasuringDistance){
      this.IDocument.getElementById("MeasureDistanceInfo").style.display = "none";
      this.MeasuringDistance = false;
      this.MeasureDistancePoints.length = 0;
      Polyline.setAttributeNS(null, "points", "");
    } else{
      this.IDocument.getElementById("MeasureDistanceInfo").style.display = "block";
      this.MeasuringDistance = true;
      this.AddMeasureDistancePoint(ContextMenuEvent);
    }
  }

  AddMeasureDistancePoint(Event){
    const Polyline = this.IDocument.getElementById("MeasureDistanceLine");
    let Points = Polyline.getAttributeNS(null, "points");
    const XPos = Event.clientX + this.MapView.XOffset;
    const YPos = Event.clientY + this.MapView.ZOffset;
    Points += XPos + "," + YPos + " ";
    Polyline.setAttributeNS(null, "points", Points);

    const PointArray = this.MeasureDistancePoints;

    PointArray.push({
      "XPos": XPos,
      "YPos": YPos
    });

    //Calculate distance and update the info element

    let TotalDistance = 0;

    const Length = PointArray.length;

    if(Length > 1){
      for(let i = 1; i < Length; i++){
        TotalDistance += Math.sqrt((PointArray[i].XPos - PointArray[i - 1].XPos) ** 2 + (PointArray[i].YPos - PointArray[i - 1].YPos) ** 2);
      }
    }

    if(Length > 2){
      let OpenDistance = Math.sqrt((PointArray[0].XPos - PointArray[Length - 1].XPos) ** 2 + (PointArray[0].YPos - PointArray[Length - 1].YPos) ** 2);
      if(OpenDistance < 32){
        let Sum = 0;
        for(let i = 0; i < Length; i++){
          Sum += (PointArray[i].XPos * PointArray[(i + 1) % Length].YPos - PointArray[i].YPos * PointArray[(i + 1) % Length].XPos) * 64;
        }
        const Result = Math.abs(Sum / 2);
        const AreaMeasuredElement = this.IDocument.getElementById("AreaMeasured");
        AreaMeasuredElement.style.display = "block";
        AreaMeasuredElement.dataset.measured = Math.round(Result / 1e4) / 1e2 + "km²";

      } else this.IDocument.getElementById("AreaMeasured").style.display = "none"; //For the loop not being closed
    } else this.IDocument.getElementById("AreaMeasured").style.display = "none"; //For there not being enough points


    const DistanceMeasured = Math.round(TotalDistance * 8);
    let DistanceMeasuredText = "";
    if(DistanceMeasured > 10000) DistanceMeasuredText = Math.round(DistanceMeasured / 10) / 100 + "km";
    else DistanceMeasuredText = DistanceMeasured + "m";

    this.IDocument.getElementById("DistanceMeasured").dataset.measured = DistanceMeasuredText;
  }
  UpdateMeasureDistancePosition(){
    const XOffset = this.MapView.XOffset;
    const YOffset = this.MapView.ZOffset;

    const Width = window.innerWidth;
    const Height = window.innerHeight;

    const SVGElement = this.IDocument.getElementById("MeasureDistance").firstElementChild;
    SVGElement.setAttributeNS(null, "viewBox", XOffset + " " + YOffset + " " + Width + " " + Height);
    SVGElement.setAttributeNS(null, "width", Width);
    SVGElement.setAttributeNS(null, "height", Height);
  }
};
