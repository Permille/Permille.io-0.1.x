export default class Debug{
  static DEBUG_LEVELS = {
    "ALL": 0,
    "DEBUGGER": 1,
    "VERBOSE": 2,
    "DEBUG": 3,
    "TESTING": 4,
    "INFO": 5,
    "WARNING": 6,
    "ERROR": 7
  };
  static DEBUG_LEVEL = Debug.DEBUG_LEVELS.INFO;
  DeleteAllRegisteredMeshes(){
    for(const Identifier in Application.Main.Game.World.Regions){
      const CurrentRegion = Application.Main.Game.World.Regions[Identifier];
        if(CurrentRegion.OpaqueMesh) Application.Main.Renderer.Scene.remove(CurrentRegion.OpaqueMesh);
        if(CurrentRegion.TransparentMesh) Application.Main.Renderer.Scene.remove(CurrentRegion.TransparentMesh);
    }
    for(const Depth in Application.Main.Game.World.VirtualRegions){
      for(const Identifier in Application.Main.Game.World.VirtualRegions[Depth]){
        const CurrentRegion = Application.Main.Game.World.VirtualRegions[Depth][Identifier];
        if(CurrentRegion.OpaqueMesh) Application.Main.Renderer.Scene.remove(CurrentRegion.OpaqueMesh);
        if(CurrentRegion.TransparentMesh) Application.Main.Renderer.Scene.remove(CurrentRegion.TransparentMesh);
      }
    }
  }
};
