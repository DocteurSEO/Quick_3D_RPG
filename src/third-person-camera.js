import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import {entity} from './entity.js';


export const third_person_camera = (() => {
  
  class ThirdPersonCamera extends entity.Component {
    constructor(params) {
      super();

      this._params = params;
      this._camera = params.camera;

      this._currentPosition = new THREE.Vector3();
      this._currentLookat = new THREE.Vector3();
      this._enabled = true;
      
      // Mouse controls
      this._phi = 0;
      this._theta = 0;
      this._mouseX = 0;
      this._mouseY = 0;
      this._isMouseDown = false;
      
      // Optimisations de performance
      this._updateCounter = 0;
      this._lastPosition = new THREE.Vector3();
      this._lastLookat = new THREE.Vector3();
      this._positionThreshold = 0.01; // Seuil de changement minimum
      
      this._InitMouseControls();
    }
    
    _InitMouseControls() {
      document.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left mouse button
          this._isMouseDown = true;
          this._mouseX = e.clientX;
          this._mouseY = e.clientY;
        }
      });
      
      document.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          this._isMouseDown = false;
        }
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!this._isMouseDown) return;
        
        const deltaX = e.clientX - this._mouseX;
        const deltaY = e.clientY - this._mouseY;
        
        this._phi += deltaX * 0.01;
        this._theta = Math.max(-Math.PI/3, Math.min(Math.PI/3, this._theta + deltaY * 0.01));
        
        this._mouseX = e.clientX;
        this._mouseY = e.clientY;
      });
      
      // Prevent context menu on right click
      document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    _CalculateIdealOffset() {
      const distance = 15;
      const height = 10 + this._theta * 5;
      
      const idealOffset = new THREE.Vector3(
        distance * Math.sin(this._phi),
        height,
        distance * Math.cos(this._phi)
      );
      
      idealOffset.add(this._params.target._position);
      return idealOffset;
    }

    _CalculateIdealLookat() {
      const idealLookat = new THREE.Vector3();
      idealLookat.copy(this._params.target._position);
      idealLookat.y += 5; // Look slightly above the robot
      return idealLookat;
    }

    Update(timeElapsed) {
      if (this._enabled === false) return;
      
      this._updateCounter++;
      
      // Mise à jour chaque frame pour la fluidité
      
      const idealOffset = this._CalculateIdealOffset();
      const idealLookat = this._CalculateIdealLookat();

      // const t = 0.05;
      // const t = 4.0 * timeElapsed;
      // Utilisation du facteur d'interpolation de la configuration pour plus de réactivité
      const t = 0.15; // Facteur d'interpolation plus rapide pour haute performance
      this._currentPosition.lerp(idealOffset, t);
      this._currentLookat.lerp(idealLookat, t);

      // Mise à jour de la caméra chaque frame pour la fluidité
      this._camera.position.copy(this._currentPosition);
      this._camera.lookAt(this._currentLookat);
      
      this._lastPosition.copy(this._currentPosition);
      this._lastLookat.copy(this._currentLookat);
    }
  }

  return {
    ThirdPersonCamera: ThirdPersonCamera
  };

})();