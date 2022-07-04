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

      //Creating custom button for toggling background blur
      const ButtonElement = document.createElement("div");
      ButtonElement.classList.add("Button");
      ButtonElement.style.margin = "auto";
      ButtonElement.dataset.exp = "ToggleBackground";
      ButtonElement.style.width = "fit-content";
      ButtonElement.style.maxWidth = "90vw";
      ButtonElement.style.textOverflow = "ellipsis";
      ButtonElement.style.paddingInline = "30px";

      IDocument.querySelector("#Title").after(ButtonElement);
      IDocument.querySelector("#Container").style.marginTop = "5vh";
      IDocument.querySelector("#Container").style.maxHeight = "calc(max(72vh - 160px, 150px))";
      IDocument.querySelector("#Title").style.marginBottom = "2vh";

      {
        let BackgroundBlur = true;
        ButtonElement.addEventListener("click", function(){
          BackgroundBlur = !BackgroundBlur;
          if(BackgroundBlur){
            IDocument.documentElement.style.backgroundColor = "#000f0f5f";
            IDocument.documentElement.style.backdropFilter = "blur(3px)";
          } else{
            IDocument.documentElement.style.backgroundColor = "transparent";
            IDocument.documentElement.style.backdropFilter = "none";
          }
        }.bind(this));

        let PointerLocked = false;
        IDocument.documentElement.addEventListener("click", function(Event){
          if(Event.target === IDocument.documentElement || Event.target === IDocument.body){
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

      ICCD.Range(IDocument.getElementById("FOV"), function(){
        Application.Main.Renderer.DefaultFOV = ICVQ.Range(IDocument.getElementById("FOV"));
        Application.Main.Renderer.Camera.fov = Application.Main.Renderer.DefaultFOV;
        Application.Main.Renderer.Camera.updateProjectionMatrix();
      });
      ICCD.Switch(IDocument.getElementById("AO"), function(){
        Application.Main.Raymarcher.FinalPassMaterial.uniforms["iRenderAmbientOcclusion"].value = ICVQ.Switch(IDocument.getElementById("AO"));
      });

      ICCD.Switch(IDocument.getElementById("UseUpscaling"), function(){
        const UseUpscaling = ICVQ.Switch(IDocument.getElementById("UseUpscaling"));
        Application.Main.Renderer.UseScaledTarget = UseUpscaling;
      });

      ICCD.Range(IDocument.getElementById("UpscalingKernelSize"), function(){
        Application.Main.Raymarcher.SetKernelSize(Number.parseFloat(ICVQ.Range(IDocument.getElementById("UpscalingKernelSize"))));
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

      ICCD.Switch(IDocument.getElementById("UseShadows"), function(){
        Application.Main.Raymarcher.FinalPassMaterial.uniforms["iRenderShadows"].value = ICVQ.Switch(IDocument.getElementById("UseShadows"));
      });

      ICCD.Range(IDocument.getElementById("ShadowSteps"), function(){
        Application.Main.Raymarcher.Uniforms.iMaxShadowSteps.value = Number.parseInt(ICVQ.Range(IDocument.getElementById("ShadowSteps")));
      });

      ICCD.Range(IDocument.getElementById("ShadowExponent"), function(){
        Application.Main.Raymarcher.Uniforms.iShadowExponent.value = Number.parseFloat(ICVQ.Range(IDocument.getElementById("ShadowExponent")));
      });

      ICCD.Range(IDocument.getElementById("ShadowMultiplier"), function(){
        Application.Main.Raymarcher.Uniforms.iShadowMultiplier.value = Number.parseFloat(ICVQ.Range(IDocument.getElementById("ShadowMultiplier")));
      });

      ICCD.Range(IDocument.getElementById("ShadowDarkness"), function(){
        Application.Main.Raymarcher.Uniforms.iShadowDarkness.value = Number.parseFloat(ICVQ.Range(IDocument.getElementById("ShadowDarkness")));
      });

      ICCD.Range(IDocument.getElementById("FogFactor"), function(){
        Application.Main.Raymarcher.Uniforms.iFogFactor.value = Number.parseFloat(ICVQ.Range(IDocument.getElementById("FogFactor")));
      });
    }.bind(this));
  }
}
