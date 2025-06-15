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
      
      if (this._isMobile) {
        this._Init();
      }
    }
    
    _detectMobile() {
      // Détecter si on est sur mobile/tablette
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
             || ('ontouchstart' in window) 
             || (navigator.maxTouchPoints > 0);
    }
    
    _Init() {
      console.log('📱 Initialisation des contrôles mobiles');
      this._CreateJoystick();
      this._AttachEvents();
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
      actionButton.innerHTML = '⚡';
      actionButton.style.cssText = `
        position: fixed;
        bottom: 50px;
        right: 30px;
        width: 60px;
        height: 60px;
        background: rgba(255, 255, 255, 0.3);
        border: 3px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
        z-index: 1000;
        touch-action: none;
        user-select: none;
        backdrop-filter: blur(10px);
        cursor: pointer;
      `;
      
      // Bouton de course (sprint)
      const sprintButton = document.createElement('div');
      sprintButton.id = 'mobile-sprint-button';
      sprintButton.innerHTML = '🏃';
      sprintButton.style.cssText = `
        position: fixed;
        bottom: 120px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: rgba(255, 255, 255, 0.3);
        border: 3px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: white;
        z-index: 1000;
        touch-action: none;
        user-select: none;
        backdrop-filter: blur(10px);
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
        this._TriggerAction();
      });
      
      actionButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        actionButton.style.transform = 'scale(1)';
      });
      
      // Bouton de sprint
      sprintButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sprintButton.style.transform = 'scale(0.9)';
        sprintButton.style.background = 'rgba(255, 255, 0, 0.5)';
        this._SetSprint(true);
      });
      
      sprintButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        sprintButton.style.transform = 'scale(1)';
        sprintButton.style.background = 'rgba(255, 255, 255, 0.3)';
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
      
      const deltaX = x - this._startPos.x;
      const deltaY = y - this._startPos.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Limiter la distance
      const limitedDistance = Math.min(distance, this._maxDistance);
      const angle = Math.atan2(deltaY, deltaX);
      
      const knobX = Math.cos(angle) * limitedDistance;
      const knobY = Math.sin(angle) * limitedDistance;
      
      // Déplacer le bouton du joystick
      this._joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px) scale(1.1)`;
      
      // Calculer les directions
      const normalizedX = knobX / this._maxDistance;
      const normalizedY = knobY / this._maxDistance;
      
      // Seuil pour éviter les micro-mouvements
      const threshold = 0.3;
      
      this._inputState = {
        forward: normalizedY < -threshold,
        backward: normalizedY > threshold,
        left: normalizedX < -threshold,
        right: normalizedX > threshold
      };
      
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
      
      // Ou envoyer directement via le système de messaging
      this.Broadcast({
        topic: 'input.mobile',
        forward: this._inputState.forward,
        backward: this._inputState.backward,
        left: this._inputState.left,
        right: this._inputState.right
      });
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
      
      keys.forEach((key, index) => {
        const isPressed = states[index];
        
        if (isPressed && !this._pressedKeys?.has(key)) {
          // Commencer à presser la touche
          this._DispatchKeyEvent('keydown', key);
          if (!this._pressedKeys) this._pressedKeys = new Set();
          this._pressedKeys.add(key);
        } else if (!isPressed && this._pressedKeys?.has(key)) {
          // Arrêter de presser la touche
          this._DispatchKeyEvent('keyup', key);
          this._pressedKeys.delete(key);
        }
      });
    }
    
    _DispatchKeyEvent(type, code) {
      const event = new KeyboardEvent(type, {
        code: code,
        key: code.replace('Key', '').toLowerCase(),
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(event);
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
      if (actionButton) actionButton.style.display = 'flex';
      if (sprintButton) sprintButton.style.display = 'flex';
    }
    
    hide() {
      if (this._joystickContainer) {
        this._joystickContainer.style.display = 'none';
      }
      const actionButton = document.getElementById('mobile-action-button');
      const sprintButton = document.getElementById('mobile-sprint-button');
      if (actionButton) actionButton.style.display = 'none';
      if (sprintButton) sprintButton.style.display = 'none';
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
      if (actionButton) document.body.removeChild(actionButton);
      if (sprintButton) document.body.removeChild(sprintButton);
    }
  }
  
  return {
    MobileControls: MobileControls
  };
})();

export default mobile_controls;