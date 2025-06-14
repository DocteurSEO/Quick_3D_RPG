import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
import {entity} from './entity.js';
import {game_config} from './game-config.js';

export const combat_system = (() => {
  const {GameConfig} = game_config;

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
        },
        {
          question: "What is the square root of 64?",
          options: ["6", "7", "8", "9"],
          correct: 2
        },
        {
          question: "Which programming language is known for web development?",
          options: ["Python", "JavaScript", "C++", "Java"],
          correct: 1
        },
        {
          question: "What is 15 - 7?",
          options: ["6", "7", "8", "9"],
          correct: 2
        },
        {
          question: "Which is the largest ocean?",
          options: ["Atlantic", "Indian", "Arctic", "Pacific"],
          correct: 3
        },
        {
          question: "What is 3 × 7?",
          options: ["19", "20", "21", "22"],
          correct: 2
        },
        {
          question: "What does HTML stand for?",
          options: ["Hypertext Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hypermedia Text Markup Language"],
          correct: 0
        },
        {
          question: "What is 50 ÷ 5?",
          options: ["8", "9", "10", "11"],
          correct: 2
        }
      ];
      
      // Camera animation properties
      this._cameraAngles = [
        { position: { x: 0, y: 12, z: 15 }, lookAt: { x: 0, y: 2, z: 0 } },
        { position: { x: -10, y: 8, z: 10 }, lookAt: { x: 2, y: 3, z: -2 } },
        { position: { x: 8, y: 10, z: -8 }, lookAt: { x: -1, y: 2, z: 1 } },
        { position: { x: 12, y: 15, z: 5 }, lookAt: { x: -2, y: 1, z: 0 } },
        { position: { x: -5, y: 6, z: 12 }, lookAt: { x: 1, y: 4, z: -1 } }
      ];
      this._currentCameraAngle = 0;
      this._usedQuestions = new Set();
      
      this._currentQuiz = null;
      
      // Configuration du joueur basée sur game-config.js
      this._playerLevel = 1;
      this._playerXP = 0;
      this._playerDamageBonus = 0;  // Points ajoutés aux dégâts
      this._playerHealBonus = 0;    // Points ajoutés aux soins
      
      // Calcul des stats basées sur la configuration
      this._playerMaxHealth = GameConfig.formulas.playerMaxHealth(this._playerLevel);
      this._playerHealth = this._playerMaxHealth;
      this._playerXPToNextLevel = GameConfig.formulas.xpToNextLevel(this._playerLevel);
      
      // Système de progression
      this._pendingLevelUp = false;
      this._availableUpgradePoints = 0;
      
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
          this._HandleHealAction();
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
      
      // Recalculer la santé du monstre selon la configuration (50% plus faible que le joueur)
      const newMonsterHealth = GameConfig.formulas.enemyHealth(this._playerLevel);
      this._currentMonster._maxHealth = newMonsterHealth;
      this._currentMonster._health = newMonsterHealth;
      console.log('🔄 Monster health recalculated:', this._currentMonster._health, '/', this._currentMonster._maxHealth);
      this._playerTurn = true;
      this._isAnimating = false;
      
      // Stop player movement during combat
      this._params.target.GetComponent('BasicCharacterController')._velocity.set(0, 0, 0);
      
      // Initialize UI for this combat session
      this._InitUI();
      
      // Store original camera position
      this._originalCameraPosition.copy(this._params.camera.position);
      this._originalCameraLookAt.copy(this._params.target._position);
      
      // Calculate combat camera position with dynamic angles
      const monsterPos = this._currentMonster._position;
      const playerPos = this._params.target._position;
      
      // Position camera to show both combatants with dynamic angle
      const midPoint = new THREE.Vector3().addVectors(monsterPos, playerPos).multiplyScalar(0.5);
      this._SetDynamicCameraAngle(midPoint);
      
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
        this._PlayCombatStartSound();
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
        const xpReward = this._CalculateXPReward();
        this._AwardXP(xpReward);
        this._AddCombatLogAnimated(`🎉 Victory! You gained ${xpReward} XP!`, 'success');
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
      // Always load a different quiz from the current one
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * this._quizDatabase.length);
      } while (this._currentQuiz && this._quizDatabase[randomIndex] === this._currentQuiz);
      
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
      
      console.log(`📝 Loaded new player quiz: ${this._currentQuiz.question}`);
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
      
      // Calculate level-based damage
      const playerDamage = this._CalculatePlayerDamage();
      const monsterDamage = this._CalculateMonsterDamage();
      
      // Disable all options
      options.forEach(option => option.disabled = true);
      
      // Animate selection
      options[selectedIndex].style.transform = 'scale(1.1)';
      
      setTimeout(() => {
        // Show correct/incorrect feedback
        if (selectedIndex === correct) {
          this._PlayUISound('correct');
          options[selectedIndex].classList.add('correct');
          this._AddCombatLogAnimated(`✅ Correct! You deal ${playerDamage} damage to the monster!`, 'success');
          this._DamageMonster(playerDamage);
          this._ShakeScreen(false); // Victory shake
          
          // Play victory sound and create damage effect
          this._PlayVictorySound();
          if (this._currentMonster && this._currentMonster._position) {
            this._CreateDamageEffect(this._currentMonster._position, playerDamage, false);
          }
          this._PlayDamageSound(false);
        } else {
          this._PlayUISound('incorrect');
          options[selectedIndex].classList.add('incorrect');
          options[correct].classList.add('correct');
          this._AddCombatLogAnimated(`❌ Wrong answer! The monster deals ${monsterDamage} damage to you!`, 'error');
          this._DamagePlayer(monsterDamage);
          this._ShakeScreen(true); // Damage shake
          
          // Trigger monster attack animation
          this._TriggerMonsterAttack();
          
          // Play damage sound and create damage effect
          this._PlayDefeatSound();
          if (this._params.target && this._params.target._position) {
            this._CreateDamageEffect(this._params.target._position, monsterDamage, true);
          }
          this._PlayDamageSound(true);
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
            // Continue combat - start robot turn with new camera angle and question
            this._playerTurn = false;
            this._isAnimating = false;
            
            // Change camera angle for next turn
            this._ChangeCameraAngle();
            
            // Load new question for next turn
            this._LoadRandomQuiz();
            
            this._StartRobotTurn();
          }
        }, 2000);
      }, 500);
    }

    _DamageMonster(damage) {
      if (this._currentMonster) {
        this._currentMonster._health = Math.max(0, this._currentMonster._health - damage);
        
        // Add damage animation
        const monsterHealthBar = document.getElementById('monster-health');
        if (monsterHealthBar) {
          monsterHealthBar.style.animation = 'damageShake 0.5s ease-out';
          setTimeout(() => {
            monsterHealthBar.style.animation = '';
          }, 500);
        }
        
        // Show floating damage text
        this._ShowFloatingDamage(damage, 'monster');
        
        this._UpdateHealthBars();
        console.log(`Monster took ${damage} damage. Health: ${this._currentMonster._health}/${this._currentMonster._maxHealth}`);
      }
    }

    _ShowFloatingDamage(damage, target) {
      const floatingText = document.createElement('div');
      floatingText.textContent = `-${damage}`;
      floatingText.style.cssText = `
        position: fixed;
        color: #e74c3c;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 9999;
        animation: floatingDamage 2s ease-out forwards;
      `;
      
      // Position based on target
      if (target === 'player') {
        floatingText.style.left = '25%';
        floatingText.style.top = '20%';
      } else {
        floatingText.style.right = '25%';
        floatingText.style.top = '20%';
      }
      
      // Add floating animation if not exists
      if (!document.querySelector('#floatingDamageStyles')) {
        const style = document.createElement('style');
        style.id = 'floatingDamageStyles';
        style.textContent = `
          @keyframes floatingDamage {
            0% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
            50% {
              transform: translateY(-30px) scale(1.2);
              opacity: 1;
            }
            100% {
              transform: translateY(-60px) scale(0.8);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(floatingText);
      
      // Remove after animation
      setTimeout(() => {
        if (floatingText.parentNode) {
          floatingText.parentNode.removeChild(floatingText);
        }
      }, 2000);
    }

    _DamagePlayer(damage) {
      this._playerHealth = Math.max(0, this._playerHealth - damage);
      
      // Add damage animation
      const playerHealthBar = document.getElementById('player-health');
      if (playerHealthBar) {
        playerHealthBar.style.animation = 'damageShake 0.5s ease-out';
        setTimeout(() => {
          playerHealthBar.style.animation = '';
        }, 500);
      }
      
      // Show floating damage text
      this._ShowFloatingDamage(damage, 'player');
      
      this._UpdateHealthBars();
      console.log(`Player took ${damage} damage. Health: ${this._playerHealth}/${this._playerMaxHealth}`);
    }

    _UpdateHealthBars() {
      // Update player health bar with enhanced visuals
      const playerHealthBar = document.getElementById('player-health');
      if (playerHealthBar) {
        const healthPercentage = (this._playerHealth / this._playerMaxHealth) * 100;
        playerHealthBar.style.width = healthPercentage + '%';
        playerHealthBar.style.transition = 'width 0.5s ease-out';
        
        // Color coding based on health percentage
        if (healthPercentage > 60) {
          playerHealthBar.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
        } else if (healthPercentage > 30) {
          playerHealthBar.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
        } else {
          playerHealthBar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
          playerHealthBar.style.animation = 'healthPulse 1s infinite';
        }
        
        // Add health text overlay
        this._UpdateHealthText('player', this._playerHealth, this._playerMaxHealth);
      }
      
      // Update monster health bar with enhanced visuals
      const monsterHealthBar = document.getElementById('monster-health');
      if (monsterHealthBar && this._currentMonster) {
        const healthPercentage = (this._currentMonster._health / this._currentMonster._maxHealth) * 100;
        monsterHealthBar.style.width = healthPercentage + '%';
        monsterHealthBar.style.transition = 'width 0.5s ease-out';
        
        // Color coding for monster health
        if (healthPercentage > 60) {
          monsterHealthBar.style.background = 'linear-gradient(90deg, #8e44ad, #9b59b6)';
        } else if (healthPercentage > 30) {
          monsterHealthBar.style.background = 'linear-gradient(90deg, #d35400, #e67e22)';
        } else {
          monsterHealthBar.style.background = 'linear-gradient(90deg, #c0392b, #e74c3c)';
          monsterHealthBar.style.animation = 'healthPulse 1s infinite';
        }
        
        // Add health text overlay
        this._UpdateHealthText('monster', this._currentMonster._health, this._currentMonster._maxHealth);
      }
    }

    _UpdateHealthText(type, currentHealth, maxHealth) {
      let healthTextElement = document.getElementById(`${type}-health-text`);
      
      if (!healthTextElement) {
        // Create health text element if it doesn't exist
        healthTextElement = document.createElement('div');
        healthTextElement.id = `${type}-health-text`;
        healthTextElement.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: bold;
          font-size: 12px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
          pointer-events: none;
          z-index: 10;
        `;
        
        const healthContainer = document.getElementById(`${type}-health-container`);
        if (healthContainer) {
          healthContainer.style.position = 'relative';
          healthContainer.appendChild(healthTextElement);
        }
      }
      
      healthTextElement.textContent = `${currentHealth}/${maxHealth}`;
    }

    _MoveCameraToRobot() {
      if (this._currentMonster && this._currentMonster._entity) {
        const robotEntity = this._currentMonster._entity;
        let robotPosition;
        
        // Try different ways to get position
        if (robotEntity.Position) {
          robotPosition = robotEntity.Position;
        } else if (robotEntity._position) {
          robotPosition = robotEntity._position;
        } else if (robotEntity.position) {
          robotPosition = robotEntity.position;
        } else {
          console.log('❌ Cannot find robot position');
          return;
        }
        
        const targetX = robotPosition.x + 3; // Better offset for robot view
        const targetZ = robotPosition.z + 3;
        const targetY = robotPosition.y + 8; // Higher angle for robot
        
        console.log(`📹 Moving camera to robot at (${targetX}, ${targetY}, ${targetZ})`);
        this._AnimateCameraTo(targetX, targetY, targetZ, 1500);
      } else {
        console.log('❌ No current monster or entity for camera movement');
      }
    }

    _MoveCameraToPlayer() {
      const player = this._params.target;
      if (player) {
        let playerPosition;
        
        // Try different ways to get player position
        if (player.Position) {
          playerPosition = player.Position;
        } else if (player._position) {
          playerPosition = player._position;
        } else if (player.position) {
          playerPosition = player.position;
        } else {
          console.log('❌ Cannot find player position');
          return;
        }
        
        const targetX = playerPosition.x - 3; // Better offset for player view
        const targetZ = playerPosition.z - 3;
        const targetY = playerPosition.y + 6; // Lower angle for player
        
        console.log(`📹 Moving camera to player at (${targetX}, ${targetY}, ${targetZ})`);
        this._AnimateCameraTo(targetX, targetY, targetZ, 1500);
      } else {
        console.log('❌ No player found for camera movement');
      }
    }

    _AnimateCameraTo(targetX, targetY, targetZ, duration) {
      if (!this._threejs || !this._threejs._camera) return;
      
      const camera = this._threejs._camera;
      const startPos = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      };
      
      const startTime = Date.now();
      
      const animateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing function
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        camera.position.x = startPos.x + (targetX - startPos.x) * easeProgress;
        camera.position.y = startPos.y + (targetY - startPos.y) * easeProgress;
        camera.position.z = startPos.z + (targetZ - startPos.z) * easeProgress;
        
        // Look at the target
        camera.lookAt(targetX, 0, targetZ);
        
        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        }
      };
      
      animateCamera();
    }

    _CalculatePlayerDamage() {
      return GameConfig.formulas.playerDamage(this._playerLevel, this._playerDamageBonus);
    }

    _CalculateMonsterDamage() {
      return GameConfig.formulas.enemyDamage(this._playerLevel, this._playerDamageBonus);
    }

    _CalculateXPReward() {
      return GameConfig.formulas.xpReward(this._playerLevel);
    }

    _GetMonsterLevel() {
      // Use the current monster's level if available, otherwise calculate based on player level
      if (this._currentMonster && this._currentMonster._level) {
        return this._currentMonster._level;
      }
      
      // Fallback: Monster level is based on player level with some variation
      const minLevel = Math.max(1, this._playerLevel - 1);
      const maxLevel = this._playerLevel + 1;
      return Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
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
      
      // Calculate new XP requirement using config
      this._playerXPToNextLevel = GameConfig.formulas.xpToNextLevel(this._playerLevel);
      
      // Set remaining XP
      this._playerXP = remainingXP;
      
      // Recalculate max health based on new level
      const oldMaxHealth = this._playerMaxHealth;
      this._playerMaxHealth = GameConfig.formulas.playerMaxHealth(this._playerLevel);
      const healthIncrease = this._playerMaxHealth - oldMaxHealth;
      this._playerHealth += healthIncrease; // Add the health increase to current health
      
      // Add upgrade points
      this._availableUpgradePoints += GameConfig.progression.pointsPerLevel;
      this._pendingLevelUp = true;
      
      // Show level up notification with upgrade choice
      this._ShowLevelUpNotification();
      
      // Trigger level up effect
      this._TriggerLevelUpEffect();
      
      // Update health bars
      this._UpdateHealthBars();
      
      console.log(`🎉 LEVEL UP! Now level ${this._playerLevel}`);
      console.log(`💎 You have ${this._availableUpgradePoints} upgrade points to spend!`);
      
      // Show upgrade menu
      this._ShowUpgradeMenu();
      
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
          @keyframes resetShake {
            0%, 100% { transform: translate(-50%, -50%) translateX(0); }
            25% { transform: translate(-50%, -50%) translateX(-10px); }
            75% { transform: translate(-50%, -50%) translateX(10px); }
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

    _ShowResetNotification() {
      // Create reset notification element
      const notification = document.createElement('div');
      notification.className = 'reset-notification';
      notification.innerHTML = `
        <div class="reset-content">
          <h2>💀 DÉFAITE!</h2>
          <p>Retour au niveau 1</p>
          <p>Progression réinitialisée</p>
        </div>
      `;
      
      // Add styles
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff4444, #cc0000);
        color: white;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(255, 68, 68, 0.5);
        z-index: 10000;
        text-align: center;
        font-family: Arial, sans-serif;
        border: 3px solid #990000;
        animation: resetShake 0.8s ease-out;
      `;
      
      document.body.appendChild(notification);
      
      // Remove after 4 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 4000);
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

    _StartRobotTurn() {
      console.log('🤖 Starting robot turn');
      
      // Show robot turn indicator
      this._ShowRobotTurnIndicator();
      
      // Add camera movement toward robot
      this._MoveCameraToRobot();
      
      // Wait a moment then let robot answer
      setTimeout(() => {
        this._RobotAnswerQuestion();
      }, 1500);
    }

    _ShowRobotTurnIndicator() {
      // Add visual indicator that it's robot's turn
      const indicator = document.createElement('div');
      indicator.id = 'robot-turn-indicator';
      indicator.innerHTML = '🤖 Tour du Robot...';
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4a90e2, #357abd);
        color: white;
        padding: 10px 20px;
        border-radius: 25px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(74, 144, 226, 0.3);
        animation: robotPulse 1s infinite alternate;
      `;
      
      // Add animation if not exists
      if (!document.querySelector('#robotTurnStyles')) {
        const style = document.createElement('style');
        style.id = 'robotTurnStyles';
        style.textContent = `
          @keyframes robotPulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.05); opacity: 1; }
          }
          @keyframes robotSelection {
              0% { background-color: rgba(231, 76, 60, 0.2); }
              50% { background-color: rgba(231, 76, 60, 0.6); }
              100% { background-color: rgba(231, 76, 60, 0.2); }
            }
            @keyframes robotTextGlow {
              0% { text-shadow: 0 0 10px rgba(231, 76, 60, 0.5); }
              100% { text-shadow: 0 0 20px rgba(231, 76, 60, 0.8), 0 0 30px rgba(231, 76, 60, 0.4); }
            }
            @keyframes playerTextGlow {
              0% { text-shadow: 0 0 10px rgba(74, 144, 226, 0.5); }
              100% { text-shadow: 0 0 20px rgba(74, 144, 226, 0.8), 0 0 30px rgba(74, 144, 226, 0.4); }
            }
            @keyframes healthPulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
            @keyframes damageShake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-5px); }
              75% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(indicator);
      
      // Remove indicator after robot turn
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 4000);
    }

    _RobotAnswerQuestion() {
      if (this._isAnimating) {
        console.log('🚫 Robot cannot answer - animation in progress');
        return;
      }
      
      console.log('🤖 Robot is thinking...');
      this._isAnimating = true;
      
      // Use the current quiz that was already loaded
      this._robotQuiz = this._currentQuiz;
      
      // Robot AI logic - for now, random with slight bias toward correct answer
      const robotAnswer = this._CalculateRobotAnswer();
      
      // Show robot selection animation
      this._AnimateRobotSelection(robotAnswer);
    }

    _CalculateRobotAnswer() {
      // Simple AI: 70% chance to get it right, 30% chance to be wrong
      const correctAnswer = this._currentQuiz.correct;
      const shouldBeCorrect = Math.random() < 0.7;
      
      if (shouldBeCorrect) {
        return correctAnswer;
      } else {
        // Pick a random wrong answer
        const wrongAnswers = [];
        for (let i = 0; i < this._currentQuiz.options.length; i++) {
          if (i !== correctAnswer) {
            wrongAnswers.push(i);
          }
        }
        return wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
      }
    }

    _LoadRobotQuiz() {
      // Always load a completely new quiz for the robot (different from current player quiz AND previous robot quiz)
      let robotQuizIndex;
      do {
        robotQuizIndex = Math.floor(Math.random() * this._quizDatabase.length);
      } while ((this._currentQuiz && this._quizDatabase[robotQuizIndex] === this._currentQuiz) || 
               (this._robotQuiz && this._quizDatabase[robotQuizIndex] === this._robotQuiz));
      
      this._robotQuiz = this._quizDatabase[robotQuizIndex];
      
      console.log(`🤖 Loaded new robot quiz: ${this._robotQuiz.question}`);
      
      // Update UI to show robot's question with different styling
      this._ShowRobotQuizUI();
    }

    _ShowRobotQuizUI() {
      const quizContainer = document.getElementById('quiz-container');
      if (!quizContainer) return;
      
      // Add entrance animation
      quizContainer.style.transform = 'scale(0.9)';
      quizContainer.style.transition = 'all 0.5s ease-out';
      
      // Change the quiz container styling for robot turn
      quizContainer.style.background = 'linear-gradient(135deg, #2c3e50, #34495e)';
      quizContainer.style.border = '3px solid #e74c3c';
      quizContainer.style.boxShadow = '0 0 30px rgba(231, 76, 60, 0.8), inset 0 0 20px rgba(231, 76, 60, 0.2)';
      
      // Update question text with animation
      const questionElement = document.getElementById('quiz-question');
      if (questionElement) {
        questionElement.innerHTML = `🤖 Question du Robot: ${this._currentQuiz.question}`;
        questionElement.style.color = '#e74c3c';
        questionElement.style.fontWeight = 'bold';
        questionElement.style.textShadow = '0 0 10px rgba(231, 76, 60, 0.5)';
        questionElement.style.animation = 'robotTextGlow 2s ease-in-out infinite alternate';
      }
      
      // Update options with robot styling and animations
      const options = document.querySelectorAll('.quiz-option');
      options.forEach((option, index) => {
        const optionText = option.querySelector('.option-text');
        if (optionText) {
          optionText.textContent = `${String.fromCharCode(65 + index)}) ${this._currentQuiz.options[index]}`;
        }
        option.style.background = 'linear-gradient(135deg, #34495e, #2c3e50)';
        option.style.border = '2px solid #e74c3c';
        option.style.color = '#ecf0f1';
        option.style.transition = 'all 0.3s ease';
        option.style.transform = 'translateX(-20px)';
        option.disabled = true; // Player can't click during robot turn
        
        // Staggered entrance animation
        setTimeout(() => {
          option.style.transform = 'translateX(0)';
        }, index * 100);
      });
      
      // Scale back to normal
      setTimeout(() => {
        quizContainer.style.transform = 'scale(1)';
      }, 100);
    }

    _AnimateRobotSelection(selectedIndex) {
      const options = document.querySelectorAll('.quiz-option');
      
      // Show robot "thinking" by highlighting options one by one
      let currentOption = 0;
      const thinkingInterval = setInterval(() => {
        // Remove previous highlight
        options.forEach(option => {
          option.style.animation = '';
          option.style.backgroundColor = '';
        });
        
        // Highlight current option with robot colors
        if (options[currentOption]) {
          options[currentOption].style.animation = 'robotSelection 0.5s ease-in-out';
          options[currentOption].style.backgroundColor = 'rgba(231, 76, 60, 0.3)';
        }
        
        currentOption = (currentOption + 1) % options.length;
      }, 300);
      
      // After thinking animation, make selection
      setTimeout(() => {
        clearInterval(thinkingInterval);
        
        // Remove all highlights
        options.forEach(option => {
          option.style.animation = '';
          option.style.backgroundColor = '';
        });
        
        // Make final selection
        this._ProcessRobotAnswer(selectedIndex);
      }, 2000);
    }

    _ProcessRobotAnswer(selectedIndex) {
      const options = document.querySelectorAll('.quiz-option');
      const correct = this._robotQuiz.correct;
      
      // Calculate level-based damage
      const robotDamage = this._CalculateRobotDamage();
      const playerDamage = this._CalculatePlayerDamage();
      
      // Disable all options
      options.forEach(option => option.disabled = true);
      
      // Animate robot selection with robot colors
      options[selectedIndex].style.transform = 'scale(1.1)';
      options[selectedIndex].style.border = '3px solid #e74c3c';
      options[selectedIndex].style.boxShadow = '0 0 15px rgba(231, 76, 60, 0.7)';
      
      setTimeout(() => {
        // Show correct/incorrect feedback for robot
        if (selectedIndex === correct) {
          this._PlayUISound('correct');
          options[selectedIndex].classList.add('correct');
          options[selectedIndex].style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
          this._AddCombatLogAnimated(`🤖 Robot correct! Robot deals ${robotDamage} damage to you!`, 'robot-success');
          this._DamagePlayer(robotDamage);
          this._ShakeScreen(true); // Damage shake for player
        } else {
          this._PlayUISound('incorrect');
          options[selectedIndex].classList.add('incorrect');
          options[selectedIndex].style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
          options[correct].classList.add('correct');
          options[correct].style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
          this._AddCombatLogAnimated(`🤖 Robot wrong! You deal ${playerDamage} damage to robot!`, 'robot-error');
          this._DamageMonster(playerDamage);
          this._ShakeScreen(false); // Victory shake
        }
        
        // Check for combat end after robot turn
        setTimeout(() => {
          if (this._currentMonster && this._currentMonster._health <= 0) {
            this._KillMonster();
            console.log('Monster defeated by robot mistake, ending combat');
            this._EndCombat({
              playerWon: true
            });
          } else if (this._playerHealth <= 0) {
            console.log('Player defeated by robot, ending combat');
            this._EndCombat({
              playerWon: false
            });
          } else {
            // Continue combat - return to player turn
             this._RestorePlayerQuizUI();
             this._MoveCameraToPlayer();
             this._playerTurn = true;
             this._isAnimating = false;
             this._ShowActionMenu();
             this._LoadRandomQuiz(); // Load completely new quiz for next turn
          }
        }, 2000);
      }, 500);
    }

    _RestorePlayerQuizUI() {
      // Restore original quiz UI styling for player turn with animation
      const quizContainer = document.getElementById('quiz-container');
      if (quizContainer) {
        quizContainer.style.transform = 'scale(0.95)';
        quizContainer.style.transition = 'all 0.5s ease-out';
        quizContainer.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        quizContainer.style.border = '2px solid #4a90e2';
        quizContainer.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), 0 0 20px rgba(74, 144, 226, 0.3)';
        
        setTimeout(() => {
          quizContainer.style.transform = 'scale(1)';
        }, 100);
      }
      
      const questionElement = document.getElementById('quiz-question');
      if (questionElement) {
        questionElement.style.color = '#ffffff';
        questionElement.style.fontWeight = 'normal';
        questionElement.style.textShadow = '0 0 10px rgba(74, 144, 226, 0.5)';
        questionElement.style.animation = 'playerTextGlow 2s ease-in-out infinite alternate';
      }
      
      const options = document.querySelectorAll('.quiz-option');
      options.forEach((option, index) => {
        option.style.background = 'rgba(255, 255, 255, 0.1)';
        option.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        option.style.color = '#ffffff';
        option.style.transform = 'translateX(20px)';
        option.style.boxShadow = '';
        option.style.transition = 'all 0.3s ease';
        option.disabled = false;
        option.classList.remove('correct', 'incorrect');
        
        // Staggered entrance animation
        setTimeout(() => {
          option.style.transform = 'translateX(0)';
        }, index * 100);
      });
    }

    _CalculateRobotDamage() {
      return GameConfig.formulas.enemyDamage(this._playerLevel, this._playerDamageBonus);
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
        
        // Reset player level and stats to starting values
        this._playerLevel = 1;
        this._playerXP = 0;
        this._playerXPToNextLevel = 100;
        this._playerMaxHealth = 100; // Reset to base health
        this._playerHealth = this._playerMaxHealth;
        
        // Update health bar and XP display
        this._UpdateHealthBars();
        this._UpdateXPDisplay();
        
        // Show reset notification
        this._ShowResetNotification();
        
        console.log('✅ Player respawned at level 1 with reset stats');
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
      } else if (type === 'heal') {
        p.classList.add('heal-log');
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

    _SetDynamicCameraAngle(midPoint) {
      // Get current camera angle configuration
      const angleConfig = this._cameraAngles[this._currentCameraAngle];
      
      // Apply relative positioning to the midpoint
      this._combatCameraPosition.copy(midPoint);
      this._combatCameraPosition.x += angleConfig.position.x;
      this._combatCameraPosition.y += angleConfig.position.y;
      this._combatCameraPosition.z += angleConfig.position.z;
      
      this._combatCameraLookAt.copy(midPoint);
      this._combatCameraLookAt.x += angleConfig.lookAt.x;
      this._combatCameraLookAt.y += angleConfig.lookAt.y;
      this._combatCameraLookAt.z += angleConfig.lookAt.z;
      
      console.log(`📹 Using camera angle ${this._currentCameraAngle + 1}/${this._cameraAngles.length}`);
    }
    
    _ChangeCameraAngle() {
      // Cycle to next camera angle
      this._currentCameraAngle = (this._currentCameraAngle + 1) % this._cameraAngles.length;
      
      // Recalculate camera position with new angle
      const monsterPos = this._currentMonster._position;
      const playerPos = this._params.target._position;
      const midPoint = new THREE.Vector3().addVectors(monsterPos, playerPos).multiplyScalar(0.5);
      
      this._SetDynamicCameraAngle(midPoint);
      
      // Start camera transition to new angle
      this._isTransitioning = true;
      this._cameraTransitionProgress = 0;
      
      // Play camera change sound
      this._PlayCameraChangeSound();
    }
    
    _LoadRandomQuiz() {
      // Get unused questions
      const availableQuestions = this._quizDatabase.filter((_, index) => !this._usedQuestions.has(index));
      
      // If all questions used, reset the used set
      if (availableQuestions.length === 0) {
        this._usedQuestions.clear();
        availableQuestions.push(...this._quizDatabase);
      }
      
      // Select random question from available ones
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      const selectedQuestion = availableQuestions[randomIndex];
      
      // Mark this question as used
      const originalIndex = this._quizDatabase.indexOf(selectedQuestion);
      this._usedQuestions.add(originalIndex);
      
      this._currentQuiz = selectedQuestion;
      
      // Update UI
      document.getElementById('quiz-question').textContent = this._currentQuiz.question;
      const options = document.querySelectorAll('.quiz-option');
      options.forEach((option, index) => {
        option.textContent = this._currentQuiz.options[index];
        option.classList.remove('correct', 'incorrect');
        option.disabled = false;
      });
      
      console.log(`🎯 Loaded new question: "${this._currentQuiz.question}"`);
    }
    
    _CreateDamageEffect(position, damage, isPlayer = false) {
      // Create floating damage text
      const damageElement = document.createElement('div');
      damageElement.textContent = `-${damage}`;
      damageElement.style.position = 'fixed';
      damageElement.style.fontSize = '24px';
      damageElement.style.fontWeight = 'bold';
      damageElement.style.color = isPlayer ? '#ff4444' : '#ffaa00';
      damageElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
      damageElement.style.pointerEvents = 'none';
      damageElement.style.zIndex = '10000';
      damageElement.style.transition = 'all 1s ease-out';
      
      // Convert 3D position to screen coordinates
      const vector = new THREE.Vector3();
      vector.copy(position);
      vector.project(this._params.camera);
      
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
      
      damageElement.style.left = x + 'px';
      damageElement.style.top = y + 'px';
      
      document.body.appendChild(damageElement);
      
      // Animate damage text
      setTimeout(() => {
        damageElement.style.transform = 'translateY(-50px)';
        damageElement.style.opacity = '0';
      }, 100);
      
      // Remove element after animation
      setTimeout(() => {
        document.body.removeChild(damageElement);
      }, 1100);
      
      // Create particle effect if particle system is available
      this._CreateParticleEffect(position, isPlayer);
    }
    
    _CreateParticleEffect(position, isPlayer = false) {
      // Create simple particle effect using CSS
      for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.backgroundColor = isPlayer ? '#ff4444' : '#ffaa00';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        
        // Convert 3D position to screen coordinates
        const vector = new THREE.Vector3();
        vector.copy(position);
        vector.project(this._params.camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
        
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        
        document.body.appendChild(particle);
        
        // Random direction for each particle
        const angle = (i / 8) * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        const endX = x + Math.cos(angle) * distance;
        const endY = y + Math.sin(angle) * distance;
        
        particle.style.transition = 'all 0.8s ease-out';
        
        setTimeout(() => {
          particle.style.left = endX + 'px';
          particle.style.top = endY + 'px';
          particle.style.opacity = '0';
          particle.style.transform = 'scale(0)';
        }, 50);
        
        // Remove particle after animation
        setTimeout(() => {
          document.body.removeChild(particle);
        }, 850);
      }
    }
    
    _PlayCombatStartSound() {
      this._PlayDynamicSound('combat_start', [400, 600, 800], [0.2, 0.15, 0.1], [0.1, 0.2, 0.3]);
    }
    
    _PlayCameraChangeSound() {
      this._PlayDynamicSound('camera_change', [1000, 1200], [0.1, 0.08], [0.15, 0.15]);
    }
    
    _PlayDamageSound(isPlayer = false) {
      if (isPlayer) {
        this._PlayDynamicSound('player_damage', [300, 250], [0.2, 0.15], [0.2, 0.3]);
      } else {
        this._PlayDynamicSound('monster_damage', [500, 400], [0.15, 0.12], [0.2, 0.25]);
      }
    }
    
    _PlayVictorySound() {
      this._PlayDynamicSound('victory', [800, 1000, 1200, 1500], [0.2, 0.18, 0.15, 0.12], [0.2, 0.2, 0.2, 0.4]);
    }
    
    _PlayDefeatSound() {
      this._PlayDynamicSound('defeat', [400, 300, 200], [0.25, 0.2, 0.15], [0.3, 0.3, 0.4]);
    }
    
    _PlayDynamicSound(type, frequencies, volumes, durations) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        frequencies.forEach((freq, index) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1);
          gainNode.gain.setValueAtTime(volumes[index] || 0.1, audioContext.currentTime + index * 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + (durations[index] || 0.2));
          
          oscillator.start(audioContext.currentTime + index * 0.1);
          oscillator.stop(audioContext.currentTime + index * 0.1 + (durations[index] || 0.2));
        });
      } catch (error) {
        console.log('Audio not available:', error);
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

    _HandleHealAction() {
      if (!this._playerTurn || this._isAnimating || !this._isInCombat) {
        console.log('🚫 Heal action ignored - not player turn or animating');
        return;
      }
      
      console.log('💚 Player uses heal action');
      this._isAnimating = true;
      
      // Calcul des soins basé sur la configuration
      const healAmount = GameConfig.formulas.playerHeal(this._playerLevel, this._playerHealBonus);
      const oldHealth = this._playerHealth;
      this._playerHealth = Math.min(this._playerMaxHealth, this._playerHealth + healAmount);
      const actualHeal = this._playerHealth - oldHealth;
      
      // Show heal effect
      this._ShowHealEffect(actualHeal);
      
      // Add combat log
      this._AddCombatLogAnimated(`💚 Vous vous soignez et récupérez ${actualHeal} points de vie!`, 'heal');
      
      // Update health bars
      this._UpdateHealthBars();
      
      // Play heal sound
      this._PlayHealSound();
      
      // End player turn and start robot turn
      setTimeout(() => {
        this._playerTurn = false;
        this._isAnimating = false;
        
        // Change camera angle for next turn
        this._ChangeCameraAngle();
        
        // Load new question for next turn
        this._LoadRandomQuiz();
        
        // Robot automatically chooses quiz
        this._StartRobotTurn();
      }, 2000);
    }
    
    _ShowHealEffect(healAmount) {
      // Create floating heal text
      const floatingText = document.createElement('div');
      floatingText.textContent = `+${healAmount}`;
      floatingText.style.cssText = `
        position: fixed;
        color: #27ae60;
        font-size: 28px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 9999;
        animation: floatingHeal 2s ease-out forwards;
      `;
      
      // Position on player side
      floatingText.style.left = '25%';
      floatingText.style.top = '20%';
      
      // Add floating heal animation if not exists
      if (!document.querySelector('#floatingHealStyles')) {
        const style = document.createElement('style');
        style.id = 'floatingHealStyles';
        style.textContent = `
          @keyframes floatingHeal {
            0% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
            50% {
              transform: translateY(-30px) scale(1.2);
              opacity: 1;
            }
            100% {
              transform: translateY(-60px) scale(0.8);
              opacity: 0;
            }
          }
          .heal-log {
            color: #27ae60 !important;
            text-shadow: 0 0 10px rgba(39, 174, 96, 0.5);
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(floatingText);
      
      // Remove after animation
      setTimeout(() => {
        if (floatingText.parentNode) {
          floatingText.parentNode.removeChild(floatingText);
        }
      }, 2000);
      
      // Create heal particles
      this._CreateHealParticles();
    }
    
    _CreateHealParticles() {
      const combatPanel = document.querySelector('.combat-panel');
      if (!combatPanel) return;
      
      for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = '8px';
        particle.style.height = '8px';
        particle.style.background = '#27ae60';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1200';
        particle.style.boxShadow = '0 0 10px #27ae60';
        
        const startX = Math.random() * combatPanel.offsetWidth * 0.5; // Left side for player
        const startY = Math.random() * combatPanel.offsetHeight;
        particle.style.left = startX + 'px';
        particle.style.top = startY + 'px';
        
        combatPanel.appendChild(particle);
        
        // Animate the particle
        const animation = particle.animate([
          { 
            transform: 'translate(0, 0) scale(1)', 
            opacity: 1 
          },
          { 
            transform: `translate(${(Math.random() - 0.5) * 100}px, ${-50 - Math.random() * 50}px) scale(0)`, 
            opacity: 0 
          }
        ], {
          duration: 1500 + Math.random() * 500,
          easing: 'ease-out'
        });
        
        animation.onfinish = () => particle.remove();
      }
    }
    
    _PlayHealSound() {
      this._PlayDynamicSound(523.25, 0.3, 0.4); // C5 note for heal
      setTimeout(() => {
        this._PlayDynamicSound(659.25, 0.3, 0.4); // E5 note
      }, 200);
      setTimeout(() => {
        this._PlayDynamicSound(783.99, 0.3, 0.6); // G5 note
      }, 400);
    }

    _ShowUpgradeMenu() {
      // Créer le menu d'amélioration
      const upgradeMenu = document.createElement('div');
      upgradeMenu.id = 'upgrade-menu';
      upgradeMenu.innerHTML = `
        <div class="upgrade-container">
          <h2>🎉 NIVEAU ${this._playerLevel}! 🎉</h2>
          <p>Vous avez ${this._availableUpgradePoints} points à dépenser</p>
          <div class="upgrade-options">
            <div class="upgrade-option" data-type="damage">
              <h3>⚔️ Dégâts (+${GameConfig.progression.damagePerPoint} par point)</h3>
              <p>Actuellement: +${this._playerDamageBonus}</p>
              <button onclick="combatSystem._UpgradeAttribute('damage')">Améliorer</button>
            </div>
            <div class="upgrade-option" data-type="heal">
              <h3>💚 Soins (+${GameConfig.progression.healPerPoint} par point)</h3>
              <p>Actuellement: +${this._playerHealBonus}</p>
              <button onclick="combatSystem._UpgradeAttribute('heal')">Améliorer</button>
            </div>
          </div>
          <button class="finish-upgrade" onclick="combatSystem._FinishUpgrade()">Terminer</button>
        </div>
      `;
      
      // Ajouter les styles
      upgradeMenu.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: 'Courier New', monospace;
      `;
      
      const container = upgradeMenu.querySelector('.upgrade-container');
      container.style.cssText = `
        background: linear-gradient(135deg, #2c3e50, #34495e);
        padding: 30px;
        border-radius: 15px;
        border: 3px solid #f39c12;
        text-align: center;
        color: white;
        box-shadow: 0 0 30px rgba(243, 156, 18, 0.5);
      `;
      
      const options = upgradeMenu.querySelectorAll('.upgrade-option');
      options.forEach(option => {
        option.style.cssText = `
          background: rgba(52, 73, 94, 0.8);
          margin: 15px;
          padding: 20px;
          border-radius: 10px;
          border: 2px solid #3498db;
          cursor: pointer;
          transition: all 0.3s ease;
        `;
        
        option.addEventListener('mouseenter', () => {
          option.style.borderColor = '#f39c12';
          option.style.transform = 'scale(1.05)';
        });
        
        option.addEventListener('mouseleave', () => {
          option.style.borderColor = '#3498db';
          option.style.transform = 'scale(1)';
        });
      });
      
      const buttons = upgradeMenu.querySelectorAll('button');
      buttons.forEach(button => {
        button.style.cssText = `
          background: #e74c3c;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          margin: 5px;
          transition: background 0.3s ease;
        `;
        
        button.addEventListener('mouseenter', () => {
          button.style.background = '#c0392b';
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.background = '#e74c3c';
        });
      });
      
      document.body.appendChild(upgradeMenu);
      
      // Exposer les méthodes globalement pour les boutons
      window.combatSystem = this;
    }

    _UpgradeAttribute(type) {
      if (this._availableUpgradePoints <= 0) {
        console.log('❌ Pas assez de points d\'amélioration!');
        return;
      }
      
      if (type === 'damage') {
        this._playerDamageBonus += GameConfig.progression.damagePerPoint;
        console.log(`⚔️ Dégâts améliorés! Bonus: +${this._playerDamageBonus}`);
      } else if (type === 'heal') {
        this._playerHealBonus += GameConfig.progression.healPerPoint;
        console.log(`💚 Soins améliorés! Bonus: +${this._playerHealBonus}`);
      }
      
      this._availableUpgradePoints--;
      
      // Mettre à jour l'affichage
      this._UpdateUpgradeDisplay();
      
      // Jouer un son d'amélioration
      this._PlayUpgradeSound();
    }

    _UpdateUpgradeDisplay() {
      const upgradeMenu = document.getElementById('upgrade-menu');
      if (upgradeMenu) {
        const pointsDisplay = upgradeMenu.querySelector('p');
        pointsDisplay.textContent = `Vous avez ${this._availableUpgradePoints} points à dépenser`;
        
        const damageDisplay = upgradeMenu.querySelector('[data-type="damage"] p');
        damageDisplay.textContent = `Actuellement: +${this._playerDamageBonus}`;
        
        const healDisplay = upgradeMenu.querySelector('[data-type="heal"] p');
        healDisplay.textContent = `Actuellement: +${this._playerHealBonus}`;
        
        // Désactiver les boutons si plus de points
        const buttons = upgradeMenu.querySelectorAll('.upgrade-option button');
        buttons.forEach(button => {
          button.disabled = this._availableUpgradePoints <= 0;
          if (button.disabled) {
            button.style.background = '#7f8c8d';
            button.style.cursor = 'not-allowed';
          }
        });
      }
    }

    _FinishUpgrade() {
      const upgradeMenu = document.getElementById('upgrade-menu');
      if (upgradeMenu) {
        upgradeMenu.remove();
      }
      
      this._pendingLevelUp = false;
      
      // Nettoyer la référence globale
      if (window.combatSystem === this) {
        delete window.combatSystem;
      }
      
      console.log('✅ Améliorations terminées!');
      console.log(`📊 Stats actuelles - Dégâts: +${this._playerDamageBonus}, Soins: +${this._playerHealBonus}`);
    }

    _PlayUpgradeSound() {
      // Son d'amélioration - séquence ascendante
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const frequencies = [523.25, 659.25, 783.99]; // Do, Mi, Sol
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + index * 0.1);
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + index * 0.1);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + index * 0.1 + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + index * 0.1 + 0.2);
        
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + index * 0.1 + 0.2);
      });
    }

    // Méthodes utilitaires pour accéder aux stats depuis la configuration
    GetPlayerStats() {
      return {
        level: this._playerLevel,
        health: this._playerHealth,
        maxHealth: this._playerMaxHealth,
        xp: this._playerXP,
        xpToNext: this._playerXPToNextLevel,
        damageBonus: this._playerDamageBonus,
        healBonus: this._playerHealBonus,
        damage: this._CalculatePlayerDamage(),
        heal: GameConfig.formulas.playerHeal(this._playerLevel, this._playerHealBonus)
      };
    }

    GetEnemyStats() {
      return {
        damage: this._CalculateMonsterDamage(),
        health: GameConfig.formulas.enemyHealth(this._playerLevel)
      };
    }

    get IsInCombat() {
      return this._isInCombat;
    }
  }

  return {
    CombatSystem: CombatSystem
  };

})();