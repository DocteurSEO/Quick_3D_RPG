import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

import {finite_state_machine} from './finite-state-machine.js';
import {entity} from './entity.js';
import {player_entity} from './player-entity.js'
import {player_state} from './player-state.js';


export const npc_entity = (() => {
  
  class AIInput {
    constructor() {
      this._Init();    
    }

    _Init() {
      this._keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false,
      };
    }
  };

  class NPCFSM extends finite_state_machine.FiniteStateMachine {
    constructor(proxy) {
      super();
      this._proxy = proxy;
      this._Init();
    }

    _Init() {
      this._AddState('idle', player_state.IdleState);
      this._AddState('walk', player_state.WalkState);
      this._AddState('death', player_state.DeathState);
      this._AddState('attack', player_state.AttackState);
    }
  };

  class NPCController extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this._acceleration = new THREE.Vector3(1, 0.25, 40.0);
      this._velocity = new THREE.Vector3(0, 0, 0);
      this._position = new THREE.Vector3();

      this._animations = {};
      this._input = new AIInput();
      // FIXME
      this._stateMachine = new NPCFSM(
          new player_entity.BasicCharacterControllerProxy(this._animations, this));

      this._LoadModels();
    }

    InitComponent() {
      this._RegisterHandler('health.death', (m) => { this._OnDeath(m); });
      this._RegisterHandler('update.position', (m) => { this._OnPosition(m); });
      this._RegisterHandler('player.nearby', (m) => { this._OnPlayerNearby(m); });
      
      // Add health and combat properties
      if (this._params.isIA001) {
        this._health = 150;  // IA001 has more health
        this._maxHealth = 150;
        this.Name = 'IA001';
      } else {
        // Calculate monster stats based on player level if available
        const playerLevel = this._GetPlayerLevel();
        const baseHealth = 80;
        const healthPerLevel = 15;
        const calculatedHealth = baseHealth + (playerLevel - 1) * healthPerLevel;
        
        this._health = calculatedHealth;
        this._maxHealth = calculatedHealth;
        this._level = playerLevel; // Store monster level
        this.Name = this._params.name || this._params.resourceName.replace('.fbx', '');
      }
    }

    _GetPlayerLevel() {
      // Try to get player level from combat system
      try {
        const entityManager = this._parent;
        if (entityManager && entityManager._entities) {
          for (let entity of entityManager._entities) {
            const combatSystem = entity.GetComponent('CombatSystem');
            if (combatSystem && combatSystem._playerLevel) {
              return combatSystem._playerLevel;
            }
          }
        }
      } catch (e) {
        console.log('Could not get player level, using default');
      }
      return 1; // Default level if combat system not found
     }
 
     _OnDeath(msg) {
      this._stateMachine.SetState('death');
    }

    _OnPosition(m) {
      if (this._target) {
        this._target.position.copy(m.value);
        if (this._params.isIA001) {
          this._target.position.y = 3.0;  // Keep IA001 much higher above ground
        } else {
          this._target.position.y = 0.35;
        }
      }
    }

    _OnPlayerNearby(message) {
      // This handler is no longer needed since combat is triggered from player
    }

    _LoadModels() {
      const loader = new FBXLoader();
      
      // Check if it's IA001, robot, or monster
      if (this._params.isIA001) {
        loader.setPath(this._params.resourcePath || './resources/ia001/source/');
      } else if (this._params.isRobot) {
        loader.setPath(this._params.resourcePath || './resources/robot/');
      } else {
        loader.setPath('./resources/monsters/FBX/');
      }
      
      loader.load(this._params.resourceName, (fbx) => {
        this._target = fbx;
        this._params.scene.add(this._target);

        // Set scale and position based on type
        if (this._params.isIA001) {
          this._target.scale.setScalar(0.3);  // Much larger scale for IA001
          this._target.position.copy(this._parent._position);
          this._target.position.y = 3.0;  // Much higher above ground level
        } else if (this._params.isRobot) {
          this._target.scale.setScalar(0.01);  // Same scale as player robot
          this._target.position.copy(this._parent._position);
          this._target.position.y = 0;  // Ground level like player
        } else {
          this._target.scale.setScalar(0.025);
          this._target.position.copy(this._parent._position);
          this._target.position.y += 0.35;
        }

        // Load textures based on type
        this._target.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material) {
            if (this._params.isIA001) {
              // Load IA001 specific textures
              const textureLoader = new THREE.TextureLoader();
              const texturesPath = this._params.texturesPath || './resources/ia001/textures/';
              
              const diffuseTexture = textureLoader.load(texturesPath + 'LowPoly_lambert3_Diffuse.jpg');
              diffuseTexture.encoding = THREE.sRGBEncoding;
              c.material.map = diffuseTexture;
              
              const emissiveTexture = textureLoader.load(texturesPath + 'LowPoly_lambert3_Emissive.jpg');
              emissiveTexture.encoding = THREE.sRGBEncoding;
              c.material.emissiveMap = emissiveTexture;
              c.material.emissive = new THREE.Color(0x222222);
              
              // Optional: add normal and specular maps
              const normalTexture = textureLoader.load(texturesPath + 'LowPoly_lambert3_Normal.jpg');
              c.material.normalMap = normalTexture;
              
              c.material.needsUpdate = true;
            } else if (this._params.isRobot) {
              // Load robot textures like the player
              const textureLoader = new THREE.TextureLoader();
              
              const baseColorTexture = textureLoader.load('./resources/textures/RB2_Material.006_BaseColor.png');
              baseColorTexture.encoding = THREE.sRGBEncoding;
              c.material.map = baseColorTexture;
              
              const emissiveTexture = textureLoader.load('./resources/textures/RB2_Material.006_Emissive.png');
              emissiveTexture.encoding = THREE.sRGBEncoding;
              c.material.emissiveMap = emissiveTexture;
              c.material.emissive = new THREE.Color(0x444444);
              
              c.material.needsUpdate = true;
            } else {
              // Load monster textures
              const texLoader = new THREE.TextureLoader();
              const texture = texLoader.load(
                  './resources/monsters/Textures/' + this._params.resourceTexture);
              texture.encoding = THREE.sRGBEncoding;
              texture.flipY = true;
              c.material.map = texture;
              c.material.side = THREE.DoubleSide;
            }
          }
        });

        this._mixer = new THREE.AnimationMixer(this._target);

        if (this._params.isIA001) {
          // IA001 uses real FBX animations from Animation.fbx
          const fbx = this._target;
          const _FindAnim = (animName) => {
            for (let i = 0; i < fbx.animations.length; i++) {
              console.log('Available animation:', fbx.animations[i].name);
              if (fbx.animations[i].name.toLowerCase().includes(animName.toLowerCase())) {
                const clip = fbx.animations[i];
                const action = this._mixer.clipAction(clip);
                action.setLoop(THREE.LoopRepeat);
                return {
                  clip: clip,
                  action: action
                }
              }
            }
            return null;
          };

          // Try to find IA001 animations - using common animation names
          this._animations['idle'] = _FindAnim('idle') || _FindAnim('stand') || _FindAnim('default') || (fbx.animations.length > 0 ? { clip: fbx.animations[0], action: this._mixer.clipAction(fbx.animations[0]) } : null);
          this._animations['walk'] = _FindAnim('walk') || _FindAnim('run') || _FindAnim('move') || _FindAnim('march') || (fbx.animations.length > 0 ? { clip: fbx.animations[0], action: this._mixer.clipAction(fbx.animations[0]) } : null);
          this._animations['death'] = _FindAnim('death') || _FindAnim('die') || this._animations['idle'];
          this._animations['attack'] = _FindAnim('attack') || _FindAnim('punch') || _FindAnim('hit') || this._animations['idle'];
          
          // Start with walk animation if available
          if (this._animations['walk'] && this._animations['walk'].action) {
            this._animations['walk'].action.play();
          }
          
          console.log('IA001 animations loaded:', this._animations);
          console.log('Total animations available:', fbx.animations.length);
        } else if (this._params.isRobot) {
          // Other robots use procedural animations (no FBX animations)
          this._animations['idle'] = { clip: null, action: null };
          this._animations['walk'] = { clip: null, action: null };
          this._animations['death'] = { clip: null, action: null };
          this._animations['attack'] = { clip: null, action: null };
        } else {
          // Monsters use FBX animations
          const fbx = this._target;
          const _FindAnim = (animName) => {
            for (let i = 0; i < fbx.animations.length; i++) {
              if (fbx.animations[i].name.includes(animName)) {
                const clip = fbx.animations[i];
                const action = this._mixer.clipAction(clip);
                return {
                  clip: clip,
                  action: action
                }
              }
            }
            return null;
          };

          this._animations['idle'] = _FindAnim('Idle');
          this._animations['walk'] = _FindAnim('Walk');
          this._animations['death'] = _FindAnim('Death');
          this._animations['attack'] = _FindAnim('Bite_Front');
        }

        // Set initial state - IA001 starts walking, others start idle
        if (this._params.isIA001) {
          this._stateMachine.SetState('walk');
        } else {
          this._stateMachine.SetState('idle');
        }
      });
    }

    get Position() {
      return this._position;
    }

    get Rotation() {
      if (!this._target) {
        return new THREE.Quaternion();
      }
      return this._target.quaternion;
    }

    _FindIntersections(pos) {
      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(2);
      const collisions = [];

      for (let i = 0; i < nearby.length; ++i) {
        const e = nearby[i].entity;
        const d = ((pos.x - e._position.x) ** 2 + (pos.z - e._position.z) ** 2) ** 0.5;

        // Simple collision detection with other objects
        if (d <= 4) {
          collisions.push(nearby[i].entity);
        }
      }
      return collisions;
    }

    _FindPlayer(pos) {
      const _IsPlayer = (c) => {
        // Simple check - just look for entity named 'player'
        return c.entity.Name === 'player';
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(100).filter(c => _IsPlayer(c));

      if (nearby.length == 0) {
        return new THREE.Vector3(0, 0, 0);
      }

      const dir = this._parent._position.clone();
      dir.sub(nearby[0].entity._position);
      dir.y = 0.0;
      dir.normalize();

      return dir;
    }

    _UpdateAI(timeInSeconds) {
      const currentState = this._stateMachine._currentState;
      if (currentState.Name != 'walk' &&
          currentState.Name != 'run' &&
          currentState.Name != 'idle') {
        return;
      }

      if (currentState.Name == 'death') {
        return;
      }

      // For IA001, always be walking
      if (this._params.isIA001) {
        if (currentState.Name == 'idle') {
          this._stateMachine.SetState('walk');
        }
        this._OnAIWalk(timeInSeconds);
      } else if (currentState.Name == 'idle' ||
          currentState.Name == 'walk') {
        this._OnAIWalk(timeInSeconds);
      }
    }

    _OnAIWalk(timeInSeconds) {
      if (this._params.isIA001) {
        // IA001 follows the player
        this._IA001FollowPlayerAI(timeInSeconds);
      } else if (this._params.isRobot) {
        // Other robots patrol
        this._RobotPatrolAI(timeInSeconds);
      } else {
        // Original monster AI (follow player)
        this._MonsterFollowAI(timeInSeconds);
      }
    }

    _IA001FollowPlayerAI(timeInSeconds) {
      // Check distance to player
      const playerDistance = this._GetDistanceToPlayer();
      const followDistance = 15; // Follow player when within 15 units
      
      if (playerDistance > 0 && playerDistance <= followDistance) {
        // Player is close - follow behavior
        this._IA001FollowBehavior(timeInSeconds);
      } else {
        // Player is far - random movement behavior
        this._IA001RandomBehavior(timeInSeconds);
      }
    }

    _GetDistanceToPlayer() {
      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(100);
      
      for (let i = 0; i < nearby.length; i++) {
        const e = nearby[i].entity;
        if (e.Name === 'player') {
          const dx = this._position.x - e._position.x;
          const dz = this._position.z - e._position.z;
          return Math.sqrt(dx * dx + dz * dz);
        }
      }
      return -1; // Player not found
    }

    _IA001FollowBehavior(timeInSeconds) {
      const dirToPlayer = this._FindPlayer();

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
  
      this._input._keys.forward = false;

      const acc = this._acceleration;
      if (dirToPlayer.length() == 0) {
        return;
      }

      // Move towards player
      this._input._keys.forward = true;
      velocity.z += acc.z * timeInSeconds;

      // Look at player
      const m = new THREE.Matrix4();
      m.lookAt(
          new THREE.Vector3(0, 0, 0),
          dirToPlayer,
          new THREE.Vector3(0, 1, 0));
      const q = new THREE.Quaternion();
      q.setFromRotationMatrix(m);
      if (!controlObject.quaternion.equals(q)) {
        const step = 1.0 - Math.pow(0.001, timeInSeconds);
        controlObject.quaternion.slerp(q, step);
      }

      // Move forward in facing direction
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

      // Keep IA001 above ground
      pos.y = 4.0;

      const collisions = this._FindIntersections(pos);
      if (collisions.length > 0) {
        this._input._keys.space = true;
        this._input._keys.forward = false;
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);
  
      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }

    _IA001RandomBehavior(timeInSeconds) {
      // Initialize random movement data if needed
      if (!this._randomData) {
        this._randomData = {
          direction: Math.random() * Math.PI * 2, // Random initial direction
          moveTime: 0,
          maxMoveTime: 3 + Math.random() * 4, // Move for 3-7 seconds
          turnTime: 0,
          maxTurnTime: 1 + Math.random() * 2  // Turn for 1-3 seconds
        };
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

      this._input._keys.forward = false;

      const acc = this._acceleration;

      // Update timers
      this._randomData.moveTime += timeInSeconds;
      this._randomData.turnTime += timeInSeconds;

      // Check if should change direction
      if (this._randomData.turnTime >= this._randomData.maxTurnTime) {
        this._randomData.direction = Math.random() * Math.PI * 2;
        this._randomData.turnTime = 0;
        this._randomData.maxTurnTime = 1 + Math.random() * 2;
      }

      // Move forward
      if (this._randomData.moveTime < this._randomData.maxMoveTime) {
        this._input._keys.forward = true;
        velocity.z += acc.z * timeInSeconds * 0.5; // Slower than following
      } else {
        // Pause occasionally
        if (this._randomData.moveTime >= this._randomData.maxMoveTime + 2) {
          this._randomData.moveTime = 0;
          this._randomData.maxMoveTime = 3 + Math.random() * 4;
        }
      }

      // Turn towards random direction
      const targetQ = new THREE.Quaternion();
      targetQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._randomData.direction);
      
      if (!controlObject.quaternion.equals(targetQ)) {
        const step = 1.0 - Math.pow(0.1, timeInSeconds);
        controlObject.quaternion.slerp(targetQ, step);
      }

      // Move forward in facing direction
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

      // Keep IA001 above ground
      pos.y = 4.0;

      const collisions = this._FindIntersections(pos);
      if (collisions.length > 0) {
        // Hit obstacle - change direction
        this._randomData.direction = Math.random() * Math.PI * 2;
        this._randomData.turnTime = 0;
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);
  
      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }

    _RobotPatrolAI(timeInSeconds) {
      // Initialize patrol data if needed
      if (!this._patrolData) {
        this._patrolData = {
          startPos: this._position.clone(),
          direction: 1, // 1 for forward, -1 for backward
          patrolDistance: this._params.isIA001 ? 50 : 30, // IA001 patrols longer distances
          currentDistance: 0
        };
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

      // Simple patrol: move forward, then reverse when reaching distance limit
      this._input._keys.forward = true;
      
      const acc = this._acceleration;
      velocity.z += acc.z * timeInSeconds * this._patrolData.direction;

      // Check if need to turn around
      this._patrolData.currentDistance += Math.abs(velocity.z * timeInSeconds);
      if (this._patrolData.currentDistance >= this._patrolData.patrolDistance) {
        this._patrolData.direction *= -1;
        this._patrolData.currentDistance = 0;
        
        // Turn around
        _A.set(0, 1, 0);
        _Q.setFromAxisAngle(_A, Math.PI);
        _R.multiply(_Q);
      }
    }

    _MonsterFollowAI(timeInSeconds) {
      const dirToPlayer = this._FindPlayer();

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
  
      this._input._keys.forward = false;

      const acc = this._acceleration;
      if (dirToPlayer.length() == 0) {
        return;
      }

      this._input._keys.forward = true;
      velocity.z += acc.z * timeInSeconds;

      const m = new THREE.Matrix4();
      m.lookAt(
          new THREE.Vector3(0, 0, 0),
          dirToPlayer,
          new THREE.Vector3(0, 1, 0));
      _R.setFromRotationMatrix(m);
  
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
        this._input._keys.space = true;
        this._input._keys.forward = false;
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);
  
      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) {
        return;
      }

      this._input._keys.space = false;
      this._input._keys.forward = false;

      // Check if in turn-based combat mode - disable AI
      const combatSystem = this._parent._parent.Get('combat-system');
      if (combatSystem && combatSystem.GetComponent('CombatSystem').IsInCombat) {
        // Only update animations during turn-based combat, skip AI
        if (this._mixer) {
          this._mixer.update(timeInSeconds);
        }
        return;
      }

      this._UpdateAI(timeInSeconds);

      this._stateMachine.Update(timeInSeconds, this._input);

      // IA001 specific animation handling
      if (this._params.isIA001 && this._target) {
        const currentState = this._stateMachine._currentState.Name;
        if (currentState === 'walk' && this._animations['walk'] && this._animations['walk'].action) {
          if (!this._animations['walk'].action.isRunning()) {
            this._animations['walk'].action.reset().play();
          }
        }
        // Ensure IA001 stays above ground
        this._target.position.y = 2.8;
      }

      // Robot procedural animations (only for non-IA001 robots)
      if (this._params.isRobot && !this._params.isIA001 && this._target) {
        const time = Date.now() * 0.001;
        const currentState = this._stateMachine._currentState.Name;
        
        if (currentState === 'walk') {
          // Walking animation: floating + slight bobbing + rotation
          this._target.position.y = 2.0 + Math.sin(time * 4) * 0.3;
          this._target.rotation.z = Math.sin(time * 3) * 0.1; // Side to side
        } else {
          // Idle animation: gentle floating + slow rotation
          this._target.position.y = 2.0 + Math.sin(time * 2) * 0.2;
          this._target.rotation.y += timeInSeconds * 0.3;
        }
      }

      // HARDCODED
      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }
      
      if (this._mixer) {
        this._mixer.update(timeInSeconds);
      }
    }
  };

  return {
    NPCController: NPCController,
  };

})();