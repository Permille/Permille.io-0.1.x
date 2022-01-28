import ICVQ from "../../InterfaceComponentValueQuerier.mjs";
import ICCD from "../../InterfaceComponentChangeDetector.mjs";

export default class Logic{
  constructor(BaseMenu, Main){
    this.BaseMenu = BaseMenu;
    this.Main = Main;
    this.Interface = BaseMenu.Interface;

    this.Interface.Events.AddEventListener("Loaded", function(){
      const IDocument = this.Interface.IFrame.contentDocument;

      IDocument.getElementById("Exit").addEventListener("click", function(){
        this.BaseMenu.Exit();
      }.bind(this));

      ICCD.Range(IDocument.getElementById("FOV"), function(){
        Application.Main.Renderer.Camera.fov = ICVQ.Range(IDocument.getElementById("FOV"));
        Application.Main.Renderer.Camera.updateProjectionMatrix();
      });
      //AO

      ICCD.Switch(IDocument.getElementById("UseUpscaling"), function(){
        const UseUpscaling = ICVQ.Switch(IDocument.getElementById("UseUpscaling"));
        Application.Main.Renderer.UseScaledTarget = UseUpscaling;
      });

      ICCD.Range(IDocument.getElementById("UpscalingKernelSize"), function(){
        Application.Main.Raymarcher.SetKernelSize(ICVQ.Range(IDocument.getElementById("UpscalingKernelSize")));
      });

      ICCD.Range(IDocument.getElementById("RenderSize"), function(){
        Application.Main.Renderer.ImageScale = ICVQ.Range(IDocument.getElementById("RenderSize"));
        Application.Main.Renderer.UpdateSize();
      });
      ICCD.Range(IDocument.getElementById("CloudSize"), function(){
        Application.Main.Renderer.CloudsScale = ICVQ.Range(IDocument.getElementById("CloudSize"));
        Application.Main.Renderer.UpdateSize();
      });
      ICCD.Range(IDocument.getElementById("CloudCoverage"), function(){
        Application.Main.Renderer.BackgroundMaterial.uniforms["iCloudCoverage"].value = ICVQ.Range(IDocument.getElementById("CloudCoverage"));
        Application.Main.Renderer.UpdateSize();
      });

      ICCD.Switch(IDocument.getElementById("UseShader"), function(){
        const UseShader = ICVQ.Switch(IDocument.getElementById("UseShader"));
        if(UseShader) Application.Main.Renderer.EnableShader();
        else Application.Main.Renderer.DisableShader();
      });

      ICCD.Switch(IDocument.getElementById("DOF"), function(){
        const UseDOF = ICVQ.Switch(IDocument.getElementById("DOF"));
        if(UseDOF) Application.Main.Renderer.EnableDOF();
        else Application.Main.Renderer.DisableDOF();
      });

      ICCD.Range(IDocument.getElementById("FogFactor"), function(){
        Application.Main.Renderer.Scene.fog.density = ICVQ.Range(IDocument.getElementById("FogFactor"));
      });
    }.bind(this));
  }
}
