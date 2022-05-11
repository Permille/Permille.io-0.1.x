export default function InitMapOverlay(IDocument, MapInterface, MapView){
  const Coords = IDocument.getElementById("Coords");
  const Rotation = IDocument.getElementById("Rotation");
  const Seed = IDocument.getElementById("Seed");

  let MouseX = null;
  let MouseY = null;

  const Update = function(Event){
    if(MapInterface.Maximised){
      MouseX = Event.clientX ?? MouseX;
      MouseY = Event.clientY ?? MouseY;
      const XPos = (MapView.XOffset + (Event.clientX ?? MouseX)) * 8;
      const ZPos = (MapView.ZOffset + (Event.clientY ?? MouseY)) * 8;
      const Height = Math.round(MapView.GetHeight(XPos, ZPos));
      Coords.innerText = "X: " + XPos + ", Y: " + Height + ", Z: " + ZPos;
    } else{
      const Position = Application.Main.Renderer.Camera.position;
      Coords.innerText = "X: " + Math.round(Position.x * 1e0) / 1e0 + ", Y: " + Math.round(Position.y * 1e0 - 1.6) / 1e0 + ", Z: " + Math.round(Position.z * 1e0) / 1e0;
      Rotation.innerText = "Rotation: " + ((Math.round(Application.Main.Renderer.Camera.rotation.y * 180 / Math.PI) % 360) + 360) % 360 + "°";
    }
  };

  Application.Main.World.Events.AddEventListener("SeedUpdate", function(NewSeed){
    Seed.innerText = "Seed: " + NewSeed;
  });

  IDocument.addEventListener("mousemove", Update);
  IDocument.addEventListener("keydown", Update);

  void function UpdatePlayerCoords(){
    window.requestAnimationFrame(UpdatePlayerCoords);
    if(!MapInterface.Maximised) Update();
  }();

  let Arrow = IDocument.getElementById("Player").querySelector("img");
  let Player = IDocument.getElementById("Player");
  void function MoveArrow(){
    window.requestAnimationFrame(MoveArrow);
    Arrow.style.transform = "rotate(" + (-Math.PI / 2 - Application.Main.Renderer.Camera.rotation.y) + "rad)";

    const XOffset = Application.Main.Renderer.Camera.position.x / 8 - MapView.XOffset - 25;
    const ZOffset = Application.Main.Renderer.Camera.position.z / 8 - MapView.ZOffset - 25;

    Player.style.top = ZOffset + "px";
    Player.style.left = XOffset + "px";
  }();
};
