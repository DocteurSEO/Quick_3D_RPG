// Contrôleur de manettes de jeu (Gamepad API)
// Support pour manettes Xbox, PlayStation, et autres manettes compatibles

import { entity } from './entity.js';

export const gamepad_controller = (() => {
  
  class GamepadController extends entity.Component {
    constructor(params) {
      super();
      this._params = params || {};
      this._gamepads = {};
      this._isActive = false;
      this._deadzone = 0.15; // Zone morte pour les sticks analogiques
      this._buttonStates = {};
      this._axisStates = {};
      this._inputState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        action: false,
        sprint: false
      };
      
      // État audio
      this._audioMuted = false;
      
      // Mapping des boutons pour différents types de manettes
      this._buttonMapping = {
        // Boutons standards (Xbox/PlayStation)
        0: 'action',     // A/X
        1: 'cancel',     // B/Circle
        2: 'tertiary',   // X/Square
        3: 'quaternary', // Y/Triangle
        4: 'leftBumper', // LB/L1
        5: 'rightBumper',// RB/R1
        6: 'leftTrigger',// LT/L2
        7: 'rightTrigger',// RT/R2
        8: 'select',     // Select/Share
        9: 'start',      // Start/Options
        10: 'leftStick', // Left stick click
        11: 'rightStick',// Right stick click
        12: 'dpadUp',    // D-pad up
        13: 'dpadDown',  // D-pad down
        14: 'dpadLeft',  // D-pad left
        15: 'dpadRight', // D-pad right
        16: 'home'       // Xbox/PS button
      };
      
      // Mapping des axes
      this._axisMapping = {
        0: 'leftStickX',   // Stick gauche horizontal
        1: 'leftStickY',   // Stick gauche vertical
        2: 'rightStickX',  // Stick droit horizontal
        3: 'rightStickY'   // Stick droit vertical
      };
      
      this._Init();
    }
    
    _Init() {
      console.log('🎮 Initialisation du contrôleur de manettes');
      
      // Vérifier si l'API Gamepad est supportée
      if (!navigator.getGamepads) {
        console.warn('⚠️ API Gamepad non supportée par ce navigateur');
        return;
      }
      
      // Écouter les événements de connexion/déconnexion
      window.addEventListener('gamepadconnected', (e) => this._OnGamepadConnected(e));
      window.addEventListener('gamepaddisconnected', (e) => this._OnGamepadDisconnected(e));
      
      // Démarrer la boucle de mise à jour
      this._StartUpdateLoop();
    }
    
    _OnGamepadConnected(event) {
      const gamepad = event.gamepad;
      console.log(`🎮 Manette connectée: ${gamepad.id} (index: ${gamepad.index})`);
      
      this._gamepads[gamepad.index] = gamepad;
      this._isActive = true;
      
      // Afficher une notification
      this._ShowNotification(`Manette connectée: ${gamepad.id}`, 'success');
    }
    
    _OnGamepadDisconnected(event) {
      const gamepad = event.gamepad;
      console.log(`🎮 Manette déconnectée: ${gamepad.id} (index: ${gamepad.index})`);
      
      delete this._gamepads[gamepad.index];
      
      // Vérifier s'il reste des manettes connectées
      if (Object.keys(this._gamepads).length === 0) {
        this._isActive = false;
        this._ResetInputState();
      }
      
      // Afficher une notification
      this._ShowNotification(`Manette déconnectée: ${gamepad.id}`, 'warning');
    }
    
    _StartUpdateLoop() {
      const update = () => {
        this._UpdateGamepads();
        requestAnimationFrame(update);
      };
      update();
    }
    
    _UpdateGamepads() {
      if (!this._isActive) return;
      
      // Récupérer l'état actuel des manettes
      const gamepads = navigator.getGamepads();
      
      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad && this._gamepads[gamepad.index]) {
          this._ProcessGamepadInput(gamepad);
        }
      }
    }
    
    _ProcessGamepadInput(gamepad) {
      // Traiter les boutons
      this._ProcessButtons(gamepad);
      
      // Traiter les axes (sticks analogiques)
      this._ProcessAxes(gamepad);
      
      // Envoyer les entrées au jeu
      this._SendInputToGame();
    }
    
    _ProcessButtons(gamepad) {
      for (let i = 0; i < gamepad.buttons.length; i++) {
        const button = gamepad.buttons[i];
        const buttonName = this._buttonMapping[i];
        
        if (buttonName) {
          const isPressed = button.pressed;
          const wasPressed = this._buttonStates[buttonName] || false;
          
          // Détecter les changements d'état
          if (isPressed !== wasPressed) {
            this._buttonStates[buttonName] = isPressed;
            this._HandleButtonInput(buttonName, isPressed);
          }
        }
      }
    }
    
    _ProcessAxes(gamepad) {
      for (let i = 0; i < gamepad.axes.length; i++) {
        const axisValue = gamepad.axes[i];
        const axisName = this._axisMapping[i];
        
        if (axisName) {
          // Appliquer la zone morte
          const filteredValue = Math.abs(axisValue) > this._deadzone ? axisValue : 0;
          this._axisStates[axisName] = filteredValue;
        }
      }
      
      // Convertir les axes en entrées directionnelles
      this._ProcessMovementFromAxes();
    }
    
    _ProcessMovementFromAxes() {
      const leftStickX = this._axisStates.leftStickX || 0;
      const leftStickY = this._axisStates.leftStickY || 0;
      
      // Vérifier si on est dans un menu de combat
      const isInCombatMenu = this._IsInCombatMenu();
      
      if (isInCombatMenu) {
        // Dans les menus, utiliser le stick pour la navigation
        this._HandleMenuNavigation(leftStickX, leftStickY);
      } else {
        // Hors combat, mouvement normal
        this._inputState.left = leftStickX < -this._deadzone;
        this._inputState.right = leftStickX > this._deadzone;
        this._inputState.forward = leftStickY < -this._deadzone;
        this._inputState.backward = leftStickY > this._deadzone;
      }
    }
    
    _HandleButtonInput(buttonName, isPressed) {
      // Vérifier si on est dans un menu de combat
      const isInCombatMenu = this._IsInCombatMenu();
      
      switch (buttonName) {
        case 'action':
          this._inputState.action = isPressed;
          if (isPressed) {
            if (isInCombatMenu) {
              // Dans le menu de combat, utiliser Enter pour valider
              this._DispatchKeyEvent('keydown', 'Enter');
            } else {
              // Hors combat, utiliser Espace pour les interactions
              this._DispatchKeyEvent('keydown', 'Space');
            }
          } else {
            if (isInCombatMenu) {
              this._DispatchKeyEvent('keyup', 'Enter');
            } else {
              this._DispatchKeyEvent('keyup', 'Space');
            }
          }
          break;
          
        case 'cancel':
          if (isPressed && isInCombatMenu) {
            // Bouton B/Circle pour retour en arrière dans les menus
            this._DispatchKeyEvent('keydown', 'Escape');
          }
          break;
          
        case 'rightBumper':
        case 'rightTrigger':
          this._inputState.sprint = isPressed;
          if (isPressed && !isInCombatMenu) {
            this._DispatchKeyEvent('keydown', 'ShiftLeft');
          } else if (!isPressed && !isInCombatMenu) {
            this._DispatchKeyEvent('keyup', 'ShiftLeft');
          }
          break;
          
        case 'dpadUp':
          if (isPressed) {
            if (isInCombatMenu) {
              this._DispatchKeyEvent('keydown', 'ArrowUp');
            } else {
              this._inputState.forward = true;
            }
          } else {
            if (isInCombatMenu) {
              this._DispatchKeyEvent('keyup', 'ArrowUp');
            } else {
              this._inputState.forward = false;
            }
          }
          break;
          
        case 'dpadDown':
          if (isPressed) {
            if (isInCombatMenu) {
              this._DispatchKeyEvent('keydown', 'ArrowDown');
            } else {
              this._inputState.backward = true;
            }
          } else {
            if (isInCombatMenu) {
              this._DispatchKeyEvent('keyup', 'ArrowDown');
            } else {
              this._inputState.backward = false;
            }
          }
          break;
          
        case 'dpadLeft':
          if (isPressed) {
            if (isInCombatMenu) {
              this._DispatchKeyEvent('keydown', 'ArrowLeft');
            } else {
              this._inputState.left = true;
            }
          } else {
            if (isInCombatMenu) {
              this._DispatchKeyEvent('keyup', 'ArrowLeft');
            } else {
              this._inputState.left = false;
            }
          }
          break;
          
        case 'dpadRight':
          if (isPressed) {
            if (isInCombatMenu) {
              this._DispatchKeyEvent('keydown', 'ArrowRight');
            } else {
              this._inputState.right = true;
            }
          } else {
            if (isInCombatMenu) {
              this._DispatchKeyEvent('keyup', 'ArrowRight');
            } else {
              this._inputState.right = false;
            }
          }
          break;
          
        case 'select':
          if (isPressed) {
            this._ToggleAudio();
          }
          break;
          
        case 'start':
          if (isPressed) {
            // Ouvrir/fermer le menu
            this._DispatchKeyEvent('keydown', 'Escape');
          }
          break;
      }
    }
    
    _SendInputToGame() {
      // Simuler les touches clavier pour le système existant
      this._SimulateKeyboard();
      
      // Envoyer aussi via le système de messaging
      this.Broadcast({
        topic: 'input.gamepad',
        forward: this._inputState.forward,
        backward: this._inputState.backward,
        left: this._inputState.left,
        right: this._inputState.right,
        action: this._inputState.action,
        sprint: this._inputState.sprint
      });
    }
    
    _SimulateKeyboard() {
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
          this._DispatchKeyEvent('keydown', key);
          this._pressedKeys.add(key);
          console.log(`🎮 Simulated keydown: ${key}`);
        } else if (!isPressed && this._pressedKeys.has(key)) {
          this._DispatchKeyEvent('keyup', key);
          this._pressedKeys.delete(key);
          console.log(`🎮 Simulated keyup: ${key}`);
        }
      });
    }
    
    _ToggleAudio() {
      this._audioMuted = !this._audioMuted;
      
      // Utiliser le système audio spatial global si disponible
      if (window.combatSystemInstance && window.combatSystemInstance._spatialAudio) {
        const spatialAudio = window.combatSystemInstance._spatialAudio;
        if (spatialAudio.ToggleMute) {
          const isMuted = spatialAudio.ToggleMute();
          this._audioMuted = isMuted;
        }
      }
      
      // Contrôler tous les éléments audio/vidéo HTML
      const audioElements = document.querySelectorAll('audio, video');
      audioElements.forEach(element => {
        element.muted = this._audioMuted;
      });
      
      // Mettre à jour le bouton audio mobile s'il existe
      const audioButton = document.getElementById('mobile-audio-button');
      if (audioButton) {
        audioButton.innerHTML = this._audioMuted ? '🔇' : '🔊';
        audioButton.style.borderColor = this._audioMuted ? '#ff4444' : '#00ff00';
      }
      
      // Stocker l'état global
      window.audioMuted = this._audioMuted;
      
      console.log(`Audio ${this._audioMuted ? 'coupé' : 'activé'} via manette`);
    }
    
    _DispatchKeyEvent(type, code) {
      const keyCodeMap = {
        'KeyW': 87,
        'KeyA': 65,
        'KeyS': 83,
        'KeyD': 68,
        'Space': 32,
        'ShiftLeft': 16,
        'Escape': 27
      };
      
      const event = new KeyboardEvent(type, {
        key: code,
        code: code,
        keyCode: keyCodeMap[code] || 0,
        which: keyCodeMap[code] || 0,
        bubbles: true,
        cancelable: true
      });
      
      document.dispatchEvent(event);
    }
    
    _ResetInputState() {
      this._inputState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        action: false,
        sprint: false
      };
      
      // Relâcher toutes les touches simulées
      if (this._pressedKeys) {
        this._pressedKeys.forEach(key => {
          this._DispatchKeyEvent('keyup', key);
        });
        this._pressedKeys.clear();
      }
    }
    
    _ShowNotification(message, type = 'info') {
      // Créer une notification temporaire
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
      `;
      
      notification.textContent = message;
      document.body.appendChild(notification);
      
      // Supprimer la notification après 3 secondes
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 3000);
    }
    
    // Méthodes publiques
    isGamepadConnected() {
      return this._isActive && Object.keys(this._gamepads).length > 0;
    }
    
    getConnectedGamepads() {
      return Object.values(this._gamepads).map(gamepad => ({
        id: gamepad.id,
        index: gamepad.index,
        connected: gamepad.connected
      }));
    }
    
    setDeadzone(value) {
      this._deadzone = Math.max(0, Math.min(1, value));
      console.log(`🎮 Zone morte définie à: ${this._deadzone}`);
    }
    
    _IsInCombatMenu() {
      // Vérifier si on est dans l'interface de combat
      const combatUI = document.getElementById('combat-ui');
      const actionMenu = document.getElementById('action-menu');
      const quizSection = document.getElementById('quiz-section');
      
      return combatUI && !combatUI.classList.contains('hidden') && 
             (actionMenu && !actionMenu.classList.contains('hidden') ||
              quizSection && !quizSection.classList.contains('hidden'));
    }
    
    _HandleMenuNavigation(stickX, stickY) {
      // Gérer la navigation avec le stick analogique dans les menus
      const threshold = this._deadzone * 2; // Seuil plus élevé pour éviter les mouvements accidentels
      
      // Éviter les répétitions trop rapides
      const now = Date.now();
      if (this._lastMenuNavigation && (now - this._lastMenuNavigation) < 200) {
        return;
      }
      
      if (Math.abs(stickY) > threshold) {
        if (stickY < -threshold) {
          // Stick vers le haut
          this._DispatchKeyEvent('keydown', 'ArrowUp');
          this._lastMenuNavigation = now;
        } else if (stickY > threshold) {
          // Stick vers le bas
          this._DispatchKeyEvent('keydown', 'ArrowDown');
          this._lastMenuNavigation = now;
        }
      }
      
      if (Math.abs(stickX) > threshold) {
        if (stickX < -threshold) {
          // Stick vers la gauche
          this._DispatchKeyEvent('keydown', 'ArrowLeft');
          this._lastMenuNavigation = now;
        } else if (stickX > threshold) {
          // Stick vers la droite
          this._DispatchKeyEvent('keydown', 'ArrowRight');
          this._lastMenuNavigation = now;
        }
      }
    }
    
    InitComponent() {
      console.log('🎮 Contrôleur de manettes initialisé');
      
      // Initialiser le timestamp pour la navigation
      this._lastMenuNavigation = 0;
      
      // Ajouter les styles CSS pour les animations
      if (!document.getElementById('gamepad-styles')) {
        const style = document.createElement('style');
        style.id = 'gamepad-styles';
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }
  
  return {
    GamepadController: GamepadController
  };
  
})();