import ICVQ from "../../InterfaceComponentValueQuerier.mjs";
import ICCD from "../../InterfaceComponentChangeDetector.mjs";

export default class Logic{
  constructor(BaseMenu, Main){
    this.BaseMenu = BaseMenu;
    this.Main = Main;
    this.Interface = BaseMenu.Interface;


    this.Interface.Element.querySelector(".Exit").addEventListener("click", function(){
      this.BaseMenu.Exit();
    }.bind(this));

    //Creating custom button for toggling background blur
    const ButtonElement = document.createElement("div");
    ButtonElement.classList.add("ButtonInner");
    ButtonElement.style.margin = "auto";
    ButtonElement.dataset.exp = "ToggleBackground";
    ButtonElement.style.width = "fit-content";
    ButtonElement.style.maxWidth = "90vw";
    ButtonElement.style.textOverflow = "ellipsis";
    ButtonElement.style.paddingInline = "30px";

    this.Interface.Element.querySelector(".Title").after(ButtonElement);
    this.Interface.Element.querySelector(".Container").style.marginTop = "5vh";
    this.Interface.Element.querySelector(".Container").style.maxHeight = "calc(max(72vh - 160px, 150px))";
    this.Interface.Element.querySelector(".Title").style.marginBottom = "2vh";

    {
      let BackgroundBlur = true;
      ButtonElement.addEventListener("click", function(){
        BackgroundBlur = !BackgroundBlur;
        if(BackgroundBlur){
          this.Interface.Element.style.backgroundColor = "#000f0f5f";
          this.Interface.Element.style.backdropFilter = "blur(3px)";
        } else{
          this.Interface.Element.style.backgroundColor = "transparent";
          this.Interface.Element.style.backdropFilter = "none";
        }
      }.bind(this));

      let PointerLocked = false;
      this.Interface.Element.addEventListener("click", function(Event){
        if(Event.target === this.Interface.Element){
          PointerLocked = true;
          Application.Main.Game.GamePointerLockHandler.PointerLock.Element.requestPointerLock();
        }
      }.bind(this));
      document.addEventListener("keydown", function(Event){
        if(Event.code === "AltLeft" && PointerLocked){
          PointerLocked = false;
          document.exitPointerLock();
        }
      });
    }

    ICCD.Range(this.Interface.Element.querySelector(".-ID-FOV"), function(){
      Application.Main.Renderer.DefaultFOV = ICVQ.Range(this.Interface.Element.querySelector(".-ID-FOV"));
      Application.Main.Renderer.Camera.fov = Application.Main.Renderer.DefaultFOV;
      Application.Main.Renderer.Camera.updateProjectionMatrix();
    }.bind(this));
    ICCD.Switch(this.Interface.Element.querySelector(".-ID-AO"), function(){
      Application.Main.Raymarcher.FinalPassMaterial.uniforms["iRenderAmbientOcclusion"].value = ICVQ.Switch(this.Interface.Element.querySelector(".-ID-AO"));
    }.bind(this));

    ICCD.Switch(this.Interface.Element.querySelector(".-ID-UseUpscaling"), function(){
      const UseUpscaling = ICVQ.Switch(this.Interface.Element.querySelector(".-ID-UseUpscaling"));
      Application.Main.Renderer.UseScaledTarget = UseUpscaling;
    }.bind(this));

    ICCD.Range(this.Interface.Element.querySelector(".-ID-UpscalingKernelSize"), function(){
      Application.Main.Raymarcher.SetKernelSize(Number.parseFloat(ICVQ.Range(this.Interface.Element.querySelector(".-ID-UpscalingKernelSize"))));
    }.bind(this));

    ICCD.Range(this.Interface.Element.querySelector(".-ID-RenderSize"), function(){
      Application.Main.Renderer.ImageScale = ICVQ.Range(this.Interface.Element.querySelector(".-ID-RenderSize"));
      Application.Main.Renderer.UpdateSize();
    }.bind(this));
    ICCD.Range(this.Interface.Element.querySelector(".-ID-CloudSize"), function(){
      Application.Main.Renderer.CloudsScale = ICVQ.Range(this.Interface.Element.querySelector(".-ID-CloudSize"));
      Application.Main.Renderer.UpdateSize();
    }.bind(this));
    ICCD.Range(this.Interface.Element.querySelector(".-ID-CloudCoverage"), function(){
      Application.Main.Renderer.BackgroundMaterial.uniforms["iCloudCoverage"].value = ICVQ.Range(this.Interface.Element.querySelector(".-ID-CloudCoverage"));
      Application.Main.Renderer.UpdateSize();
    }.bind(this));

    ICCD.Switch(this.Interface.Element.querySelector(".-ID-UseShadows"), function(){
      Application.Main.Raymarcher.FinalPassMaterial.uniforms["iRenderShadows"].value = ICVQ.Switch(this.Interface.Element.querySelector(".-ID-UseShadows"));
    }.bind(this));

    ICCD.Range(this.Interface.Element.querySelector(".-ID-ShadowSteps"), function(){
      //Application.Main.Raymarcher.Uniforms.iMaxShadowSteps.value = Number.parseInt(ICVQ.Range(this.Interface.Element.querySelector(".-ID-ShadowSteps")));
    }.bind(this));

    ICCD.Range(this.Interface.Element.querySelector(".-ID-ShadowExponent"), function(){
      Application.Main.Raymarcher.Uniforms.iShadowExponent.value = Number.parseFloat(ICVQ.Range(this.Interface.Element.querySelector(".-ID-ShadowExponent")));
    }.bind(this));

    ICCD.Range(this.Interface.Element.querySelector(".-ID-ShadowMultiplier"), function(){
      Application.Main.Raymarcher.Uniforms.iShadowMultiplier.value = Number.parseFloat(ICVQ.Range(this.Interface.Element.querySelector(".-ID-ShadowMultiplier")));
    }.bind(this));

    ICCD.Range(this.Interface.Element.querySelector(".-ID-ShadowDarkness"), function(){
      Application.Main.Raymarcher.Uniforms.iShadowDarkness.value = Number.parseFloat(ICVQ.Range(this.Interface.Element.querySelector(".-ID-ShadowDarkness")));
    }.bind(this));

    ICCD.Range(this.Interface.Element.querySelector(".-ID-FogFactor"), function(){
      Application.Main.Raymarcher.Uniforms.iFogFactor.value = Number.parseFloat(ICVQ.Range(this.Interface.Element.querySelector(".-ID-FogFactor")));
    }.bind(this));
  }
}
