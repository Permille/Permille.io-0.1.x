import {Region} from "./../../World/Region.mjs";
import REGION_SD from "../../World/RegionSD.mjs";
import * as THREE from "../../Libraries/Three/Three.js";
import World from "./../../World/World.mjs";
import Listenable from "../../Libraries/Listenable/Listenable.mjs";
import Debug from "../../Debug.mjs";
export default class GeometryDataAdder{
  static Version = "Alpha 0.1.9.1";
  static Build = 33;
  constructor(Regions, VirtualRegions, Scene, CSM){
    this.CSM = CSM;
    this.Scene = Scene;
    this.Regions = Regions;
    this.VirtualRegions = VirtualRegions;
    this.PendingAddGeometryDataRequests = 0;
    this.PendingAddVirtualGeometryDataRequests = 0;
    this.AddedGeometriesThisFrame = 0;
    this.AddedVirtualGeometriesThisFrame = 0;
    this.Events = new Listenable;

    //The index array will always be the same.
    this.IndexTemplate = new Uint32Array(786432);
    for(let i = 0, Stride = 0; i < 131072; i++){
      this.IndexTemplate[Stride++] = 4 * i;
      this.IndexTemplate[Stride++] = 4 * i + 1;
      this.IndexTemplate[Stride++] = 4 * i + 2;
      this.IndexTemplate[Stride++] = 4 * i + 2;
      this.IndexTemplate[Stride++] = 4 * i + 1;
      this.IndexTemplate[Stride++] = 4 * i + 3;
    }

    this.RecycledMeshes = {
      "Transparent": new Set,
      "Opaque": new Set
    };

    this.RecycledMeshesSizes = {
      "Transparent": new WeakMap,
      "Opaque": new WeakMap
    };

    this.UsedMeshes = {
      "Transparent": new Set,
      "Opaque": new Set
    }; //Might cause memory leaks?

    this.TimeLastRegion = 0;
    this.TimeLastVirtualRegion = 0;


    void function Load(){
      window.requestAnimationFrame(Load.bind(this));
      this.AddedGeometriesThisFrame = 0;
      this.AddedVirtualGeometriesThisFrame = 0;
    }.bind(this)();

    function ModifiedBinarySearch(Values, SearchingValue){
      let SearchOffset = Math.ceil(Values.length / 2);
      let SearchIndex = Math.ceil(Values.length / 2);
      let i = 0;
      let UltimateIndex = -1;
      let PenultimateIndex = -2;
      for(; i < 14; i++){
        let Sign = Math.sign(Values[SearchIndex] - SearchingValue);
        if(Sign === 0) break;
        else if(Sign === 1){
          SearchIndex = Math.min(SearchIndex + SearchOffset, Values.length - 1);
        } else if(Sign === -1){
          SearchIndex = Math.max(SearchIndex - SearchOffset, 0);
        }
        if(PenultimateIndex === SearchIndex){
          let CurrentValue = Values[SearchIndex];
          let UltimateValue = Values[UltimateIndex];
          let CurrentDifference = Math.abs(SearchingValue - CurrentValue);
          let UltimateDifference = Math.abs(SearchingValue - UltimateValue);
          SearchIndex = CurrentDifference < UltimateDifference ? SearchIndex : UltimateIndex;
          break;
        }
        PenultimateIndex = UltimateIndex;
        UltimateIndex = SearchIndex;
        SearchOffset = Math.ceil(SearchOffset / 2);
      }
      return SearchIndex;
    }

    void function DisposeRecycledMeshes(){
      window.setTimeout(DisposeRecycledMeshes.bind(this), 500);

      const Sizes = {};
      for(const Type in this.RecycledMeshes){
        Sizes[Type] = [];
        let SizesType = Sizes[Type];
        for(const Mesh of this.RecycledMeshes[Type]){
          SizesType.push(this.RecycledMeshesSizes[Type].get(Mesh));
        }

        SizesType.sort(function(a, b) {
          return a - b;
        });

        let Iteration = 0;
        for(const Mesh of this.RecycledMeshes[Type]){
          let Size = this.RecycledMeshesSizes[Type].get(Mesh);
          let SearchIndex = ModifiedBinarySearch(SizesType, Size);
          let MinIndex = Math.max(0, SearchIndex - 10);
          let MaxIndex = Math.min(SizesType.length - 1, SearchIndex + 10);
          let SimilarityScore = 0;
          for(let i = MinIndex; i < MaxIndex; i++){
            if(Math.abs(Size - SizesType[i]) > Size * 0.2 + 200) SimilarityScore++;
          }
          // vvv Slowly remove recycled meshes even if they could be useful. This will reduce memory overhead and lag.
          if(Iteration++ < this.RecycledMeshes[Type].size / 50 || SimilarityScore > 5){
            SizesType.splice(SearchIndex, 1);
            this.UsedMeshes[Type].delete(Mesh);
            this.RecycledMeshes[Type].delete(Mesh);
            Mesh.geometry.dispose();
            Mesh.material.dispose();
            this.Scene.remove(Mesh);
          }
        }
      }
    }.bind(this)();
  }
  GetRecycledMesh(Type, Size, Tolerance = 1.25){
    const Meshes = this.RecycledMeshes[Type];
    const MeshSizes = this.RecycledMeshesSizes[Type];
    if(!Meshes || !MeshSizes) return false;
    let ClosestMesh;
    let ClosestValue = Size * Tolerance;
    for(const Mesh of Meshes){
      const MeshSize = MeshSizes.get(Mesh);
      if(MeshSize === undefined) throw new Error("Mesh size for recycled mesh wasn't set.");
      if(MeshSize > Size && MeshSize < ClosestValue){
        ClosestMesh = Mesh;
        ClosestValue = MeshSize;
      } else if(MeshSize === Size){
        ClosestMesh = Mesh;
        break;
      }
    }
    if(ClosestMesh !== undefined){
      Meshes.delete(ClosestMesh);
      MeshSizes.delete(ClosestMesh);
      return ClosestMesh;
    } else return false;
  }
  RecycleMesh(Type, Mesh){
    this.RecycledMeshes[Type].add(Mesh);
    this.RecycledMeshesSizes[Type].set(Mesh, Mesh.geometry.index.count);
    Mesh.UNLOADING = false; //Custom property.
    Mesh.name = "";
    Mesh.material.visible = false;
  }
  GetAOMaterial(){
    const Material =
      Application.Main.Renderer.UsingShader ?
        new THREE.MeshPhongMaterial({
          "map": Application.Main.Renderer.MergedTexture.mergedTexture,
          "alphaTest": 0.5,
          "side": THREE.DoubleSide,
          "wireframe": false,
          "depthTest": true,
          "shininess": 0,
          "flatShading": true/*,
          "color": new THREE.Color("hsl(" + ((Math.random() * 360) >> 0) + ", 50%, 50%)")*/
        })
        : new THREE.MeshLambertMaterial({ //I could probably even get away with Basic, but I'd have to implement lighting...
          "map": Application.Main.Renderer.MergedTexture.mergedTexture,
          "alphaTest": 0.5,
          "side": THREE.DoubleSide,
          "wireframe": false,
          "depthTest": true,
          "flatShading": true/*,
          "color": new THREE.Color("hsl(" + ((Math.random() * 360) >> 0) + ", 50%, 50%)")*/
        });

    if(Application.Main.Renderer.UsingShader) this.CSM.setupMaterial(Material);
    let OnBeforeCompile = Material.onBeforeCompile;
    Material.onBeforeCompile = function ( shader ) {
      OnBeforeCompile(shader);
      shader.uniforms.time = { value: 0 };
      shader.vertexShader = `
        uniform float time;
        attribute float RandomNumber;
        attribute float AmbientOcclusion;
        flat varying float vAmbientOcclusion;

        varying vec3 vPosition;
        attribute vec3 StaticNormal;
        varying vec3 vStaticNormal;
        flat varying vec2 vFlatUV;
        flat varying vec3 vFlatPosition;

        flat varying float vLength;
        attribute float Length;
        varying vec4 vmvPosition;\n` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>', `
          #include <begin_vertex>
          //vNormal = vNormal;
          vPosition = position;
          vStaticNormal = StaticNormal;
          vAmbientOcclusion = AmbientOcclusion;
          vFlatUV = vUv;
          vFlatPosition = vPosition;
          vLength = Length;
          vmvPosition = modelViewMatrix * vec4( position, 1.0 );
        `
      );

      shader.fragmentShader = `
        flat varying float vAmbientOcclusion;
        flat varying float vLength;
        varying vec3 vPosition;
        varying vec3 vStaticNormal;
        varying vec4 vmvPosition;
      ` + shader.fragmentShader;

      let UVChunk = `
      flat varying vec3 vFlatPosition;
      #if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )
        varying vec2 vUv;
        flat varying vec2 vFlatUV;

        //#define ModifiedvUv vUv
        //#define vUv OriginalvUv
        //vec2 ModifiedvUv = vUv;
      #endif
      `;//THREE.ShaderChunk["uv_pars_fragment"];

      shader.fragmentShader = shader.fragmentShader.replace("#include <uv_pars_fragment>", UVChunk);

      shader.fragmentShader.replace("void main() {", `
        void main() {
          vec2 ModifiedvUv = vUv;
          float UVYRatio = (vUv.y - vFlatUV.y) / (vPosition.z - vFlatPosition.z);

          vec2 ModifiedUV = vUv;

          if(vStaticNormal.y != 0.){
            float TextureSize = (vUv.y - vFlatUV.y) / (vPosition.z - vFlatPosition.z); //Fraction of entire atlas. Width and height are the same.
            ModifiedUV.y = mod(vUv.y, TextureSize / 1.) * vLength;
          }

          #define vUv ModifiedUV
      `);

      shader.fragmentShader.replace("void main() {", `
        void main() {
          vec2 ModifiedvUv = vUv;
          float UVYRatio = (vUv.y - vFlatUV.y) / (vPosition.z - vFlatPosition.z);
          /*ModifiedvUv.x = (ModifiedvUv.x - vFlatUV.x) * (1. - UVXRatio);*/

          vec2 ModifiedUV = vUv;

          if(vStaticNormal.y != 0.){
            float TextureSize = 1. / vLength;
            if(vStaticNormal.y >= 0.) ModifiedUV.y = mod(vUv.y, TextureSize) - vFlatUV.y / TextureSize;//mod(vUv.y, TextureSize) + 0. + vFlatUV.y * UVYRatio;
            else ModifiedUV.y = mod(vUv.y, TextureSize) - 0.125 - vFlatUV.y / 6.;
          }
          else if(vStaticNormal.x != 0.){
            float TextureSize = (vUv.x - vFlatUV.x) / (vPosition.z - vFlatPosition.z);
            ModifiedUV.x = mod(vUv.x, TextureSize) + vFlatUV.x;
          }

          #define vUv ModifiedUV
      `);

      shader.fragmentShader = shader.fragmentShader.replace("#include <tonemapping_fragment>", `
        #include <tonemapping_fragment>

        vec4 OriginalColour = gl_FragColor;
        gl_FragColor = vec4(1.);

        highp int Neighbours = int(vAmbientOcclusion);
        
        if(Neighbours != 0){
          float AODarkness = .25 * max((200. - length(vmvPosition)) / 200., 0.);
          vec3 ModPosition = mod(vPosition, 1.);
          vec3 NModPosition = mod(-vPosition, 1.);
          
          float x01 = float((Neighbours & 0x01))      * AODarkness;
          float x02 = float((Neighbours & 0x02) >> 1) * AODarkness;
          float x04 = float((Neighbours & 0x04) >> 2) * AODarkness;
          float x08 = float((Neighbours & 0x08) >> 3) * AODarkness;
          float x10 = float((Neighbours & 0x10) >> 4) * AODarkness;
          float x20 = float((Neighbours & 0x20) >> 5) * AODarkness;
          float x40 = float((Neighbours & 0x40) >> 6) * AODarkness;
          float x80 = float((Neighbours & 0x80) >> 7) * AODarkness;
          
          if(vStaticNormal.x != 0.){
            gl_FragColor -= x01 * NModPosition.y * NModPosition.y
                          + x02 * NModPosition.y * NModPosition.y * NModPosition.z * NModPosition.z
                          + x04 * NModPosition.z * NModPosition.z
                          + x08 * NModPosition.z * NModPosition.z * ModPosition.y * ModPosition.y
                          + x10 * ModPosition.y * ModPosition.y
                          + x20 * ModPosition.y * ModPosition.y * ModPosition.z * ModPosition.z
                          + x40 * ModPosition.z * ModPosition.z
                          + x80 * ModPosition.z * ModPosition.z * NModPosition.y * NModPosition.y;
          } else if(vStaticNormal.y != 0.){
            gl_FragColor -= x01 * NModPosition.x * NModPosition.x
                          + x02 * NModPosition.x * NModPosition.x * NModPosition.z * NModPosition.z
                          + x04 * NModPosition.z * NModPosition.z
                          + x08 * NModPosition.z * NModPosition.z * ModPosition.x * ModPosition.x
                          + x10 * ModPosition.x * ModPosition.x
                          + x20 * ModPosition.x * ModPosition.x * ModPosition.z * ModPosition.z
                          + x40 * ModPosition.z * ModPosition.z
                          + x80 * ModPosition.z * ModPosition.z * NModPosition.x * NModPosition.x;
          } else if(vStaticNormal.z != 0.){
            gl_FragColor -= x01 * NModPosition.x * NModPosition.x
                          + x02 * NModPosition.x * NModPosition.x * NModPosition.y * NModPosition.y
                          + x04 * NModPosition.y * NModPosition.y
                          + x08 * NModPosition.y * NModPosition.y * ModPosition.x * ModPosition.x
                          + x10 * ModPosition.x * ModPosition.x
                          + x20 * ModPosition.x * ModPosition.x * ModPosition.y * ModPosition.y
                          + x40 * ModPosition.y * ModPosition.y
                          + x80 * ModPosition.y * ModPosition.y * NModPosition.x * NModPosition.x;
          }
        }

        OriginalColour *= gl_FragColor;
        gl_FragColor = vec4(OriginalColour.xyz, 1.);
      `);

      Material.userData.shader = shader;
      Material.customProgramCacheKey = function(){
        return "0";
      };
    };
    return Material;
  }

  GetTransparentMaterial(){
    const Material = new THREE.MeshPhongMaterial({
      "map": Application.Main.Renderer.MergedTexture.mergedTexture,
      "alphaTest": 0.00,
      "side": THREE.DoubleSide, //Should always be double-sided (water).
      "transparent": true,
      "wireframe": false,
      "depthTest": true,
      "shininess": 0,
      "flatShading": true/*,
      "color": new THREE.Color("hsl(120, 50%, 50%)")*/
    });

    if(Application.Main.Renderer.UsingShader) this.CSM.setupMaterial(Material);

    return Material;
  }

  RemoveMeshByName(Name){
    const Mesh = this.Scene.getObjectByName(Name);
    if(Mesh){
      Mesh.material.visible = false;
      this.RecycleMesh(Name[0] === 'T' ? "Transparent" : "Opaque", Mesh); //Recycle old mesh. This needs to be done due to ghost meshes being added after a region is deleted.
    }
  }

  GetMeshByName(Name){
    return this.Scene.getObjectByName(Name);
  }

  RemoveMesh(Mesh){
    if(Mesh){
      Mesh.material.visible = false;
      this.RecycleMesh(Mesh.name[0] === 'T' ? "Transparent" : "Opaque", Mesh); //Recycle old mesh. This needs to be done due to ghost meshes being added after a region is deleted.
    }
  }

  AddVirtualGeometryData(Data){
    const Identifier = Data.RegionX + "," + Data.RegionY + "," + Data.RegionZ;

    if(Data.Positions.length === 0 || Data.Normals.length === 0 || Data.Indices === 0 || Data.UVs.length === 0){
      return;
    }

    this.AddedVirtualGeometriesThisFrame++;

    const FACTOR = 2 ** (1 + Data.Depth);

    let Mesh = this.GetRecycledMesh(Data.Transparent ? "Transparent" : "Opaque", Data.Indices);
    if(Mesh){
      Mesh.geometry.attributes.position.array.set(Data.Positions, 0);
      Mesh.geometry.attributes.normal.array.set(Data.Normals, 0);
      Mesh.geometry.attributes.StaticNormal.array.set(Data.Normals, 0);
      Mesh.geometry.attributes.uv.array.set(Data.UVs, 0);
      Mesh.geometry.setAttribute("AmbientOcclusion", new THREE.BufferAttribute(Data.VertexAOs, 1));

      Mesh.geometry.attributes.position.needsUpdate = true;
      Mesh.geometry.attributes.normal.needsUpdate = true;
      Mesh.geometry.attributes.StaticNormal.needsUpdate = true;
      Mesh.geometry.attributes.uv.needsUpdate = true;
      Mesh.geometry.attributes.AmbientOcclusion.needsUpdate = true;

      Mesh.geometry.setDrawRange(0, Data.Indices);
    } else{
      const Geometry = new THREE.BufferGeometry();
      const Material = Data.Transparent ? this.GetTransparentMaterial() : this.GetAOMaterial();
      Mesh = new THREE.Mesh(Geometry, Material);
      this.UsedMeshes[Data.Transparent ? "Transparent" : "Opaque"].add(Mesh);

      const PositionNumComponents = 3, NormalNumComponents = 3,  UVNumComponents = 2;

      Geometry.setAttribute("position", new THREE.BufferAttribute(Data.Positions, PositionNumComponents));
      Geometry.setAttribute("normal", new THREE.BufferAttribute(Data.Normals, NormalNumComponents));
      Geometry.setAttribute("StaticNormal", new THREE.BufferAttribute(Data.Normals, NormalNumComponents));
      Geometry.setAttribute("uv", new THREE.BufferAttribute(Data.UVs, UVNumComponents));
      Geometry.setAttribute("AmbientOcclusion", new THREE.BufferAttribute(Data.VertexAOs, 1));
      Geometry.setIndex(Array.from(this.IndexTemplate.slice(0, Data.Indices)));

      Mesh.geometry.boundingSphere = new THREE.Sphere;
    }

    Mesh.geometry.boundingSphere.radius = Math.sqrt((Region.X_LENGTH / 2) ** 2 + (Region.Y_LENGTH / 2) ** 2 + (Region.Z_LENGTH / 2) ** 2);
    Mesh.geometry.boundingSphere.center.x = 0.5 * Region.X_LENGTH;
    Mesh.geometry.boundingSphere.center.y = 0.5 * Region.Y_LENGTH;
    Mesh.geometry.boundingSphere.center.z = 0.5 * Region.Z_LENGTH;


    Mesh.position.set(Data.RegionX * Region.X_LENGTH * FACTOR, Data.RegionY * Region.Y_LENGTH * FACTOR, Data.RegionZ * Region.Z_LENGTH * FACTOR);
    Mesh.scale.set(FACTOR, FACTOR, FACTOR);
    Mesh.material.visible = true;

    if(Application.Main.Renderer.UsingShader){
      Mesh.castShadow = true;
      Mesh.receiveShadow = true;
    } else{
      Mesh.castShadow = false;
      Mesh.receiveShadow = false;
    }

    const Name = (Data.Transparent ? "T" : "O") + Data.Depth + "," + Data.RegionX + "," + Data.RegionY + "," + Data.RegionZ;

    this.RemoveMeshByName(Name);
    Mesh.name = Name;
    this.Scene.add(Mesh);

    this.TimeLastVirtualRegion = window.performance.now();

    return Mesh;
  }
  AddGeometryData(Data){
    const Identifier = Data.RegionX + "," + Data.RegionY + "," + Data.RegionZ;

    if(Data.Positions.length === 0 || Data.Normals.length === 0 || Data.Indices === 0 || Data.UVs.length === 0){
      return;
    }

    this.AddedGeometriesThisFrame++;

    let Mesh = this.GetRecycledMesh(Data.Transparent ? "Transparent" : "Opaque", Data.Indices);
    if(Mesh){
      Mesh.geometry.attributes.position.array.set(Data.Positions, 0);
      Mesh.geometry.attributes.normal.array.set(Data.Normals, 0);
      Mesh.geometry.attributes.StaticNormal.array.set(Data.Normals, 0);
      Mesh.geometry.attributes.uv.array.set(Data.UVs, 0);
      Mesh.geometry.setAttribute("AmbientOcclusion", new THREE.BufferAttribute(Data.VertexAOs, 1)); //Avoid buffer overreading

      Mesh.geometry.attributes.position.needsUpdate = true;
      Mesh.geometry.attributes.normal.needsUpdate = true;
      Mesh.geometry.attributes.StaticNormal.needsUpdate = true;
      Mesh.geometry.attributes.uv.needsUpdate = true;
      Mesh.geometry.attributes.AmbientOcclusion.needsUpdate = true;

      Mesh.geometry.setDrawRange(0, Data.Indices);
    } else{
      const Geometry = new THREE.BufferGeometry();
      const Material = Data.Transparent ? this.GetTransparentMaterial() : this.GetAOMaterial();
      Mesh = new THREE.Mesh(Geometry, Material);

      this.UsedMeshes[Data.Transparent ? "Transparent" : "Opaque"].add(Mesh);

      const PositionNumComponents = 3, NormalNumComponents = 3, UVNumComponents = 2;

      Geometry.setAttribute("position", new THREE.BufferAttribute(Data.Positions, PositionNumComponents));
      Geometry.setAttribute("normal", new THREE.BufferAttribute(Data.Normals, NormalNumComponents));
      Geometry.setAttribute("StaticNormal", new THREE.BufferAttribute(Data.Normals, NormalNumComponents));
      Geometry.setAttribute("uv", new THREE.BufferAttribute(Data.UVs, UVNumComponents));
      Geometry.setAttribute("AmbientOcclusion", new THREE.BufferAttribute(Data.VertexAOs, 1));
      Geometry.setIndex(Array.from(this.IndexTemplate.slice(0, Data.Indices)));

      Mesh.geometry.boundingSphere = new THREE.Sphere;
    }

    Mesh.geometry.boundingSphere.radius = Math.sqrt((Region.X_LENGTH / 2) ** 2 + (Region.Y_LENGTH / 2) ** 2 + (Region.Z_LENGTH / 2) ** 2);
    Mesh.geometry.boundingSphere.center.x = 0.5 * Region.X_LENGTH;
    Mesh.geometry.boundingSphere.center.y = 0.5 * Region.Y_LENGTH;
    Mesh.geometry.boundingSphere.center.z = 0.5 * Region.Z_LENGTH;

    Mesh.position.set(Data.RegionX * Region.X_LENGTH, Data.RegionY * Region.Y_LENGTH, Data.RegionZ * Region.Z_LENGTH);
    Mesh.scale.set(1, 1, 1);
    Mesh.material.visible = true;

    //Mesh.updateMatrix();

    if(Application.Main.Renderer.UsingShader){
      Mesh.castShadow = true;
      Mesh.receiveShadow = true;
    } else{
      Mesh.castShadow = false;
      Mesh.receiveShadow = false;
    }

    const Name = (Data.Transparent ? "T" : "O") + Data.RegionX + "," + Data.RegionY + "," + Data.RegionZ;

    this.RemoveMeshByName(Name);
    Mesh.name = Name;
    this.Scene.add(Mesh);

    this.TimeLastRegion = window.performance.now();

    return Mesh;
  }
};
