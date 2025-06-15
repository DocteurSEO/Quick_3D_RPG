import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import {third_person_camera} from './third-person-camera.js';
import {entity_manager} from './entity-manager.js';
import {player_entity} from './player-entity.js'
import {entity} from './entity.js';
import {gltf_component} from './gltf-component.js';
import {health_component} from './health-component.js';
import {player_input} from './player-input.js';
import {npc_entity} from './npc-entity.js';
import {math} from './math.js';
import {spatial_hash_grid} from './spatial-hash-grid.js';
import {ui_controller} from './ui-controller.js';
import {health_bar} from './health-bar.js';
import {level_up_component} from './level-up-component.js';
import {quest_component} from './quest-component.js';
import {spatial_grid_controller} from './spatial-grid-controller.js';
import {inventory_controller} from './inventory-controller.js';
import {equip_weapon_component} from './equip-weapon-component.js';
import {attack_controller} from './attacker-controller.js';
import {combat_system} from './combat-system.js';
import {mode_selector} from './mode-selector.js';
import {combat_system_adapter} from './combat-system-adapter.js';
import {combat_system_patch} from './combat-system-patch.js';
import {game_modes_config} from './game-modes-config.js';
import {audio_helper} from './audio-helper.js';
import {combat_system_simple_fix} from './combat-system-simple-fix.js';
import {mobile_controls} from './mobile-controls.js';
import {gamepad_controller} from './gamepad-controller.js';
import {quiz_database_replacer} from './quiz-database-replacer.js';
import {spatial_audio_demo} from './spatial-audio-demo.js';
import {ia001_audio_system} from './ia001-audio-system.js';
import {PerformanceConfig, isLowEndDevice, applyLowEndSettings} from './performance-config.js';
import {FPSMonitor} from './fps-monitor.js';


const _VS = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;


const _FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {
  float h = normalize( vWorldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;



class HackNSlashDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    // Initialiser le moniteur FPS
    this._fpsMonitor = new FPSMonitor();
    
    // Détecter et appliquer les paramètres pour appareils faibles
    if (isLowEndDevice()) {
      applyLowEndSettings();
      console.log('Appareil faible détecté - paramètres optimisés appliqués');
    }
    // Optimisations de performance
    this._needsRender = true;
    this._isLowEndDevice = this._DetectLowEndDevice();
    
    // Configuration du rendu haute performance
    this._threejs = new THREE.WebGLRenderer({
      antialias: !this._isLowEndDevice, // Antialiasing activé sauf sur appareils très faibles
      powerPreference: "high-performance"
    });
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.gammaFactor = 2.2;
    this._threejs.shadowMap.enabled = !this._isLowEndDevice;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.shadowMap.autoUpdate = true;
    // Support des écrans haute résolution
    this._threejs.setPixelRatio(Math.min(window.devicePixelRatio, this._isLowEndDevice ? 1 : 3));
    this._threejs.setSize(window.innerWidth, window.innerHeight);
    this._threejs.domElement.id = 'threejs';

    document.getElementById('container').appendChild(this._threejs.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 10000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(25, 10, 25);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xFFFFFF);
    this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

    let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(-10, 500, 10);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    // Configuration des ombres haute qualité
    if (!this._isLowEndDevice) {
      light.shadow.mapSize.width = 4096; // Qualité d'ombres maximale
      light.shadow.mapSize.height = 4096;
    } else {
      light.shadow.mapSize.width = 2048; // Qualité améliorée même pour low-end
      light.shadow.mapSize.height = 2048;
    }
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 1000.0;
    light.shadow.camera.left = 100;
    light.shadow.camera.right = -100;
    light.shadow.camera.top = 100;
    light.shadow.camera.bottom = -100;
    this._scene.add(light);

    this._sun = light;

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(5000, 5000, 10, 10),
        new THREE.MeshStandardMaterial({
            color: 0x1e601c,
          }));
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);

    this._entityManager = new entity_manager.EntityManager();
    this._grid = new spatial_hash_grid.SpatialHashGrid(
        [[-1000, -1000], [1000, 1000]], [100, 100]);

    this._LoadControllers();
    this._InitializeModeSystem();
    this._LoadPlayer();
    this._LoadFoliage();
    this._LoadClouds();
    this._LoadSky();

    this._previousRAF = null;
    this._RAF();
  }

  _LoadControllers() {
    // Combat system will be loaded after player
  }

  _InitializeModeSystem() {
    console.log('🎮 Initialisation du système de modes de jeu');
    
    // Initialiser le mode par défaut (enfant)
    const { GameModesConfig } = game_modes_config;
    console.log(`📚 Mode par défaut: ${GameModesConfig.currentMode}`);
    
    // Créer le sélecteur de mode
    const modeEntity = new entity.Entity();
    modeEntity.AddComponent(new mode_selector.ModeSelector());
    this._entityManager.Add(modeEntity, 'mode-selector');
    
    // Initialiser l'adaptateur de système de combat
    combat_system_adapter.init();
    
    // Appliquer le patch pour remplacer quiz_database
    combat_system_patch.applyPatch();
    
    // Initialiser l'audio helper
    audio_helper.init();
    audio_helper.setMode('children');
    
    // Initialiser l'audio d'ambiance
    this._InitAmbianceAudio();
    
    // Appliquer la correction simple et directe
    combat_system_simple_fix.applyFix();
    
    // Ajouter les contrôles mobiles
    this._InitMobileControls();
    
    // Ajouter le contrôleur de manettes
    this._InitGamepadController();
    
    // Forcer l'application du mode enfant par défaut
    this._ApplyChildrenModeOnStartup();
  }

  _ApplyChildrenModeOnStartup() {
    console.log('🧒 Application du mode enfant au démarrage');
    
    // Attendre que le DOM soit prêt et appliquer les modifications
    setTimeout(() => {
      // Masquer les éléments de code immédiatement
      const codeElements = [
        '.menu-option[data-action="code"]',
        '.code-interface',
        '#code-container',
        '.programming-section',
        '[data-code-related="true"]'
      ];
      
      codeElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.style.display = 'none';
          element.setAttribute('data-hidden-mode', 'children');
          console.log(`🚫 Élément masqué: ${selector}`);
        });
      });
      
      // Masquer spécifiquement l'option CODE du menu de combat
      setTimeout(() => {
        const codeMenuOptions = document.querySelectorAll('.menu-option');
        codeMenuOptions.forEach(option => {
          const text = option.textContent || option.innerText || '';
          if (text.includes('CODE') || text.includes('code')) {
            option.style.display = 'none';
            option.setAttribute('data-hidden-mode', 'children');
            console.log(`🚫 Option CODE masquée du menu`);
          }
        });
      }, 1000);
      
      // Ajouter la classe de mode enfant au body
      document.body.classList.add('mode-children');
      document.body.classList.remove('mode-adults');
      
      // Déclencher l'événement de changement de mode
      document.dispatchEvent(new CustomEvent('mode-changed', {
        detail: { mode: 'children' }
      }));
      
      console.log('✅ Mode enfant appliqué avec succès');
    }, 100);
  }

  _InitMobileControls() {
    console.log('📱 Initialisation des contrôles mobiles');
    
    // Créer l'entité pour les contrôles mobiles
    const mobileControlsEntity = new entity.Entity();
    mobileControlsEntity.AddComponent(new mobile_controls.MobileControls());
    this._entityManager.Add(mobileControlsEntity, 'mobile-controls');
  }

  _InitGamepadController() {
    console.log('🎮 Initialisation du contrôleur de manettes');
    
    // Créer l'entité pour le contrôleur de manettes
    const gamepadEntity = new entity.Entity();
    gamepadEntity.AddComponent(new gamepad_controller.GamepadController());
    this._entityManager.Add(gamepadEntity, 'gamepad-controller');
  }

  _LoadSky() {
    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFFFFFFF, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    this._scene.add(hemiLight);

    const uniforms = {
      "topColor": { value: new THREE.Color(0x0077ff) },
      "bottomColor": { value: new THREE.Color(0xffffff) },
      "offset": { value: 33 },
      "exponent": { value: 0.6 }
    };
    uniforms["topColor"].value.copy(hemiLight.color);

    this._scene.fog.color.copy(uniforms["bottomColor"].value);

    const skyGeo = new THREE.SphereBufferGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: _VS,
        fragmentShader: _FS,
        side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(sky);
  }

  _LoadClouds() {
    for (let i = 0; i < 20; ++i) {
      const index = math.rand_int(1, 3);
    const pos = new THREE.Vector3(
        (Math.random() * 2.0 - 1.0) * 500,
        100,
        (Math.random() * 2.0 - 1.0) * 500);

      const e = new entity.Entity();
      e.AddComponent(new gltf_component.StaticModelComponent({
        scene: this._scene,
        resourcePath: './resources/nature2/GLTF/',
        resourceName: 'Cloud' + index + '.glb',
        position: pos,
        scale: Math.random() * 5 + 10,
        emissive: new THREE.Color(0x808080),
      }));
      e.SetPosition(pos);
      this._entityManager.Add(e);
      e.SetActive(false);
    }
  }

  _LoadFoliage() {
    for (let i = 0; i < 100; ++i) {
      const names = [
          'CommonTree_Dead', 'CommonTree',
          'BirchTree', 'BirchTree_Dead',
          'Willow', 'Willow_Dead',
          'PineTree',
      ];
      const name = names[math.rand_int(0, names.length - 1)];
      const index = math.rand_int(1, 5);

      const pos = new THREE.Vector3(
          (Math.random() * 2.0 - 1.0) * 500,
          0,
          (Math.random() * 2.0 - 1.0) * 500);

      const e = new entity.Entity();
      e.AddComponent(new gltf_component.StaticModelComponent({
        scene: this._scene,
        resourcePath: './resources/nature/FBX/',
        resourceName: name + '_' + index + '.fbx',
        scale: 0.25,
        emissive: new THREE.Color(0x000000),
        specular: new THREE.Color(0x000000),
        receiveShadow: true,
        castShadow: true,
      }));
      e.AddComponent(
          new spatial_grid_controller.SpatialGridController({grid: this._grid}));
      e.SetPosition(pos);
      this._entityManager.Add(e);
      e.SetActive(false);
    }
  }

  _LoadPlayer() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    };

    // All other characters, weapons, and systems removed

    const player = new entity.Entity();
    player.AddComponent(new player_input.BasicCharacterControllerInput(params));
    player.AddComponent(new player_entity.BasicCharacterController(params));
    player.AddComponent(
        new spatial_grid_controller.SpatialGridController({grid: this._grid}));
    this._entityManager.Add(player, 'player');

    const camera = new entity.Entity();
    camera.AddComponent(
        new third_person_camera.ThirdPersonCamera({
            camera: this._camera,
            target: this._entityManager.Get('player')}));
    this._entityManager.Add(camera, 'player-camera');
    
    // Add combat system for turn-based combat with IA001
    const combatEntity = new entity.Entity();
    combatEntity.AddComponent(new combat_system.CombatSystem({
      camera: this._camera,
      target: this._entityManager.Get('player'),
      scene: this._scene
    }));
    this._entityManager.Add(combatEntity, 'combat-system');
    
    // Add 10 IA001 robots positioned randomly around the player
    this._SpawnIA001Robots();
  }
/// TODO : Nombre enemis
  _SpawnIA001Robots() {
    const playerPosition = new THREE.Vector3(0, 0, 0); // Player starts at origin
    const minDistance = 100; // Distance minimale du joueur (augmentée)
    const maxDistance = 1180; // Distance maximale du joueur (augmentée)
    
    for (let i = 0; i < 25; i++) {
      // Générer une position aléatoire autour du joueur
      const angle = Math.random() * Math.PI * 2; // Angle aléatoire
      const distance = minDistance + Math.random() * (maxDistance - minDistance); // Distance aléatoire
      
      const x = playerPosition.x + Math.cos(angle) * distance;
      const z = playerPosition.z + Math.sin(angle) * distance;
      const y = 0; // Hauteur au sol
      
      // Créer l'entité IA001
      const ia001 = new entity.Entity();
      ia001.AddComponent(new npc_entity.NPCController({
          camera: this._camera,
          scene: this._scene,
          resourceName: 'Animation.fbx',  // IA001 specific model
          resourcePath: './resources/ia001/source/',
          texturesPath: './resources/ia001/textures/',
          name: `IA001_${i + 1}`, // Nom unique pour chaque IA001
          isIA001: true  // Flag to use IA001-specific behavior
      }));
      ia001.AddComponent(
          new spatial_grid_controller.SpatialGridController({grid: this._grid}));
      ia001.SetPosition(new THREE.Vector3(x, y, z));
      this._entityManager.Add(ia001, `ia001_${i + 1}`);
      
      console.log(`🤖 IA001_${i + 1} spawned at position (${x.toFixed(1)}, ${y}, ${z.toFixed(1)})`);
    }
    
    console.log('✅ 10 IA001 robots spawned randomly around the player!');
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _UpdateSun() {
    const player = this._entityManager.Get('player');
    const pos = player._position;

    this._sun.position.copy(pos);
    this._sun.position.add(new THREE.Vector3(-10, 500, -10));
    this._sun.target.position.copy(pos);
    this._sun.updateMatrixWorld();
    this._sun.target.updateMatrixWorld();
  }

  async _InitAmbianceAudio() {
    try {
      // Charger la liste des fichiers audio d'ambiance
      const response = await fetch('/resources/audios/ambiance/data.json');
      const ambianceSounds = await response.json();
      
      if (ambianceSounds.length === 0) {
        console.log('🔇 Aucun fichier audio d\'ambiance trouvé');
        return;
      }
      
      // Variables pour gérer l'audio d'ambiance
      this._currentAmbianceAudio = null;
      this._ambianceSounds = ambianceSounds;
      this._currentAmbianceIndex = 0;
      
      // Démarrer la lecture d'ambiance après un délai
      setTimeout(() => {
        this._PlayNextAmbianceSound();
      }, 2000); // Attendre 2 secondes après le chargement
      
      console.log('🎵 Système audio d\'ambiance initialisé avec', ambianceSounds.length, 'fichiers');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de l\'audio d\'ambiance:', error);
    }
  }
  
  _PlayNextAmbianceSound() {
    // Vérifier si l'audio est activé (utiliser le même système que le combat)
    const audioEnabled = localStorage.getItem('combatAudioEnabled');
    if (audioEnabled === 'false') {
      console.log('🔇 Audio d\'ambiance désactivé');
      return;
    }
    
    if (!this._ambianceSounds || this._ambianceSounds.length === 0) return;
    
    // Arrêter l'audio précédent s'il existe
    if (this._currentAmbianceAudio) {
      this._currentAmbianceAudio.pause();
      this._currentAmbianceAudio.currentTime = 0;
    }
    
    // Sélectionner le fichier audio actuel
    const selectedSound = this._ambianceSounds[this._currentAmbianceIndex];
    
    // Créer et jouer l'audio
    this._currentAmbianceAudio = new Audio(`/resources/audios/ambiance/${selectedSound}`);
    this._currentAmbianceAudio.volume = 0.3; // Volume à 50% pour l'ambiance
    
    // Quand l'audio se termine, passer au suivant
    this._currentAmbianceAudio.addEventListener('ended', () => {
      this._currentAmbianceIndex = (this._currentAmbianceIndex + 1) % this._ambianceSounds.length;
      setTimeout(() => {
        this._PlayNextAmbianceSound();
      }, 1000); // Pause de 1 seconde entre les pistes
    });
    
    // Gérer les erreurs
    this._currentAmbianceAudio.addEventListener('error', (error) => {
      console.error('❌ Erreur lors de la lecture de l\'audio d\'ambiance:', error);
      // Passer au fichier suivant en cas d'erreur
      this._currentAmbianceIndex = (this._currentAmbianceIndex + 1) % this._ambianceSounds.length;
      setTimeout(() => {
        this._PlayNextAmbianceSound();
      }, 2000);
    });
    
    console.log(`🎵 Lecture audio d'ambiance: ${selectedSound}`);
    this._currentAmbianceAudio.play().catch(error => {
      console.error('❌ Impossible de jouer l\'audio d\'ambiance:', error);
    });
  }
  
  _StopAmbianceAudio() {
    if (this._currentAmbianceAudio) {
      this._currentAmbianceAudio.pause();
      this._currentAmbianceAudio.currentTime = 0;
      this._currentAmbianceAudio = null;
      console.log('🔇 Audio d\'ambiance arrêté');
    }
  }

  _RAF() {
    requestAnimationFrame((t) => {
      // Mettre à jour le moniteur FPS
      this._fpsMonitor.update();
      
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      const deltaTime = t - this._previousRAF;
      
      // Limiter le FPS selon la configuration
      const targetFrameTime = 1000 / PerformanceConfig.rendering.maxFPS;
      if (deltaTime < targetFrameTime) {
        this._RAF();
        return;
      }

      this._RAF();

      // Rendu haute performance sans limitation FPS artificielle
      const targetFPS = PerformanceConfig.rendering.maxFPS;
      const frameTime = 1000 / targetFPS;
      
      // Rendu à la fréquence maximale pour les appareils puissants
      if (deltaTime >= frameTime || targetFPS >= 120) {
        this._threejs.render(this._scene, this._camera);
      }
      
      this._frameCount = (this._frameCount || 0) + 1;
      this._Step(deltaTime);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = Math.min(1.0 / 30.0, timeElapsed * 0.001);

    this._UpdateSun();

    this._entityManager.Update(timeElapsedS);
    
    // Marquer qu'un nouveau rendu est nécessaire
    this._needsRender = true;
  }
  
  // Détection des appareils faibles pour ajuster les paramètres
  _DetectLowEndDevice() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Détecter les GPU mobiles ou faibles
        return renderer.includes('Mali') || renderer.includes('Adreno') || 
               renderer.includes('PowerVR') || renderer.includes('Tegra');
      }
    }
    
    // Fallback: détecter selon la mémoire disponible
    return navigator.deviceMemory && navigator.deviceMemory < 4;
  }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new HackNSlashDemo();
  // Exposer l'instance globalement pour que d'autres systèmes puissent y accéder
  window._APP = _APP;
});

// Exposer aussi la classe pour les tests
window.HackNSlashDemo = HackNSlashDemo;
