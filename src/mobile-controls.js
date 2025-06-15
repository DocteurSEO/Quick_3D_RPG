// Contrôles tactiles pour écrans mobiles
// Joystick virtuel pour déplacer le personnage

import { entity } from './entity.js';

export const mobile_controls = (() => {
  
  class MobileControls extends entity.Component {
    constructor(params) {
      super();
      this._params = params || {};
      this._isMobile = this._detectMobile();
      this._joystickContainer = null;
      this._joystickKnob = null;
      this._isActive = false;
      this._startPos = { x: 0, y: 0 };
      this._currentPos = { x: 0, y: 0 };
      this._maxDistance = 50;
      this._inputState = {
        forward: false,
        backward: false,
        left: false,
        right: false
      };
      
      // État audio
      this._audioMuted = false;
      
      if (this._isMobile) {
        this._Init();
      }
    }
    
    _detectMobile() {
      // Détecter si on est sur mobile/tablette ou forcer pour debug
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
             || ('ontouchstart' in window) 
             || (navigator.maxTouchPoints > 0);
             
      // Permettre de forcer l'affichage des contrôles pour debug
      const forceEnable = localStorage.getItem('forceMobileControls') === 'true';
      
      return isMobileDevice || forceEnable;
    }
    
    _Init() {
      console.log('📱 Initialisation des contrôles mobiles');
      this._CreateJoystick();
      this._CreateAudioButton();
      this._AttachEvents();
    }
    
    _CreateAudioButton() {
      // Bouton de contrôle audio
      const audioButton = document.createElement('div');
      audioButton.id = 'mobile-audio-button';
      audioButton.innerHTML = '🔊';
      audioButton.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.7);
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
        user-select: none;
        touch-action: manipulation;
        z-index: 1000;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      `;
      
      // Événements tactiles pour le bouton audio
      audioButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        audioButton.style.transform = 'scale(0.9)';
        audioButton.style.background = 'rgba(255, 255, 255, 0.2)';
      });
      
      audioButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        audioButton.style.transform = 'scale(1)';
        audioButton.style.background = 'rgba(0, 0, 0, 0.7)';
        this._ToggleAudio();
      });
      
      document.body.appendChild(audioButton);
    }
    
    _ToggleAudio() {
      this._audioMuted = !this._audioMuted;
      const audioButton = document.getElementById('mobile-audio-button');
      
      // Mettre à jour l'apparence du bouton
      if (audioButton) {
        audioButton.innerHTML = this._audioMuted ? '🔇' : '🔊';
        audioButton.style.borderColor = this._audioMuted ? '#ff4444' : '#00ff00';
      }
      
      // Utiliser le système audio spatial global si disponible
      if (window.combatSystemInstance && window.combatSystemInstance._spatialAudio) {
        const spatialAudio = window.combatSystemInstance._spatialAudio;
        if (spatialAudio.ToggleMute) {
          const isMuted = spatialAudio.ToggleMute();
          this._audioMuted = isMuted;
          
          // Mettre à jour le bouton avec l'état réel
          if (audioButton) {
            audioButton.innerHTML = isMuted ? '🔇' : '🔊';
            audioButton.style.borderColor = isMuted ? '#ff4444' : '#00ff00';
          }
        }
      }
      
      // Contrôler tous les autres contextes audio
      const audioContexts = [];
      
      // Chercher tous les contextes audio dans le DOM
      if (window.AudioContext || window.webkitAudioContext) {
        // Suspendre/reprendre les nouveaux contextes audio créés
        try {
          const testContext = new (window.AudioContext || window.webkitAudioContext)();
          if (this._audioMuted) {
            if (testContext.state === 'running') {
              testContext.suspend();
            }
          } else {
            if (testContext.state === 'suspended') {
              testContext.resume();
            }
          }
          testContext.close();
        } catch (e) {
          console.warn('Impossible de contrôler le contexte audio:', e);
        }
      }
      
      // Contrôler tous les éléments audio/vidéo HTML
      const audioElements = document.querySelectorAll('audio, video');
      audioElements.forEach(element => {
        element.muted = this._audioMuted;
      });
      
      // Stocker l'état global
      window.audioMuted = this._audioMuted;
      
      console.log(`Audio ${this._audioMuted ? 'coupé' : 'activé'}`);
    }
    
    _CreateJoystick() {
      // Conteneur du joystick
      this._joystickContainer = document.createElement('div');
      this._joystickContainer.id = 'mobile-joystick-container';
      this._joystickContainer.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 30px;
        width: 100px;
        height: 100px;
        background: rgba(255, 255, 255, 0.3);
        border: 3px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        z-index: 1000;
        touch-action: none;
        user-select: none;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
      `;
      
      // Bouton du joystick
      this._joystickKnob = document.createElement('div');
      this._joystickKnob.id = 'mobile-joystick-knob';
      this._joystickKnob.style.cssText = `
        width: 40px;
        height: 40px;
        background: rgba(255, 255, 255, 0.8);
        border: 2px solid rgba(255, 255, 255, 1);
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.1s ease;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      `;
      
      this._joystickContainer.appendChild(this._joystickKnob);
      document.body.appendChild(this._joystickContainer);
      
      // Ajouter des boutons d'action supplémentaires si nécessaire
      this._CreateActionButtons();
    }
    
    _CreateActionButtons() {
      // Bouton d'action (pour interagir)
      const actionButton = document.createElement('div');
      actionButton.id = 'mobile-action-button';
      actionButton.innerHTML = '⚔️';
      actionButton.style.cssText = `
        position: fixed;
        bottom: 120px;
        right: 20px;
        width: 80px;
        height: 80px;
        background: rgba(255, 100, 100, 0.8);
        border: 3px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        color: white;
        user-select: none;
        touch-action: manipulation;
        z-index: 1000;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(255, 100, 100, 0.3);
        cursor: pointer;
      `;
      
      // Bouton de course (sprint)
      const sprintButton = document.createElement('div');
      sprintButton.id = 'mobile-sprint-button';
      sprintButton.innerHTML = '🏃';
      sprintButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 70px;
        height: 70px;
        background: rgba(100, 255, 100, 0.8);
        border: 3px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        color: white;
        user-select: none;
        touch-action: manipulation;
        z-index: 1000;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(100, 255, 100, 0.3);
        cursor: pointer;
      `;
      
      document.body.appendChild(actionButton);
      document.body.appendChild(sprintButton);
      
      // Événements pour les boutons
      this._AttachButtonEvents(actionButton, sprintButton);
    }
    
    _AttachEvents() {
      // Événements tactiles pour le joystick
      this._joystickContainer.addEventListener('touchstart', (e) => this._OnTouchStart(e), { passive: false });
      document.addEventListener('touchmove', (e) => this._OnTouchMove(e), { passive: false });
      document.addEventListener('touchend', (e) => this._OnTouchEnd(e), { passive: false });
      
      // Événements souris pour test sur desktop
      this._joystickContainer.addEventListener('mousedown', (e) => this._OnMouseDown(e));
      document.addEventListener('mousemove', (e) => this._OnMouseMove(e));
      document.addEventListener('mouseup', (e) => this._OnMouseUp(e));
    }
    
    _AttachButtonEvents(actionButton, sprintButton) {
      // Bouton d'action
      actionButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        actionButton.style.transform = 'scale(0.9)';
        actionButton.style.background = 'rgba(255, 150, 150, 0.9)';
        actionButton.style.boxShadow = '0 2px 10px rgba(255, 100, 100, 0.5)';
        this._TriggerAction();
      });
      
      actionButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        actionButton.style.transform = 'scale(1)';
        actionButton.style.background = 'rgba(255, 100, 100, 0.8)';
        actionButton.style.boxShadow = '0 4px 20px rgba(255, 100, 100, 0.3)';
      });
      
      // Bouton de sprint
      sprintButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sprintButton.style.transform = 'scale(0.9)';
        sprintButton.style.background = 'rgba(150, 255, 150, 0.9)';
        sprintButton.style.boxShadow = '0 2px 10px rgba(100, 255, 100, 0.5)';
        this._SetSprint(true);
      });
      
      sprintButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        sprintButton.style.transform = 'scale(1)';
        sprintButton.style.background = 'rgba(100, 255, 100, 0.8)';
        sprintButton.style.boxShadow = '0 4px 20px rgba(100, 255, 100, 0.3)';
        this._SetSprint(false);
      });
    }
    
    _OnTouchStart(e) {
      e.preventDefault();
      const touch = e.touches[0];
      this._StartInput(touch.clientX, touch.clientY);
    }
    
    _OnTouchMove(e) {
      if (!this._isActive) return;
      e.preventDefault();
      const touch = e.touches[0];
      this._UpdateInput(touch.clientX, touch.clientY);
    }
    
    _OnTouchEnd(e) {
      e.preventDefault();
      this._EndInput();
    }
    
    _OnMouseDown(e) {
      e.preventDefault();
      this._StartInput(e.clientX, e.clientY);
    }
    
    _OnMouseMove(e) {
      if (!this._isActive) return;
      e.preventDefault();
      this._UpdateInput(e.clientX, e.clientY);
    }
    
    _OnMouseUp(e) {
      e.preventDefault();
      this._EndInput();
    }
    
    _StartInput(x, y) {
      this._isActive = true;
      this._startPos = { x, y };
      this._joystickKnob.style.transform = 'scale(1.1)';
      this._joystickKnob.style.background = 'rgba(255, 255, 255, 1)';
    }
    
    _UpdateInput(x, y) {
      if (!this._isActive) return;
      
      // Calculer la position relative au centre du joystick
      const rect = this._joystickContainer.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = x - centerX;
      const deltaY = y - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Limiter la distance
      const limitedDistance = Math.min(distance, this._maxDistance);
      const angle = Math.atan2(deltaY, deltaX);
      
      const knobX = Math.cos(angle) * limitedDistance;
      const knobY = Math.sin(angle) * limitedDistance;
      
      // Déplacer le bouton du joystick
      this._joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px) scale(1.1)`;
      
      // Calculer les directions (normaliser)
      const normalizedX = limitedDistance > 0 ? deltaX / this._maxDistance : 0;
      const normalizedY = limitedDistance > 0 ? deltaY / this._maxDistance : 0;
      
      // Seuil pour plus de réactivité
      const threshold = 0.3;
      
      this._inputState = {
        forward: normalizedY < -threshold,
        backward: normalizedY > threshold,
        left: normalizedX < -threshold,
        right: normalizedX > threshold
      };
      
      console.log('📱 Joystick input:', {
        deltaX: deltaX.toFixed(2),
        deltaY: deltaY.toFixed(2),
        normalizedX: normalizedX.toFixed(2),
        normalizedY: normalizedY.toFixed(2),
        distance: distance.toFixed(2),
        inputState: this._inputState
      });
      
      // Envoyer les inputs au système de jeu
      this._SendInputToGame();
    }
    
    _EndInput() {
      this._isActive = false;
      
      // Remettre le joystick au centre
      this._joystickKnob.style.transform = 'scale(1)';
      this._joystickKnob.style.background = 'rgba(255, 255, 255, 0.8)';
      
      // Arrêter tous les mouvements
      this._inputState = {
        forward: false,
        backward: false,
        left: false,
        right: false
      };
      
      this._SendInputToGame();
    }
    
    _SendInputToGame() {
      // Simuler les touches clavier pour le système existant
      this._SimulateKeyboard();
      
      // Alternative: modifier directement l'état des touches du joueur
      this._DirectInputUpdate();
      
      // Envoyer aussi via le système de messaging
      this.Broadcast({
        topic: 'input.mobile',
        forward: this._inputState.forward,
        backward: this._inputState.backward,
        left: this._inputState.left,
        right: this._inputState.right
      });
    }
    
    _DirectInputUpdate() {
      // Trouver le composant d'input du joueur et modifier directement ses touches
      const player = this._parent._parent.Get('player');
      if (player) {
        const inputComponent = player.GetComponent('BasicCharacterControllerInput');
        if (inputComponent && inputComponent._keys) {
          inputComponent._keys.forward = this._inputState.forward;
          inputComponent._keys.backward = this._inputState.backward;
          inputComponent._keys.left = this._inputState.left;
          inputComponent._keys.right = this._inputState.right;
        }
      }
    }
    
    _SimulateKeyboard() {
      // Créer ou mettre à jour les événements clavier simulés
      const keys = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];
      const states = [
        this._inputState.forward,
        this._inputState.backward,
        this._inputState.left,
        this._inputState.right
      ];
      
      // Initialiser les touches pressées si nécessaire
      if (!this._pressedKeys) this._pressedKeys = new Set();
      
      keys.forEach((key, index) => {
        const isPressed = states[index];
        
        if (isPressed && !this._pressedKeys.has(key)) {
          // Commencer à presser la touche
          this._DispatchKeyEvent('keydown', key);
          this._pressedKeys.add(key);
          console.log(`📱 Simulated keydown: ${key}`);
        } else if (!isPressed && this._pressedKeys.has(key)) {
          // Arrêter de presser la touche
          this._DispatchKeyEvent('keyup', key);
          this._pressedKeys.delete(key);
          console.log(`📱 Simulated keyup: ${key}`);
        }
      });
    }
    
    _DispatchKeyEvent(type, code) {
      // Mapper les codes vers les keyCodes pour compatibilité
      const keyCodeMap = {
        'KeyW': 87,
        'KeyA': 65, 
        'KeyS': 83,
        'KeyD': 68,
        'Space': 32,
        'ShiftLeft': 16
      };
      
      const keyCode = keyCodeMap[code];
      if (!keyCode) {
        console.warn(`📱 Code non mappé: ${code}`);
        return;
      }
      
      const event = new KeyboardEvent(type, {
        code: code,
        key: code.replace('Key', '').toLowerCase(),
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
        repeat: false
      });
      
      // Marquer l'événement comme provenant des contrôles mobiles
      event.isMobileInput = true;
      
      console.log(`📱 Dispatching ${type} event for ${code} (keyCode: ${keyCode})`);
      
      // Dispatch sur document ET window pour maximum compatibilité
      document.dispatchEvent(event);
      window.dispatchEvent(event);
    }
    
    _TriggerAction() {
      // Simuler la touche d'action (Space par exemple)
      this._DispatchKeyEvent('keydown', 'Space');
      setTimeout(() => {
        this._DispatchKeyEvent('keyup', 'Space');
      }, 100);
    }
    
    _SetSprint(active) {
      // Simuler la touche Shift pour courir
      if (active) {
        this._DispatchKeyEvent('keydown', 'ShiftLeft');
      } else {
        this._DispatchKeyEvent('keyup', 'ShiftLeft');
      }
    }
    
    // Méthodes pour masquer/afficher les contrôles
    show() {
      if (this._joystickContainer) {
        this._joystickContainer.style.display = 'flex';
      }
      const actionButton = document.getElementById('mobile-action-button');
      const sprintButton = document.getElementById('mobile-sprint-button');
      const audioButton = document.getElementById('mobile-audio-button');
      if (actionButton) actionButton.style.display = 'flex';
      if (sprintButton) sprintButton.style.display = 'flex';
      if (audioButton) audioButton.style.display = 'flex';
    }
    
    hide() {
      if (this._joystickContainer) {
        this._joystickContainer.style.display = 'none';
      }
      const actionButton = document.getElementById('mobile-action-button');
      const sprintButton = document.getElementById('mobile-sprint-button');
      const audioButton = document.getElementById('mobile-audio-button');
      if (actionButton) actionButton.style.display = 'none';
      if (sprintButton) sprintButton.style.display = 'none';
      if (audioButton) audioButton.style.display = 'none';
    }
    
    // Méthodes du composant
    InitComponent() {
      console.log('📱 Contrôles mobiles initialisés');
    }
    
    Update(timeElapsed) {
      // Mise à jour si nécessaire
    }
    
    Destroy() {
      if (this._joystickContainer) {
        document.body.removeChild(this._joystickContainer);
      }
      const actionButton = document.getElementById('mobile-action-button');
      const sprintButton = document.getElementById('mobile-sprint-button');
      const audioButton = document.getElementById('mobile-audio-button');
      if (actionButton) document.body.removeChild(actionButton);
      if (sprintButton) document.body.removeChild(sprintButton);
      if (audioButton) document.body.removeChild(audioButton);
    }
  }
  
  return {
    MobileControls: MobileControls
  };
})();

export default mobile_controls;