import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';


export const player_state = (() => {

  class State {
    constructor(parent) {
      this._parent = parent;
    }
  
    Enter() {}
    Exit() {}
    Update() {}
  };

  class DeathState extends State {
    constructor(parent) {
      super(parent);
  
      this._action = null;
    }
  
    get Name() {
      return 'death';
    }
  
    Enter(prevState) {
      this._action = this._parent._proxy._animations['death'].action;
  
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
  
        this._action.reset();  
        this._action.setLoop(THREE.LoopOnce, 1);
        this._action.clampWhenFinished = true;
        this._action.crossFadeFrom(prevAction, 0.2, true);
        this._action.play();
      } else {
        this._action.play();
      }
    }
  
    Exit() {
    }
  
    Update(_) {
    }
  };
  
  class AttackState extends State {
    constructor(parent) {
      super(parent);
  
      this._action = null;
  
      this._FinishedCallback = () => {
        this._Finished();
      }
    }
  
    get Name() {
      return 'attack';
    }
  
    Enter(prevState) {
      this._action = this._parent._proxy._animations['attack'].action;
      if (this._action) {
        const mixer = this._action.getMixer();
        mixer.addEventListener('finished', this._FinishedCallback);
    
        if (prevState) {
          const prevAction = this._parent._proxy._animations[prevState.Name].action;
          if (prevAction) {
            this._action.reset();  
            this._action.setLoop(THREE.LoopOnce, 1);
            this._action.clampWhenFinished = true;
            this._action.crossFadeFrom(prevAction, 0.2, true);
          }
          this._action.play();
        } else {
          this._action.play();
        }
      }
    }
  
    _Finished() {
      this._Cleanup();
      this._parent.SetState('idle');
    }
  
    _Cleanup() {
      if (this._action) {
        this._action.getMixer().removeEventListener('finished', this._FinishedCallback);
      }
    }
  
    Exit() {
      this._Cleanup();
    }
  
    Update(_) {
    }
  };
  
  class WalkState extends State {
    constructor(parent) {
      super(parent);
    }
  
    get Name() {
      return 'walk';
    }
  
    Enter(prevState) {
      const curAction = this._parent._proxy._animations['walk'].action;
      if (curAction) {
        if (prevState) {
          const prevAction = this._parent._proxy._animations[prevState.Name].action;
          if (prevAction) {
            curAction.enabled = true;
    
            if (prevState.Name == 'run') {
              const ratio = curAction.getClip().duration / prevAction.getClip().duration;
              curAction.time = prevAction.time * ratio;
            } else {
              curAction.time = 0.0;
              curAction.setEffectiveTimeScale(1.0);
              curAction.setEffectiveWeight(1.0);
            }
    
            curAction.crossFadeFrom(prevAction, 0.1, true);
          }
          curAction.play();
        } else {
          curAction.play();
        }
      }
    }
  
    Exit() {
    }
  
    Update(timeElapsed, input) {
      if (input._keys.forward || input._keys.backward) {
        if (input._keys.shift) {
          this._parent.SetState('run');
        }
        return;
      }
  
      this._parent.SetState('idle');
    }
  };
  
  
  class RunState extends State {
    constructor(parent) {
      super(parent);
    }
  
    get Name() {
      return 'run';
    }
  
    Enter(prevState) {
      const curAction = this._parent._proxy._animations['run'].action;
      if (curAction) {
        if (prevState) {
          const prevAction = this._parent._proxy._animations[prevState.Name].action;
          if (prevAction) {
            curAction.enabled = true;
    
            if (prevState.Name == 'walk') {
              const ratio = curAction.getClip().duration / prevAction.getClip().duration;
              curAction.time = prevAction.time * ratio;
            } else {
              curAction.time = 0.0;
              curAction.setEffectiveTimeScale(1.0);
              curAction.setEffectiveWeight(1.0);
            }
    
            curAction.crossFadeFrom(prevAction, 0.1, true);
          }
          curAction.play();
        } else {
          curAction.play();
        }
      }
    }
  
    Exit() {
    }
  
    Update(timeElapsed, input) {
      if (input._keys.forward || input._keys.backward) {
        if (!input._keys.shift) {
          this._parent.SetState('walk');
        }
        return;
      }
  
      this._parent.SetState('idle');
    }
  };
  
  
  class IdleState extends State {
    constructor(parent) {
      super(parent);
    }
  
    get Name() {
      return 'idle';
    }
  
    Enter(prevState) {
      const idleAction = this._parent._proxy._animations['idle'].action;
      if (idleAction) {
        if (prevState) {
          const prevAction = this._parent._proxy._animations[prevState.Name].action;
          if (prevAction) {
            idleAction.time = 0.0;
            idleAction.enabled = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.setEffectiveWeight(1.0);
            idleAction.crossFadeFrom(prevAction, 0.25, true);
          }
          idleAction.play();
        } else {
          idleAction.play();
        }
      }
    }
  
    Exit() {
    }
  
    Update(_, input) {
      if (input._keys.forward || input._keys.backward) {
        this._parent.SetState('walk');
      } else if (input._keys.space) {
        this._parent.SetState('attack');
      }
    }
  };

  return {
    State: State,
    AttackState: AttackState,
    IdleState: IdleState,
    WalkState: WalkState,
    RunState: RunState,
    DeathState: DeathState,
  };

})();