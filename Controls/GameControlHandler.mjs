import SweepAABB from "./../Libraries/SweptAABB/SweptAABB.mjs";
import BlockRegistry from "./../Block/BlockRegistry.mjs";
export default class GameControlHandler{
  static MOVEMENT_PRESET_NORMAL = 0;
  static MOVEMENT_PRESET_FAST = 1;
  static MOVEMENT_PRESET_SUPERFAST = 2;
  static MOVEMENT_PRESET_CUSTOM = 3;
  static MOVEMENT_PRESET_FLYING = 4;

  constructor(GameControls, Camera, World, p_BlockRegistry){
    this.GameControls = GameControls;
    this.Camera = Camera;
    this.World = World;
    this.BlockRegistry = p_BlockRegistry;

    this.Camera.position.x = 0;//985;//-98000;//-48000;//0;//27110;//-32270 * 2; ///##################
    this.Camera.position.y = this.World.GetHeight(0, 0) + 5;//2400;//1700;//444;//2300;//2400; ///##################
    this.Camera.position.z = 0;//985;//-40000;//-31000;//0;//-18500;//15350 * 2; ///##################

    this.DesiredVelocity = [0, 0, 0];
    this.CurrentVelocity = [0, 0, 0];
    this.HorizontalSpeed = 0.1;
    this.ControlledMovement = [0, 0, 0]; //Forwards/backwards, up/down, left/right

    this.LastAnimationFrame = window.performance.now();
    this.FrameTime = 16;

    this.MovementPreset = GameControlHandler.MOVEMENT_PRESET_CUSTOM;
    this.CustomMovementSettings = {
      "Speed": 1.,
      "JumpSpeed": 0.12,
      "Gravity": -0.98107,
      "AirDrag": 2500,
      "SurfaceDrag": 60
    };

    (function Load(Scope){
      Scope.FrameTime = window.performance.now() - Scope.LastAnimationFrame;
      Scope.LastAnimationFrame = window.performance.now();
      Scope.AnimationFrame();
      //window.setTimeout(function(){Load(Scope);}.bind(this), 50);
      window.requestAnimationFrame(function(){Load(Scope);}.bind(this));
    }.bind(this))(this);
  }
  AnimationFrame(){
    if(window.performance.now() < 1000) return; // Should prevent accidental freezes?
    this.ControlledMovement[0] = +this.GameControls.IsControlPressed("Forwards") - this.GameControls.IsControlPressed("Backwards");
    this.ControlledMovement[1] = +this.GameControls.IsControlPressed("Upwards"); //Dowmwards flying is handled in the switch case.
    this.ControlledMovement[2] = +this.GameControls.IsControlPressed("Leftwards") - this.GameControls.IsControlPressed("Rightwards");

    if(this.ControlledMovement[0] && this.ControlledMovement[2]){
      this.ControlledMovement[0] *= Math.SQRT1_2;
      this.ControlledMovement[2] *= Math.SQRT1_2;
    }

    const Camera = this.Camera;

    let SinX = Math.sin(Camera.rotation.x);
    let SinY = Math.sin(Camera.rotation.y);
    let CosX = Math.cos(Camera.rotation.x);
    let CosY = Math.cos(Camera.rotation.y);

    let QuickBoost = this.GameControls.IsControlPressed("FastMovement") ? 1.4 : 1;

    switch(this.MovementPreset){
      case GameControlHandler.MOVEMENT_PRESET_NORMAL:{
        this.DesiredVelocity[0] = 1 * (-SinY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost - CosY * this.ControlledMovement[2] * this.HorizontalSpeed);
        this.DesiredVelocity[1] = -0.98107;
        this.DesiredVelocity[2] = 1 * (-CosY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost + SinY * this.ControlledMovement[2] * this.HorizontalSpeed);
        if(this.CurrentVelocity[1] === 0 && this.ControlledMovement[1] > 0) this.CurrentVelocity[1] = 0.12;
        break;
      }
      case GameControlHandler.MOVEMENT_PRESET_FAST:{
        this.DesiredVelocity[0] = 3 * (-SinY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost - CosY * this.ControlledMovement[2] * this.HorizontalSpeed);
        this.DesiredVelocity[1] = -0.98107;
        this.DesiredVelocity[2] = 3 * (-CosY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost + SinY * this.ControlledMovement[2] * this.HorizontalSpeed);
        if(this.CurrentVelocity[1] === 0 && this.ControlledMovement[1] > 0) this.CurrentVelocity[1] = 0.36;
        break;
      }
      case GameControlHandler.MOVEMENT_PRESET_SUPERFAST:{
        this.DesiredVelocity[0] = 10 * (-SinY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost - CosY * this.ControlledMovement[2] * this.HorizontalSpeed);
        this.DesiredVelocity[1] = -0.98107;
        this.DesiredVelocity[2] = 10 * (-CosY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost + SinY * this.ControlledMovement[2] * this.HorizontalSpeed);
        if(this.CurrentVelocity[1] === 0 && this.ControlledMovement[1] > 0) this.CurrentVelocity[1] = 0.12 + 1;
        break;
      }
      case GameControlHandler.MOVEMENT_PRESET_CUSTOM:{
        this.DesiredVelocity[0] = this.CustomMovementSettings.Speed * (-SinY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost - CosY * this.ControlledMovement[2] * this.HorizontalSpeed);
        this.DesiredVelocity[1] = this.CustomMovementSettings.Gravity;
        this.DesiredVelocity[2] = this.CustomMovementSettings.Speed * (-CosY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost + SinY * this.ControlledMovement[2] * this.HorizontalSpeed);
        if(this.CurrentVelocity[1] === 0 && this.ControlledMovement[1] > 0) this.CurrentVelocity[1] = this.CustomMovementSettings.JumpSpeed;
        break;
      }
      case GameControlHandler.MOVEMENT_PRESET_FLYING:{
        this.ControlledMovement[1] -= +this.GameControls.IsControlPressed("Downwards"); //Handles flying downwards
        this.DesiredVelocity[0] = this.CustomMovementSettings.Speed * (-SinY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost - CosY * this.ControlledMovement[2] * this.HorizontalSpeed);
        this.DesiredVelocity[1] = this.CustomMovementSettings.Speed * this.ControlledMovement[1] / 10;
        this.DesiredVelocity[2] = this.CustomMovementSettings.Speed * (-CosY * this.ControlledMovement[0] * this.HorizontalSpeed * QuickBoost + SinY * this.ControlledMovement[2] * this.HorizontalSpeed);
        break;
      }
    }



    this.CurrentVelocity.forEach(function(Value, Index){
      let Friction = ((Index === 1 && this.MovementPreset !== GameControlHandler.MOVEMENT_PRESET_FLYING) ? this.CustomMovementSettings.AirDrag : this.CustomMovementSettings.SurfaceDrag) / this.FrameTime;
      this.CurrentVelocity[Index] = ((Friction * Value + this.DesiredVelocity[Index]) / (Friction + 1));
    }.bind(this));

    let AABB = {
      "base":[
        Camera.position.x - 0.3,
        Camera.position.y - 1.6,
        Camera.position.z - 0.3
      ],
      "max":[
        Camera.position.x + 0.3,
        Camera.position.y + 0.3,
        Camera.position.z + 0.3
      ],
      "translate": function(Direction){
        for(let i = 0; i < 3; i++){
          this.base[i] += Direction[i];
          this.max[i] += Direction[i];
        }
        return this;
      }
    };



    const CollisionCallback = function(Distance, CollisionAxis, CollisionDirection, DistanceRemaining, Iterations){
      //DistanceRemaining is a vector that can be updated.

      this.CurrentVelocity[CollisionAxis] = 0; //################
      DistanceRemaining[CollisionAxis] = 0;

      return Math.abs(DistanceRemaining.reduce(function(Accumulated, CurrentValue){return Accumulated + CurrentValue;})) === 0;
    }.bind(this);
    let ScaledFramerateIndependentVelocity = this.CurrentVelocity.map(function(Value){return Value * this.FrameTime / 14;}.bind(this));
    let Distance = SweepAABB((function(Scope){return function(X, Y, Z){return this.IsColliding(X, Y, Z);}.bind(this);}.bind(this))(this), AABB, ScaledFramerateIndependentVelocity, CollisionCallback, false, Math.min(Math.max(Math.abs(Camera.position.x), Math.abs(Camera.position.y), Math.abs(Camera.position.z)) / 1e12, 1e-2));
    Camera.position.x = AABB.max[0] - 0.3;
    Camera.position.y = AABB.max[1] - 0.3;
    Camera.position.z = AABB.max[2] - 0.3;

  }
  IsColliding(X, Y, Z){
    return !!this.BlockRegistry.GetBlockByID(this.World.GetBlock(X, Y, Z)).Properties.Solid;
  }
}
