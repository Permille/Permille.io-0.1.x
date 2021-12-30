import REGION_SD from "./RegionSD.mjs";
export default class MainThreadUnloader{
  constructor(){
    void function Load(){
      window.setTimeout(Load.bind(this), 100);
      this.Unload(); //Nice naming, I know...
    }.bind(this)(this);
  }
  Unload(){
    const Regions = Application.Main.Game.World.Regions;
    const ObsoleteMeshes = [];
    for(const Identifier in Regions){
      if(Regions[Identifier].SharedData[REGION_SD.UNLOAD_TIME] >= 0){
        const CurrentRegion = Regions[Identifier];

        for(const Type of ["O", "T"]){
          const Mesh = Application.Main.GeometryDataAdder.GetMeshByName(Type + Identifier);
          if(Mesh !== undefined){
            Mesh.UNLOADING = true;
            ObsoleteMeshes.push(Mesh);
          }
        }

        delete Regions[Identifier];
      }
    }
    for(const VRDepthObject of Application.Main.Game.World.VirtualRegions){
      for(const Identifier in VRDepthObject){
        if(VRDepthObject[Identifier].SharedData[REGION_SD.UNLOAD_TIME] >= 0){
          const CurrentRegion = VRDepthObject[Identifier];

          for(const Type of ["O", "T"]){
            const Mesh = Application.Main.GeometryDataAdder.GetMeshByName(Type + CurrentRegion.Depth + "," + Identifier);
            if(Mesh !== undefined){
              Mesh.UNLOADING = true;
              ObsoleteMeshes.push(Mesh);
            }
          }

          delete VRDepthObject[Identifier];
        }
      }
    }

    window.setTimeout(function(){//      vvv This could be false if in the mean time, the mesh has been repurposed.
      for(const Mesh of ObsoleteMeshes) if(Mesh.UNLOADING) Application.Main.GeometryDataAdder.RemoveMesh(Mesh);
    }, 150); //Delay deletion of meshes to reduce unload flashing.
  }
};
