import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
import {entity} from './entity.js';

export const combat_system = (() => {

  class CombatSystem extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._isInCombat = false;
      this._currentMonster = null;
      this._playerTurn = true;
      this._originalCameraPosition = new THREE.Vector3();
      this._originalCameraLookAt = new THREE.Vector3();
      this._combatCameraPosition = new THREE.Vector3();
      this._combatCameraLookAt = new THREE.Vector3();
      this._cameraTransitionProgress = 0;
      this._isTransitioning = false;
      
      this._quizDatabase = [
        {
          question: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correct: 1
        },
        {
          question: "What is the capital of France?",
          options: ["London", "Berlin", "Paris", "Madrid"],
          correct: 2
        },
        {
          question: "What is 5 * 3?",
          options: ["13", "15", "18", "20"],
          correct: 1
        },
        {
          question: "Which planet is closest to the Sun?",
          options: ["Venus", "Mercury", "Earth", "Mars"],
          correct: 1
        },
        {
          question: "What is 100 / 4?",
          options: ["20", "25", "30", "35"],
          correct: 1
        }
      ];
      
      this._currentQuiz = null;
      this._playerHealth = 100;
      this._playerMaxHealth = 100;
      this._playerXP = 0;
      
      this._InitUI();
    }

    InitComponent() {
      console.log('✅ CombatSystem initialized');
      this._RegisterHandler('combat.start', (m) => { 
        this._StartCombat(m); 
      });
      this._RegisterHandler('combat.end', (m) => { this._EndCombat(m); });
    }

    _InitUI() {
      this._selectedMenuIndex = 0;
      this._selectedQuizIndex = 0;
      this._currentMenu = 'action'; // 'action' or 'quiz'
      
      // Keyboard handlers for retro navigation
      document.addEventListener('keydown', (e) => this._HandleKeyInput(e));
      
      // Quiz option handlers
      const quizOptions = document.querySelectorAll('.quiz-option');
      quizOptions.forEach((option, index) => {
        option.addEventListener('click', () => {
          this._selectedQuizIndex = index;
          this._UpdateQuizSelection();
          this._HandleQuizAnswer(index);
        });
      });

      // Menu option handlers
      const menuOptions = document.querySelectorAll('.menu-option');
      menuOptions.forEach((option, index) => {
        option.addEventListener('click', () => {
          this._selectedMenuIndex = index;
          this._UpdateMenuSelection();
          this._HandleMenuAction(option.dataset.action);
        });
      });
      
      
      // Initialize selection
      this._UpdateMenuSelection();
    }
    
    _HandleKeyInput(event) {
      if (!this._isInCombat) return;
      
      event.preventDefault();
      
      if (this._currentMenu === 'action') {
        const menuOptions = document.querySelectorAll('.menu-option');
        
        switch(event.key) {
          case 'ArrowUp':
            this._selectedMenuIndex = Math.max(0, this._selectedMenuIndex - 1);
            this._UpdateMenuSelection();
            break;
          case 'ArrowDown':
            this._selectedMenuIndex = Math.min(menuOptions.length - 1, this._selectedMenuIndex + 1);
            this._UpdateMenuSelection();
            break;
          case 'Enter':
          case ' ':
            const selectedOption = menuOptions[this._selectedMenuIndex];
            this._HandleMenuAction(selectedOption.dataset.action);
            break;
        }
      } else if (this._currentMenu === 'quiz') {
        const quizOptions = document.querySelectorAll('.quiz-option');
        
        switch(event.key) {
          case 'ArrowUp':
            this._selectedQuizIndex = Math.max(0, this._selectedQuizIndex - 1);
            this._UpdateQuizSelection();
            break;
          case 'ArrowDown':
            this._selectedQuizIndex = Math.min(quizOptions.length - 1, this._selectedQuizIndex + 1);
            this._UpdateQuizSelection();
            break;
          case 'Enter':
          case ' ':
            this._HandleQuizAnswer(this._selectedQuizIndex);
            break;
          case 'Escape':
            this._ShowActionMenu();
            break;
        }
      }
    }
    
    _UpdateMenuSelection() {
      const menuOptions = document.querySelectorAll('.menu-option');
      menuOptions.forEach((option, index) => {
        if (index === this._selectedMenuIndex) {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }
      });
    }
    
    _UpdateQuizSelection() {
      const quizOptions = document.querySelectorAll('.quiz-option');
      quizOptions.forEach((option, index) => {
        if (index === this._selectedQuizIndex) {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }
      });
    }
    
    _HandleMenuAction(action) {
      switch(action) {
        case 'quiz':
          this._ShowQuizSection();
          break;
        case 'code':
          this._AddCombatLog('Code action not implemented yet!');
          break;
        case 'heal':
          this._AddCombatLog('Heal action not implemented yet!');
          break;
      }
    }

    _StartCombat(message) {
      if (this._isInCombat) {
        return;
      }
      
      console.log('⚔️ STARTING COMBAT with:', message.monster.Name || 'Unknown Monster');
      this._isInCombat = true;
      this._currentMonster = message.monster;
      this._playerTurn = true;
      
      // Stop player movement during combat
      this._params.target.GetComponent('BasicCharacterController')._velocity.set(0, 0, 0);
      
      // Store original camera position
      this._originalCameraPosition.copy(this._params.camera.position);
      this._originalCameraLookAt.copy(this._params.target._position);
      
      // Calculate combat camera position (closer to the action)
      const monsterPos = this._currentMonster._position;
      const playerPos = this._params.target._position;
      
      // Position camera to show both combatants
      const midPoint = new THREE.Vector3().addVectors(monsterPos, playerPos).multiplyScalar(0.5);
      this._combatCameraPosition.copy(midPoint);
      this._combatCameraPosition.y += 8;
      this._combatCameraPosition.z += 12;
      
      this._combatCameraLookAt.copy(midPoint);
      this._combatCameraLookAt.y += 2;
      
      // Start camera transition
      this._isTransitioning = true;
      this._cameraTransitionProgress = 0;
      
      // Show combat UI
      this._ShowCombatUI();
      
      // Update UI with monster info
      document.getElementById('monster-name').textContent = this._currentMonster.Name || 'Monster';
      this._UpdateHealthBars();
      
      // Load first quiz
      this._LoadRandomQuiz();
      
      this._AddCombatLog('Combat started!');
    }

    _EndCombat(message) {
      if (!this._isInCombat) {
        console.log('⚠️ _EndCombat called but not in combat');
        return;
      }
      
      console.log('🏁 ENDING COMBAT, player won:', message.playerWon);
      
      // Award XP if player won
      if (message.playerWon) {
        this._AwardXP(50);
        this._AddCombatLog('Victory! You gained 50 XP!');
      } else {
        this._AddCombatLog('Defeat...');
      }
      
      // Hide combat UI immediately
      this._HideCombatUI();
      
      // Set combat state to false
      this._isInCombat = false;
      this._currentMonster = null;
      
      // Transition camera back
      this._isTransitioning = true;
      this._cameraTransitionProgress = 0;
      
      console.log('✅ Combat ended, isInCombat:', this._isInCombat);
    }

    _ShowCombatUI() {
      const combatUI = document.getElementById('combat-ui');
      combatUI.classList.remove('hidden');
    }

    _HideCombatUI() {
      const combatUI = document.getElementById('combat-ui');
      combatUI.classList.add('hidden');
    }

    _ShowQuizSection() {
      document.getElementById('action-menu').classList.add('hidden');
      document.getElementById('quiz-section').classList.remove('hidden');
      this._currentMenu = 'quiz';
      this._selectedQuizIndex = 0;
      this._UpdateQuizSelection();
    }
    
    _ShowActionMenu() {
      document.getElementById('quiz-section').classList.add('hidden');
      document.getElementById('action-menu').classList.remove('hidden');
      this._currentMenu = 'action';
      this._selectedMenuIndex = 0;
      this._UpdateMenuSelection();
    }

    _LoadRandomQuiz() {
      const randomIndex = Math.floor(Math.random() * this._quizDatabase.length);
      this._currentQuiz = this._quizDatabase[randomIndex];
      
      document.getElementById('quiz-question').textContent = this._currentQuiz.question;
      
      const options = document.querySelectorAll('.quiz-option .option-text');
      options.forEach((option, index) => {
        option.textContent = `${String.fromCharCode(65 + index)}) ${this._currentQuiz.options[index]}`;
      });
      
      const quizOptions = document.querySelectorAll('.quiz-option');
      quizOptions.forEach((option, index) => {
        option.classList.remove('correct', 'incorrect', 'selected');
        option.disabled = false;
      });
      
      this._selectedQuizIndex = 0;
      this._UpdateQuizSelection();
    }

    _HandleQuizAnswer(selectedIndex) {
      if (!this._currentQuiz || !this._playerTurn) return;
      
      const options = document.querySelectorAll('.quiz-option');
      const correct = this._currentQuiz.correct;
      
      // Disable all options
      options.forEach(option => option.disabled = true);
      
      // Show correct/incorrect feedback
      if (selectedIndex === correct) {
        options[selectedIndex].classList.add('correct');
        this._AddCombatLog('Correct! You deal damage to the monster!');
        this._DamageMonster(25);
      } else {
        options[selectedIndex].classList.add('incorrect');
        options[correct].classList.add('correct');
        this._AddCombatLog('Wrong answer! The monster attacks you!');
        this._DamagePlayer(20);
        
        // Trigger monster attack animation
        this._TriggerMonsterAttack();
      }
      
      this._playerTurn = false;
      
      // Check for combat end
      setTimeout(() => {
        if (this._currentMonster && this._currentMonster._health <= 0) {
          // Kill the monster in the game world
          this._KillMonster();
          console.log('Monster defeated, ending combat');
          this._EndCombat({
            playerWon: true
          });
        } else if (this._playerHealth <= 0) {
          console.log('Player defeated, ending combat');
          this._EndCombat({
            playerWon: false
          });
        } else {
          // Continue combat - return to action menu
          this._playerTurn = true;
          this._ShowActionMenu();
        }
      }, 2000);
    }

    _DamageMonster(damage) {
      if (this._currentMonster) {
        this._currentMonster._health = Math.max(0, this._currentMonster._health - damage);
        this._UpdateHealthBars();
      }
    }

    _DamagePlayer(damage) {
      this._playerHealth = Math.max(0, this._playerHealth - damage);
      this._UpdateHealthBars();
    }

    _UpdateHealthBars() {
      // Update player health bar
      const playerHealthPercent = (this._playerHealth / this._playerMaxHealth) * 100;
      document.getElementById('player-health').style.width = playerHealthPercent + '%';
      
      // Update monster health bar
      if (this._currentMonster) {
        const monsterHealthPercent = (this._currentMonster._health / this._currentMonster._maxHealth) * 100;
        document.getElementById('monster-health').style.width = monsterHealthPercent + '%';
      }
    }

    _AwardXP(amount) {
      this._playerXP += amount;
      
      // Show XP notification
      const xpNotification = document.getElementById('xp-notification');
      xpNotification.querySelector('span').textContent = `+${amount} XP`;
      xpNotification.classList.remove('hidden');
      
      setTimeout(() => {
        xpNotification.classList.add('hidden');
      }, 2000);
    }

    _TriggerMonsterAttack() {
      if (this._currentMonster && this._currentMonster._target) {
        // Simple attack animation - make monster slightly bigger and red briefly
        const originalScale = this._currentMonster._target.scale.clone();
        const originalColor = new THREE.Color();
        
        this._currentMonster._target.traverse(c => {
          if (c.material && c.material.color) {
            originalColor.copy(c.material.color);
            c.material.color.setHex(0xff0000); // Red flash
          }
        });
        
        this._currentMonster._target.scale.multiplyScalar(1.1);
        
        // Reset after 300ms
        setTimeout(() => {
          this._currentMonster._target.scale.copy(originalScale);
          this._currentMonster._target.traverse(c => {
            if (c.material && c.material.color) {
              c.material.color.copy(originalColor);
            }
          });
        }, 300);
      }
    }
    
    _KillMonster() {
      if (this._currentMonster && this._currentMonster._target) {
        // Remove monster from scene
        this._params.scene.remove(this._currentMonster._target);
        
        // Mark monster as dead
        this._currentMonster._health = 0;
        
        // Remove from entity manager
        const entities = this._params.target._parent._entities;
        for (let [name, entity] of entities) {
          const npcController = entity.GetComponent('NPCController');
          if (npcController === this._currentMonster) {
            console.log('🗑️ Removing defeated enemy:', name);
            this._params.target._parent.Remove(entity);
            break;
          }
        }
      }
    }

    _AddCombatLog(message) {
      const log = document.getElementById('combat-log');
      const p = document.createElement('p');
      p.textContent = message;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    }

    Update(timeElapsed) {
      if (this._isTransitioning) {
        this._UpdateCameraTransition(timeElapsed);
      }
      
      // Disable third person camera during combat
      if (this._params.target && this._params.target._parent) {
        if (this._isInCombat) {
          const camera = this._params.target._parent.Get('player-camera');
          if (camera) {
            camera.GetComponent('ThirdPersonCamera')._enabled = false;
          }
        } else {
          const camera = this._params.target._parent.Get('player-camera');
          if (camera) {
            camera.GetComponent('ThirdPersonCamera')._enabled = true;
          }
        }
      }
    }

    _UpdateCameraTransition(timeElapsed) {
      this._cameraTransitionProgress += timeElapsed * 3; // Faster transition - 0.33 seconds
      
      if (this._cameraTransitionProgress >= 1) {
        this._cameraTransitionProgress = 1;
        this._isTransitioning = false;
      }
      
      const t = this._cameraTransitionProgress;
      const easedT = 1 - Math.pow(1 - t, 3); // Ease out cubic
      
      if (this._isInCombat) {
        // Transition to combat camera
        this._params.camera.position.lerpVectors(this._originalCameraPosition, this._combatCameraPosition, easedT);
        
        const currentLookAt = new THREE.Vector3().lerpVectors(this._originalCameraLookAt, this._combatCameraLookAt, easedT);
        this._params.camera.lookAt(currentLookAt);
      } else {
        // Transition back to original camera - disable third person camera during transition
        this._params.camera.position.lerpVectors(this._combatCameraPosition, this._originalCameraPosition, easedT);
        
        const currentLookAt = new THREE.Vector3().lerpVectors(this._combatCameraLookAt, this._originalCameraLookAt, easedT);
        this._params.camera.lookAt(currentLookAt);
        
        // Re-enable third person camera when transition is done
        if (!this._isTransitioning) {
          if (this._params.target && this._params.target._parent) {
            const camera = this._params.target._parent.Get('player-camera');
            if (camera) {
              camera.GetComponent('ThirdPersonCamera')._enabled = true;
            }
          }
        }
      }
    }

    get IsInCombat() {
      return this._isInCombat;
    }
  }

  return {
    CombatSystem: CombatSystem
  };

})();