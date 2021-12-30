if(typeof PIXI === "undefined") console.warn("[" + (window.performance.now() >> 0) + "] [PixiWrapper] Pixi has not been yet been initialised! This message can be removed by loading PIXI before PixiWrapper.");

class PW{
  static DrawRectangles(Scene, Colour, Positions, Dimensions){
    Scene.beginFill(Colour);
    for(let i = 0, Length = Positions.length; i < Length; i++){
      Scene.drawRect(Positions[i].X, Positions[i].Y, Dimensions[i].W, Dimensions[i].H);
    }
    Scene.endFill();
  }
  static DrawColumns(Scene, Colour, Width, Step, InitY, Heights){
    Scene.beginFill(Colour);
    const TotalWidth = Width + Step;
    for(let i = 0, Length = Heights.length; i < Length; i++){
      Scene.drawRect(i * TotalWidth, InitY, Width, Heights[i]);
    }
  }
  static DrawCustomRectangles(Scene, Colours, Positions, Dimensions){

  }
  static DrawUniformRectangles(Scene, Colour, Positions, Dimensions){

  }

}
