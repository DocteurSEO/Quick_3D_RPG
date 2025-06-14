import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

import {entity} from './entity.js';
import {finite_state_machine} from './finite-state-machine.js';
import {player_state} from './player-state.js';


export const player_entity = (() => {

  class CharacterFSM extends finite_state_machine.FiniteStateMachine {
    constructor(proxy) {
      super();
      this._proxy = proxy;
      this._Init();
    }
  
    _Init() {
      this._AddState('idle', player_state.IdleState);
      this._AddState('walk', player_state.WalkState);
      this._AddState('run', player_state.RunState);
      this._AddState('attack', player_state.AttackState);
      this._AddState('death', player_state.DeathState);
    }
  };
  
  class BasicCharacterControllerProxy {
    constructor(animations, controller) {
      this._animations = animations;
      this._controller = controller;
    }
  
    get animations() {
      return this._animations;
    }
    
    get controller() {
      return this._controller;
    }
  };


  class BasicCharacterController extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this._acceleration = new THREE.Vector3(1, 0.125, 50.0);
      this._velocity = new THREE.Vector3(0, 0, 0);
      this._position = new THREE.Vector3();
      this._enabled = true; // Add enabled property
  
      this._animations = {};
      this._stateMachine = new CharacterFSM(
          new BasicCharacterControllerProxy(this._animations, this));
  
      this._LoadModels();
    }

    InitComponent() {
      this._RegisterHandler('health.death', (m) => { this._OnDeath(m); });
    }

    _OnDeath(msg) {
      this._stateMachine.SetState('death');
    }

    _LoadModels() {
      const loader = new FBXLoader();
      loader.setPath('./resources/robot/');
      loader.load('RB2.fbx', (fbx) => {
        this._target = fbx;
        this._target.scale.setScalar(0.01);
        this._params.scene.add(this._target);
  
        this._bones = {};

        if (this._target.children[0] && this._target.children[0].skeleton) {
          for (let b of this._target.children[0].skeleton.bones) {
            this._bones[b.name] = b;
          }
        }

        this._target.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material) {
            // Load textures manually from the textures directory
            const textureLoader = new THREE.TextureLoader();
            
            // Load base color texture
            const baseColorTexture = textureLoader.load('./resources/textures/RB2_Material.006_BaseColor.png');
            baseColorTexture.encoding = THREE.sRGBEncoding;
            c.material.map = baseColorTexture;
            
            // Load emissive texture
            const emissiveTexture = textureLoader.load('./resources/textures/RB2_Material.006_Emissive.png');
            emissiveTexture.encoding = THREE.sRGBEncoding;
            c.material.emissiveMap = emissiveTexture;
            c.material.emissive = new THREE.Color(0x444444); // Slight emissive glow
            
            c.material.needsUpdate = true;
          }
        });

        this.Broadcast({
            topic: 'load.character',
            model: this._target,
            bones: this._bones,
        });

        this._animations['idle'] = { clip: null, action: null };
        this._animations['walk'] = { clip: null, action: null };
        this._animations['run'] = { clip: null, action: null };
        this._animations['attack'] = { clip: null, action: null };
        this._animations['death'] = { clip: null, action: null };

        this._stateMachine.SetState('idle');
      });
    }

    _FindIntersections(pos) {
      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(5);
      const collisions = [];
      
      // Update debug info
      document.getElementById('robot-pos').textContent = `${pos.x.toFixed(1)},${pos.y.toFixed(1)},${pos.z.toFixed(1)}`;
      document.getElementById('enemy-count').textContent = nearby.length;
      
      const combatSystem = this._parent._parent.Get('combat-system');
      if (combatSystem) {
        const isInCombat = combatSystem.GetComponent('CombatSystem').IsInCombat;
        document.getElementById('combat-status').textContent = isInCombat ? 'In combat' : 'Exploring';
      }

      for (let i = 0; i < nearby.length; ++i) {
        const e = nearby[i].entity;
        const d = ((pos.x - e._position.x) ** 2 + (pos.z - e._position.z) ** 2) ** 0.5;

        // Check for combat encounters with IA001
        if (d <= 5) {
          const npcController = e.GetComponent('NPCController');
          if (npcController && npcController._params && npcController._params.isIA001) {
            // Check if not already in combat
            const combatSystem = this._parent._parent.Get('combat-system');
            if (combatSystem && !combatSystem.GetComponent('CombatSystem').IsInCombat) {
              // Check if monster is alive and active
              if (npcController._health > 0 && e._active) {
                console.log('🔥 COMBAT TRIGGERED WITH IA001! Distance:', d.toFixed(2));
                
                // Trigger combat directly
                const combatComponent = combatSystem.GetComponent('CombatSystem');
                if (combatComponent) {
                  combatComponent._StartCombat({
                    topic: 'combat.start',
                    monster: npcController
                  });
                }
              }
            }
          }
        }

        // Regular collision detection (avoid obstacles during non-combat)
        const combatSystem = this._parent._parent.Get('combat-system');
        if (!combatSystem || !combatSystem.GetComponent('CombatSystem').IsInCombat) {
          if (d <= 4) {
            collisions.push(nearby[i].entity);
          }
        }
      }
      return collisions;
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) {
        return;
      }

      // Check if controller is disabled
      if (!this._enabled) {
        return;
      }

      // Check if in combat mode - disable movement
      const combatSystem = this._parent._parent.Get('combat-system');
      if (combatSystem && combatSystem.GetComponent('CombatSystem').IsInCombat) {
        // Robot floating animation only during combat
        if (this._target) {
          const time = Date.now() * 0.002;
          this._target.position.y = 2.0 + Math.sin(time) * 0.5;
          this._target.rotation.y += timeInSeconds * 0.5;
        }
        return;
      }

      const input = this.GetComponent('BasicCharacterControllerInput');
      this._stateMachine.Update(timeInSeconds, input);

      // Robot floating animation - higher floating motion
      if (this._target) {
        const time = Date.now() * 0.002;
        this._target.position.y = 2.0 + Math.sin(time) * 0.5; // Float higher with more movement
        this._target.rotation.y += timeInSeconds * 0.5; // Gentle rotation while idle
      }

      // HARDCODED
      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }

      const currentState = this._stateMachine._currentState;
      if (currentState.Name != 'walk' &&
          currentState.Name != 'run' &&
          currentState.Name != 'idle') {
        return;
      }
    
      const velocity = this._velocity;
      const frameDecceleration = new THREE.Vector3(
          velocity.x * this._decceleration.x,
          velocity.y * this._decceleration.y,
          velocity.z * this._decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
          Math.abs(frameDecceleration.z), Math.abs(velocity.z));
  
      velocity.add(frameDecceleration);
  
      const controlObject = this._target;
      const _Q = new THREE.Quaternion();
      const _A = new THREE.Vector3();
      const _R = controlObject.quaternion.clone();
  
      const acc = this._acceleration.clone();
      if (input._keys.shift) {
        acc.multiplyScalar(2.0);
      }
  
      if (input._keys.forward) {
        velocity.z += acc.z * timeInSeconds;
      }
      if (input._keys.backward) {
        velocity.z -= acc.z * timeInSeconds;
      }
      if (input._keys.left) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
        _R.multiply(_Q);
      }
      if (input._keys.right) {
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
        _R.multiply(_Q);
      }
  
      controlObject.quaternion.copy(_R);
  
      const oldPosition = new THREE.Vector3();
      oldPosition.copy(controlObject.position);
  
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();
  
      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(controlObject.quaternion);
      sideways.normalize();
  
      sideways.multiplyScalar(velocity.x * timeInSeconds);
      forward.multiplyScalar(velocity.z * timeInSeconds);
  
      const pos = controlObject.position.clone();
      pos.add(forward);
      pos.add(sideways);

      const collisions = this._FindIntersections(pos);
      if (collisions.length > 0) {
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);
  
      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }
  };
  
  return {
      BasicCharacterControllerProxy: BasicCharacterControllerProxy,
      BasicCharacterController: BasicCharacterController,
  };

})();