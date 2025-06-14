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
      this._playerLevel = 1;
      this._playerXPToNextLevel = 100; // XP needed for next level
      
      // UI will be initialized when combat starts
      this._keydownHandler = null;
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
      this._isAnimating = false;
      
      // Remove existing event listeners to prevent duplicates
      if (this._keydownHandler) {
        document.removeEventListener('keydown', this._keydownHandler);
      }
      
      // Keyboard handlers for retro navigation
      this._keydownHandler = (e) => this._HandleKeyInput(e);
      document.addEventListener('keydown', this._keydownHandler);
      
      // Quiz option handlers
      const quizOptions = document.querySelectorAll('.quiz-option');
      quizOptions.forEach((option, index) => {
        option.addEventListener('click', () => {
          if (this._isAnimating) return;
          this._PlayUISound('select');
          this._selectedQuizIndex = index;
          this._UpdateQuizSelection();
          this._HandleQuizAnswer(index);
        });
      });

      // Menu option handlers
      const menuOptions = document.querySelectorAll('.menu-option');
      menuOptions.forEach((option, index) => {
        option.addEventListener('click', () => {
          if (this._isAnimating) return;
          this._PlayUISound('select');
          this._selectedMenuIndex = index;
          this._UpdateMenuSelection();
          this._HandleMenuAction(option.dataset.action);
        });
      });
      
      // Initialize selection
      this._UpdateMenuSelection();
    }
    
    _CleanupUI() {
      // Remove keyboard event listener
      if (this._keydownHandler) {
        document.removeEventListener('keydown', this._keydownHandler);
        this._keydownHandler = null;
      }
    }
    
    _HandleKeyInput(event) {
      if (!this._isInCombat || this._isAnimating) return;
      
      event.preventDefault();
      
      if (this._currentMenu === 'action') {
        const menuOptions = document.querySelectorAll('.menu-option');
        
        switch(event.key) {
          case 'ArrowUp':
            this._PlayUISound('navigate');
            this._selectedMenuIndex = Math.max(0, this._selectedMenuIndex - 1);
            this._UpdateMenuSelection();
            break;
          case 'ArrowDown':
            this._PlayUISound('navigate');
            this._selectedMenuIndex = Math.min(menuOptions.length - 1, this._selectedMenuIndex + 1);
            this._UpdateMenuSelection();
            break;
          case 'Enter':
          case ' ':
            this._PlayUISound('select');
            const selectedOption = menuOptions[this._selectedMenuIndex];
            this._HandleMenuAction(selectedOption.dataset.action);
            break;
        }
      } else if (this._currentMenu === 'quiz') {
        const quizOptions = document.querySelectorAll('.quiz-option');
        
        switch(event.key) {
          case 'ArrowUp':
            this._PlayUISound('navigate');
            this._selectedQuizIndex = Math.max(0, this._selectedQuizIndex - 1);
            this._UpdateQuizSelection();
            break;
          case 'ArrowDown':
            this._PlayUISound('navigate');
            this._selectedQuizIndex = Math.min(quizOptions.length - 1, this._selectedQuizIndex + 1);
            this._UpdateQuizSelection();
            break;
          case 'Enter':
          case ' ':
            this._PlayUISound('select');
            this._HandleQuizAnswer(this._selectedQuizIndex);
            break;
          case 'Escape':
            this._PlayUISound('back');
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
          option.style.transform = 'scale(1.05)';
        } else {
          option.classList.remove('selected');
          option.style.transform = 'scale(1)';
        }
      });
    }
    
    _UpdateQuizSelection() {
      const quizOptions = document.querySelectorAll('.quiz-option');
      quizOptions.forEach((option, index) => {
        if (index === this._selectedQuizIndex) {
          option.classList.add('selected');
          option.style.transform = 'scale(1.05)';
        } else {
          option.classList.remove('selected');
          option.style.transform = 'scale(1)';
        }
      });
    }
    
    _PlayUISound(type) {
      // Créer des sons d'interface simples avec Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      switch(type) {
        case 'navigate':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          break;
        case 'select':
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          break;
        case 'back':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          break;
        case 'correct':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(1600, audioContext.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          break;
        case 'incorrect':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          break;
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
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
        console.log('⚠️ Combat already in progress, ignoring new combat request');
        return;
      }
      
      console.log('⚔️ STARTING COMBAT with:', message.monster.Name || 'Unknown Monster');
      console.log('🏥 Initial monster health:', message.monster._health, '/', message.monster._maxHealth);
      
      this._isInCombat = true;
      this._currentMonster = message.monster;
      this._playerTurn = true;
      this._isAnimating = false;
      
      // Stop player movement during combat
      this._params.target.GetComponent('BasicCharacterController')._velocity.set(0, 0, 0);
      
      // Initialize UI for this combat session
      this._InitUI();
      
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
      
      // Disable player movement during combat
      const controller = this._params.target.GetComponent('BasicCharacterController');
      if (controller) {
        controller._enabled = false;
        console.log('🚫 Player movement disabled for combat');
      }
      
      // Start camera transition
      this._isTransitioning = true;
      this._cameraTransitionProgress = 0;
      
      // Show combat UI
      this._ShowCombatUI();
      
      // Update UI with monster info
      document.getElementById('monster-name').textContent = this._currentMonster.Name || 'Monster';
      this._UpdateHealthBars();
      
      // Ensure monster health is properly set
      console.log('🏥 Monster health:', this._currentMonster._health, '/', this._currentMonster._maxHealth);
      
      // Update XP display at combat start
      this._UpdateXPDisplay();
      
      // Load first quiz after a short delay to ensure UI is ready
      setTimeout(() => {
        this._LoadRandomQuiz();
        this._AddCombatLog('Combat started!');
      }, 100);
    }

    _EndCombat(message) {
      if (!this._isInCombat) {
        console.log('⚠️ _EndCombat called but not in combat');
        return;
      }
      
      console.log('🏁 ENDING COMBAT, player won:', message.playerWon);
      
      // Award XP if player won
      if (message.playerWon) {
        this._PlayUISound('correct');
        this._AwardXP(50);
        this._AddCombatLogAnimated('🎉 Victory! You gained 50 XP!', 'success');
        this._ShowVictoryEffect();
      } else {
        this._PlayUISound('incorrect');
        this._AddCombatLogAnimated('💀 Defeat...', 'error');
        this._ShowDefeatEffect();
        
        // Respawn player at starting position
        this._RespawnPlayer();
      }
      
      // Delay before hiding UI to show final message
      setTimeout(() => {
        this._HideCombatUIAnimated();
        
        // Set combat state to false
        this._isInCombat = false;
        this._currentMonster = null;
        this._isAnimating = false;
        
        // Clean up event listeners
        this._CleanupUI();
        
        // Hide quiz and action menu sections
        document.getElementById('quiz-section').classList.add('hidden');
        document.getElementById('action-menu').classList.remove('hidden');
        
        // Transition camera back
        this._isTransitioning = true;
        this._cameraTransitionProgress = 0;
        
        // Re-enable player movement after camera transition
        setTimeout(() => {
          this._EnablePlayerMovement();
        }, 1000);
        
        console.log('✅ Combat ended, isInCombat:', this._isInCombat);
      }, 2000);
    }

    _ShowCombatUI() {
      const combatUI = document.getElementById('combat-ui');
      combatUI.classList.remove('hidden');
    }

    _HideCombatUI() {
      const combatUI = document.getElementById('combat-ui');
      combatUI.classList.add('hidden');
    }
    
    _HideCombatUIAnimated() {
      const combatUI = document.getElementById('combat-ui');
      
      // Force immediate hiding first
      combatUI.classList.add('hidden');
      
      // Then apply animation
      combatUI.style.transition = 'all 0.5s ease';
      combatUI.style.opacity = '0';
      combatUI.style.transform = 'scale(0.9)';
      combatUI.style.pointerEvents = 'none';
      
      setTimeout(() => {
        combatUI.style.opacity = '';
        combatUI.style.transform = '';
        combatUI.style.transition = '';
        combatUI.style.pointerEvents = '';
        console.log('🎭 Combat UI fully hidden');
      }, 500);
    }
    
    _ShowVictoryEffect() {
      // Créer des particules de victoire
      const combatPanel = document.querySelector('.combat-panel');
      
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '6px';
        particle.style.height = '6px';
        particle.style.background = '#ffd700';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1200';
        
        const startX = Math.random() * combatPanel.offsetWidth;
        const startY = Math.random() * combatPanel.offsetHeight;
        particle.style.left = startX + 'px';
        particle.style.top = startY + 'px';
        
        combatPanel.appendChild(particle);
        
        // Animer la particule
        const animation = particle.animate([
          { 
            transform: 'translate(0, 0) scale(1)', 
            opacity: 1 
          },
          { 
            transform: `translate(${(Math.random() - 0.5) * 200}px, ${-100 - Math.random() * 100}px) scale(0)`, 
            opacity: 0 
          }
        ], {
          duration: 1000 + Math.random() * 500,
          easing: 'ease-out'
        });
        
        animation.onfinish = () => particle.remove();
      }
    }
    
    _ShowDefeatEffect() {
      // Effet de défaite avec assombrissement
      const combatPanel = document.querySelector('.combat-panel');
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(255, 0, 0, 0.3)';
      overlay.style.pointerEvents = 'none';
      overlay.style.borderRadius = '15px';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s ease';
      
      combatPanel.appendChild(overlay);
      
      setTimeout(() => {
        overlay.style.opacity = '1';
      }, 50);
      
      setTimeout(() => {
        overlay.remove();
      }, 1500);
    }
    
    _EnablePlayerMovement() {
      // Réactiver le mouvement du joueur
      if (this._params.target && this._params.target.GetComponent('BasicCharacterController')) {
        const controller = this._params.target.GetComponent('BasicCharacterController');
        controller._enabled = true;
        console.log('✅ Player movement re-enabled');
      }
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
      if (!this._currentQuiz || !this._playerTurn || this._isAnimating || !this._isInCombat) {
        console.log('🚫 Quiz answer ignored - not ready:', {
          hasQuiz: !!this._currentQuiz,
          playerTurn: this._playerTurn,
          isAnimating: this._isAnimating,
          inCombat: this._isInCombat
        });
        return;
      }
      
      console.log('📝 Processing quiz answer:', selectedIndex);
      this._isAnimating = true;
      const options = document.querySelectorAll('.quiz-option');
      const correct = this._currentQuiz.correct;
      
      // Disable all options
      options.forEach(option => option.disabled = true);
      
      // Animate selection
      options[selectedIndex].style.transform = 'scale(1.1)';
      
      setTimeout(() => {
        // Show correct/incorrect feedback
        if (selectedIndex === correct) {
          this._PlayUISound('correct');
          options[selectedIndex].classList.add('correct');
          this._AddCombatLogAnimated('✅ Correct! You deal damage to the monster!', 'success');
          this._DamageMonster(25);
          this._ShakeScreen(false); // Victory shake
        } else {
          this._PlayUISound('incorrect');
          options[selectedIndex].classList.add('incorrect');
          options[correct].classList.add('correct');
          this._AddCombatLogAnimated('❌ Wrong answer! The monster attacks you!', 'error');
          this._DamagePlayer(20);
          this._ShakeScreen(true); // Damage shake
          
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
            this._isAnimating = false;
            this._ShowActionMenu();
            this._LoadRandomQuiz(); // Load new quiz for next turn
          }
        }, 2000);
      }, 500);
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
      
      // Check for level up
      if (this._playerXP >= this._playerXPToNextLevel) {
        this._LevelUp();
      }
      
      // Update XP display
      this._UpdateXPDisplay();
      
      setTimeout(() => {
        xpNotification.classList.add('hidden');
      }, 2000);
    }

    _LevelUp() {
      // Calculate remaining XP after level up
      const remainingXP = this._playerXP - this._playerXPToNextLevel;
      
      // Increase level
      this._playerLevel++;
      
      // Calculate new XP requirement (increases by 50 each level)
      this._playerXPToNextLevel = 100 + (this._playerLevel - 1) * 50;
      
      // Set remaining XP
      this._playerXP = remainingXP;
      
      // Increase player stats
      this._playerMaxHealth += 20;
      this._playerHealth = this._playerMaxHealth; // Full heal on level up
      
      // Show level up notification
      this._ShowLevelUpNotification();
      
      // Trigger level up effect
      this._TriggerLevelUpEffect();
      
      // Update health bars
      this._UpdateHealthBars();
      
      console.log(`🎉 LEVEL UP! Now level ${this._playerLevel}`);
      
      // Check if there's still enough XP for another level
      if (this._playerXP >= this._playerXPToNextLevel) {
        setTimeout(() => this._LevelUp(), 1000); // Delay for effect
      }
    }

    _UpdateXPDisplay() {
      // Update XP bar if it exists
      const xpBar = document.getElementById('player-xp');
      if (xpBar) {
        const xpPercent = (this._playerXP / this._playerXPToNextLevel) * 100;
        xpBar.style.width = xpPercent + '%';
      }
      
      // Update level display
      const levelDisplay = document.getElementById('player-level');
      if (levelDisplay) {
        levelDisplay.textContent = `Niveau ${this._playerLevel}`;
      }
      
      // Update XP text
      const xpText = document.getElementById('player-xp-text');
      if (xpText) {
        xpText.textContent = `${this._playerXP}/${this._playerXPToNextLevel} XP`;
      }
    }

    _ShowLevelUpNotification() {
      // Create or update level up notification
      let levelUpNotif = document.getElementById('level-up-notification');
      if (!levelUpNotif) {
        levelUpNotif = document.createElement('div');
        levelUpNotif.id = 'level-up-notification';
        levelUpNotif.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(45deg, #FFD700, #FFA500);
          color: #000;
          padding: 20px 40px;
          border-radius: 15px;
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          z-index: 10000;
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
          animation: levelUpPulse 2s ease-in-out;
        `;
        document.body.appendChild(levelUpNotif);
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes levelUpPulse {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
      
      levelUpNotif.innerHTML = `
        🎉 NIVEAU SUPÉRIEUR ! 🎉<br>
        <span style="font-size: 18px;">Niveau ${this._playerLevel}</span><br>
        <span style="font-size: 14px;">+20 PV Max | Soins complets</span>
      `;
      
      levelUpNotif.style.display = 'block';
      
      setTimeout(() => {
        levelUpNotif.style.display = 'none';
      }, 3000);
    }

    _TriggerLevelUpEffect() {
      // Get player position for particle effect
      const player = this._params.target._parent.Get('player');
      if (player) {
        const levelUpSpawner = this._params.target._parent.Get('level-up-spawner');
        if (levelUpSpawner) {
          const spawner = levelUpSpawner.GetComponent('LevelUpComponentSpawner');
          if (spawner) {
            spawner.Spawn(player._position.clone());
          }
        }
      }
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
    
    _RespawnPlayer() {
      // Get player entity
      const player = this._params.target._parent.Get('player');
      if (player) {
        console.log('🔄 Respawning player at starting position');
        
        // Reset player position to starting point
        player.SetPosition(new THREE.Vector3(0, 0, 0));
        
        // Reset player health
        this._playerHealth = this._playerMaxHealth;
        
        // Update health bar and XP display
        this._UpdateHealthBars();
        this._UpdateXPDisplay();
        
        console.log('✅ Player respawned successfully');
      }
    }

    _KillMonster() {
      if (this._currentMonster && this._currentMonster._target) {
        // Reset monster health for potential respawn
        this._currentMonster._health = this._currentMonster._maxHealth;
        
        // Move monster far away and deactivate it temporarily
        this._currentMonster._target.position.set(1000, 0, 1000);
        
        // Find the entity and deactivate it
        const entityManager = this._params.target._parent;
        const entities = entityManager._entities;
        for (let entity of entities) {
          const npcController = entity.GetComponent('NPCController');
          if (npcController === this._currentMonster) {
            console.log('🗑️ Deactivating defeated enemy:', entity._name);
            entity.SetActive(false);
            
            // Respawn after 10 seconds
            setTimeout(() => {
              if (entity && npcController) {
                console.log('🔄 Respawning enemy:', entity._name);
                npcController._health = npcController._maxHealth;
                entity.SetPosition(new THREE.Vector3(
                  20 + (Math.random() - 0.5) * 40,
                  0,
                  20 + (Math.random() - 0.5) * 40
                ));
                entity.SetActive(true);
              }
            }, 10000);
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
    
    _AddCombatLogAnimated(message, type = 'normal') {
      const log = document.getElementById('combat-log');
      const p = document.createElement('p');
      p.textContent = message;
      p.style.opacity = '0';
      p.style.transform = 'translateY(10px)';
      p.style.transition = 'all 0.3s ease';
      
      if (type === 'success') {
        p.style.color = '#4ade80';
        p.style.fontWeight = 'bold';
      } else if (type === 'error') {
        p.style.color = '#ef4444';
        p.style.fontWeight = 'bold';
      }
      
      log.appendChild(p);
      
      // Animate in
      setTimeout(() => {
        p.style.opacity = '1';
        p.style.transform = 'translateY(0)';
      }, 50);
      
      log.scrollTop = log.scrollHeight;
    }
    
    _ShakeScreen(isDamage = false) {
      const combatUI = document.getElementById('combat-ui');
      const intensity = isDamage ? 10 : 5;
      const duration = isDamage ? 500 : 300;
      
      let startTime = Date.now();
      
      const shake = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress < 1) {
          const x = (Math.random() - 0.5) * intensity * (1 - progress);
          const y = (Math.random() - 0.5) * intensity * (1 - progress);
          combatUI.style.transform = `translate(${x}px, ${y}px)`;
          requestAnimationFrame(shake);
        } else {
          combatUI.style.transform = 'translate(0, 0)';
        }
      };
      
      shake();
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
        // Transition back to original camera
        this._params.camera.position.lerpVectors(this._combatCameraPosition, this._originalCameraPosition, easedT);
        
        const currentLookAt = new THREE.Vector3().lerpVectors(this._combatCameraLookAt, this._originalCameraLookAt, easedT);
        this._params.camera.lookAt(currentLookAt);
        
        // Re-enable third person camera when transition is complete
        if (this._cameraTransitionProgress >= 1) {
          const camera = this._params.target._parent.Get('player-camera');
          if (camera) {
            camera.GetComponent('ThirdPersonCamera')._enabled = true;
            console.log('📷 Third person camera re-enabled');
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