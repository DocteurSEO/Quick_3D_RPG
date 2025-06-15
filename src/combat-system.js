import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';
import {entity} from './entity.js';
import {game_config} from './game-config.js';
import {quiz_database} from './quiz-database-children.js';
import {spatial_audio_system} from './spatial-audio-system.js';

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
      
      // Utilisation de la base de données externalisée
      this._quizDatabase = quiz_database.getAllQuestions();
      
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
      
      // Système d'audio spatial
      this._spatialAudio = null;
    }

    InitComponent() {
      console.log('✅ CombatSystem initialized');
      
      // Initialiser le système d'audio spatial
      this._spatialAudio = new spatial_audio_system.SpatialAudioSystem();
      
      // Initialiser le contrôle audio
      setTimeout(() => {
        this._InitializeAudioControl();
      }, 100); // Petit délai pour s'assurer que le DOM est prêt
      
      this._RegisterHandler('combat.start', (m) => { 
        this._StartCombat(m); 
      });
      this._RegisterHandler('combat.end', (m) => { this._EndCombat(m); });
    }

    _UpdateSpatialAudio() {
      if (!this._spatialAudio || !this._parent) return;
      
      // Mettre à jour la position du listener basée sur la position du joueur
      const playerEntity = this.FindEntity('player');
      if (playerEntity && playerEntity._translation) {
        const pos = playerEntity._translation;
        this._spatialAudio.UpdateListenerPosition(pos.x, pos.y, pos.z);
        
        // Mettre à jour l'orientation basée sur la rotation du joueur
        if (playerEntity._rotation) {
          const forward = new THREE.Vector3(0, 0, -1);
          forward.applyQuaternion(playerEntity._rotation);
          this._spatialAudio.UpdateListenerOrientation(forward.x, forward.y, forward.z);
        }
      }
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
          this._HandleCodeAction();
          break;
        case 'heal':
          this._HandleHealAction();
          break;
      }
    }

    _HandleCodeAction() {
      if (!this._playerTurn || this._isAnimating || !this._isInCombat) {
        console.log('🚫 Code action ignored - not player turn or animating');
        return;
      }
      
      console.log('💻 Player uses code action - Super Attack!');
      this._isAnimating = true;
      
      // Charger une question de code
      const codeQuestions = quiz_database.getQuestionsByCategory('code');
      if (codeQuestions.length === 0) {
        this._AddCombatLog('❌ Aucune question de code disponible!');
        this._isAnimating = false;
        return;
      }
      
      const codeQuestion = codeQuestions[Math.floor(Math.random() * codeQuestions.length)];
      this._currentCodeQuestion = codeQuestion;
      
      // Afficher l'interface de code
      this._ShowCodeInterface(codeQuestion);
    }

    _ShowCodeInterface(question) {
      // Créer l'interface de code avec textarea et timer
      const codeContainer = document.createElement('div');
      codeContainer.id = 'code-container';
      codeContainer.className = 'code-interface';
      codeContainer.innerHTML = `
        <div class="code-header">
          <h3>💻 SUPER ATTAQUE - DÉFI CODE</h3>
          <div class="timer" id="code-timer">60</div>
        </div>
        <div class="code-question">
          <p>${question.question}</p>
        </div>
        <textarea id="code-input" placeholder="Écrivez votre code ici..." rows="8"></textarea>
        <div class="code-actions">
          <button onclick="window.combatSystemInstance._SubmitCode()">Exécuter</button>
          <button onclick="window.combatSystemInstance._CancelCode()">Annuler</button>
        </div>
        <div class="code-hints">
          <details>
            <summary>💡 Indices</summary>
            <ul>
              ${question.hints.map(hint => `<li>${hint}</li>`).join('')}
            </ul>
          </details>
        </div>
      `;
      
      document.body.appendChild(codeContainer);
      
      // Exposer l'instance pour les boutons
      window.combatSystemInstance = this;
      
      // Ajouter la lecture vocale de la question de code
      this._speakQuestion(`Défi code: ${question.question}`);
      
      // Démarrer le timer de 1 minute
      this._startCodeTimer();
      
      // Focus sur le textarea
      document.getElementById('code-input').focus();
    }

    _startCodeTimer() {
      let timeLeft = 60;
      const timerElement = document.getElementById('code-timer');
      
      this._codeTimer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 10) {
          timerElement.style.color = '#ff4444';
          timerElement.style.animation = 'pulse 1s infinite';
        }
        
        if (timeLeft <= 0) {
          this._TimeoutCode();
        }
      }, 1000);
    }

    _SubmitCode() {
      const userCode = document.getElementById('code-input').value.trim();
      const correctAnswer = this._currentCodeQuestion.correctAnswer;
      
      // Nettoyer le timer
      clearInterval(this._codeTimer);
      
      // Supprimer l'interface
      const codeContainer = document.getElementById('code-container');
      if (codeContainer) {
        codeContainer.remove();
      }
      
      // Nettoyer la référence globale
      if (window.combatSystemInstance === this) {
        delete window.combatSystemInstance;
      }
      
      // Vérifier la réponse (simple comparaison pour l'instant)
      const isCorrect = this._CheckCodeAnswer(userCode, correctAnswer);
      
      if (isCorrect) {
        // Super attaque réussie - 50% des dégâts à l'ennemi
        const superDamage = Math.floor(this._currentMonster._health * 0.5);
        this._currentMonster._health = Math.max(0, this._currentMonster._health - superDamage);
        
        this._AddCombatLogAnimated(`💥 SUPER ATTAQUE RÉUSSIE ! Vous infligez ${superDamage} dégâts critiques !`, 'critical');
        this._ShowSuperAttackEffect();
        
        // Vérifier si le monstre est vaincu
        if (this._currentMonster._health <= 0) {
          setTimeout(() => {
            this._EndCombat({
              playerWon: true
            });
          }, 2000);
          return;
        }
      } else {
        this._AddCombatLogAnimated('❌ Code incorrect ! Votre attaque échoue.', 'error');
      }
      
      // Mettre à jour les barres de vie
      this._UpdateHealthBars();
      
      // Fin du tour du joueur
      setTimeout(() => {
        this._playerTurn = false;
        this._isAnimating = false;
        this._ChangeCameraAngle();
        this._LoadRandomQuiz();
        this._StartRobotTurn();
      }, 2000);
    }

    _TimeoutCode() {
      // Le joueur n'a pas répondu à temps - le robot retire des dégâts
      clearInterval(this._codeTimer);
      
      // Supprimer l'interface
      const codeContainer = document.getElementById('code-container');
      if (codeContainer) {
        codeContainer.remove();
      }
      
      // Nettoyer la référence globale
      if (window.combatSystemInstance === this) {
        delete window.combatSystemInstance;
      }
      
      // Le robot attaque automatiquement
      const robotDamage = GameConfig.formulas.enemyDamage(this._playerLevel);
      this._playerHealth = Math.max(0, this._playerHealth - robotDamage);
      
      this._AddCombatLogAnimated(`⏰ Temps écoulé ! Le robot vous attaque et inflige ${robotDamage} dégâts !`, 'damage');
      
      // Vérifier si le joueur est vaincu
      if (this._playerHealth <= 0) {
        setTimeout(() => {
          this._EndCombat({
            playerWon: false
          });
        }, 2000);
        return;
      }
      
      // Mettre à jour les barres de vie
      this._UpdateHealthBars();
      
      // Fin du tour du joueur
      setTimeout(() => {
        this._playerTurn = false;
        this._isAnimating = false;
        this._ChangeCameraAngle();
        this._LoadRandomQuiz();
        this._StartRobotTurn();
      }, 2000);
    }

    _CheckCodeAnswer(userCode, correctAnswer) {
      // Normaliser les réponses (supprimer espaces, points-virgules optionnels)
      const normalizeCode = (code) => {
        return code.replace(/\s+/g, ' ')
                  .replace(/;\s*$/, '')
                  .trim()
                  .toLowerCase();
      };
      
      const normalizedUser = normalizeCode(userCode);
      const normalizedCorrect = normalizeCode(correctAnswer);
      
      return normalizedUser === normalizedCorrect;
    }

    _ShowSuperAttackEffect() {
      // Effet visuel pour la super attaque
      const effect = document.createElement('div');
      effect.className = 'super-attack-effect';
      effect.innerHTML = '💥 SUPER ATTAQUE ! 💥';
      effect.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 48px;
        font-weight: bold;
        color: #ff6b35;
        text-shadow: 0 0 20px #ff6b35, 0 0 40px #ff6b35;
        z-index: 10000;
        animation: superAttackPulse 3s ease-out;
        pointer-events: none;
      `;
      
      // Ajouter les styles d'animation si ils n'existent pas
      if (!document.querySelector('#superAttackStyles')) {
        const style = document.createElement('style');
        style.id = 'superAttackStyles';
        style.textContent = `
          @keyframes superAttackPulse {
            0% { 
              transform: translate(-50%, -50%) scale(0.5);
              opacity: 0;
            }
            20% { 
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 1;
            }
            40% { 
              transform: translate(-50%, -50%) scale(0.9);
              opacity: 1;
            }
            60% { 
              transform: translate(-50%, -50%) scale(1.1);
              opacity: 1;
            }
            80% { 
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            100% { 
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(effect);
      
      setTimeout(() => {
        if (effect.parentNode) {
          effect.remove();
        }
      }, 3000);
    }

    _CancelCode() {
      // Annuler l'action de code
      clearInterval(this._codeTimer);
      
      const codeContainer = document.getElementById('code-container');
      if (codeContainer) {
        codeContainer.remove();
      }
      
      // Nettoyer la référence globale
      if (window.combatSystemInstance === this) {
        delete window.combatSystemInstance;
      }
      
      this._isAnimating = false;
      this._AddCombatLog('❌ Action de code annulée.');
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
        this._AddCombatLog('Combat commencé !');
        
        // Arrêter l'audio d'ambiance pendant le combat
        this._StopAmbianceAudio();
        
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
        this._AddCombatLogAnimated(`🎉 Victoire ! Vous avez gagné ${xpReward} XP !`, 'success');
        this._ShowVictoryEffect();
        
        // Lancer la cinématique de victoire
        this._StartVictoryCinematic();
      } else {
        this._PlayUISound('incorrect');
        this._AddCombatLogAnimated('💀 Défaite...', 'error');
        this._ShowDefeatEffect();
        
        // Respawn player at starting position
        this._RespawnPlayer();
      }
      
      // Delay before hiding UI to show final message and cinematic
      const delayTime = message.playerWon ? 8000 : 2000; // 8 secondes pour la nouvelle cinématique plus longue
      
      setTimeout(() => {
        this._HideCombatUIAnimated();
        
        // Arrêter le son de combat (si pas déjà fait par la cinématique)
        this._StopCombatAudio();
        
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
        
        // Relancer l'audio d'ambiance après la fin du combat
        if (this._IsAudioEnabled()) {
          this._RestartAmbianceAudio();
        }
        
        // Re-enable player movement after camera transition
        setTimeout(() => {
          this._EnablePlayerMovement();
        }, 1000);
        
        console.log('✅ Combat ended, isInCombat:', this._isInCombat);
      }, delayTime);
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
      
      // Ajouter la lecture vocale de la question (adaptée aux enfants)
      this._speakQuestionForChildren(this._currentQuiz);
      
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
      if (options[selectedIndex]) {
        options[selectedIndex].style.transform = 'scale(1.1)';
      }
      
      setTimeout(() => {
        // Show correct/incorrect feedback
        if (selectedIndex === correct) {
          this._PlayUISound('correct');
          // Vérification de sécurité avant d'accéder aux éléments DOM
          if (options[selectedIndex]) {
            options[selectedIndex].classList.add('correct');
          }
          this._AddCombatLogAnimated(`✅ Correct ! Vous infligez ${playerDamage} dégâts au monstre !`, 'success');
          this._DamageMonster(playerDamage);
          this._ShakeScreen(false); // Victory shake
          
          // Create damage effect
          if (this._currentMonster && this._currentMonster._position) {
            this._CreateDamageEffect(this._currentMonster._position, playerDamage, false);
          }
          this._PlayDamageSound(false);
        } else {
          this._PlayUISound('incorrect');
          // Vérifications de sécurité avant d'accéder aux éléments DOM
          if (options[selectedIndex]) {
            options[selectedIndex].classList.add('incorrect');
          }
          if (options[correct]) {
            options[correct].classList.add('correct');
          }
          this._AddCombatLogAnimated(`❌ Mauvaise réponse ! Le monstre vous inflige ${monsterDamage} dégâts !`, 'error');
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
            console.log('Monstre vaincu, fin du combat');
            this._EndCombat({
              playerWon: true
            });
          } else if (this._playerHealth <= 0) {
            console.log('Joueur vaincu, fin du combat');
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

    _ShowHackEffect() {
      // Create hacking visual effect overlay
      const hackOverlay = document.createElement('div');
      hackOverlay.id = 'hack-effect-overlay';
      hackOverlay.innerHTML = `
        <div class="hack-lines">
          <div class="hack-line">📶 CONNEXION ÉTABLIE...</div>
          <div class="hack-line">💻 ACCÈS SYSTÈME...</div>
          <div class="hack-line">⚠️ INTRUSION DÉTECTÉE!</div>
          <div class="hack-line">🔓 SÉCURITÉ COMPROMISE</div>
        </div>
        <div class="binary-rain">
          <span>01001000</span>
          <span>01000001</span>
          <span>01000011</span>
          <span>01001011</span>
        </div>
      `;
      
      hackOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        color: #00ff41;
        font-family: 'Courier New', monospace;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        animation: hackFlash 1.5s ease-out;
        pointer-events: none;
      `;
      
      // Add hack effect styles if not exists
      if (!document.querySelector('#hackEffectStyles')) {
        const style = document.createElement('style');
        style.id = 'hackEffectStyles';
        style.textContent = `
          @keyframes hackFlash {
            0% { opacity: 0; }
            20% { opacity: 1; background: rgba(255, 0, 0, 0.3); }
            40% { opacity: 0.8; background: rgba(0, 255, 65, 0.2); }
            60% { opacity: 1; background: rgba(0, 0, 255, 0.2); }
            80% { opacity: 0.6; background: rgba(255, 255, 0, 0.1); }
            100% { opacity: 0; }
          }
          
          .hack-lines {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .hack-line {
            font-size: 18px;
            margin: 5px 0;
            text-shadow: 0 0 10px #00ff41;
            animation: typewriter 0.3s ease-in;
          }
          
          .hack-line:nth-child(1) { animation-delay: 0s; }
          .hack-line:nth-child(2) { animation-delay: 0.3s; }
          .hack-line:nth-child(3) { animation-delay: 0.6s; }
          .hack-line:nth-child(4) { animation-delay: 0.9s; }
          
          .binary-rain {
            display: flex;
            gap: 20px;
            font-size: 12px;
            opacity: 0.7;
          }
          
          .binary-rain span {
            animation: binaryFall 1.5s linear infinite;
          }
          
          .binary-rain span:nth-child(1) { animation-delay: 0s; }
          .binary-rain span:nth-child(2) { animation-delay: 0.2s; }
          .binary-rain span:nth-child(3) { animation-delay: 0.4s; }
          .binary-rain span:nth-child(4) { animation-delay: 0.6s; }
          
          @keyframes typewriter {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes binaryFall {
            0% { transform: translateY(-20px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(20px); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(hackOverlay);
      
      // Remove effect after animation
      setTimeout(() => {
        if (hackOverlay.parentNode) {
          hackOverlay.parentNode.removeChild(hackOverlay);
        }
      }, 1500);
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
      
      // Add hack effect when robot damages player
      this._ShowHackEffect();
      
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
        
        // Remove previous health classes
        playerHealthBar.classList.remove('low-health', 'medium-health');
        
        // Add appropriate health class based on percentage
        if (healthPercentage <= 40) {
          playerHealthBar.classList.add('low-health');
        } else if (healthPercentage <= 80) {
          playerHealthBar.classList.add('medium-health');
        }
        
        // Add health text overlay
        this._UpdateHealthText('player', this._playerHealth, this._playerMaxHealth);
      }
      
      // Update monster health bar with enhanced visuals
      const monsterHealthBar = document.getElementById('monster-health');
      if (monsterHealthBar && this._currentMonster) {
        const healthPercentage = (this._currentMonster._health / this._currentMonster._maxHealth) * 100;
        monsterHealthBar.style.width = healthPercentage + '%';
        
        // Remove previous health classes
        monsterHealthBar.classList.remove('low-health', 'medium-health');
        
        // Add appropriate health class based on percentage
        if (healthPercentage <= 40) {
          monsterHealthBar.classList.add('low-health');
        } else if (healthPercentage <= 80) {
          monsterHealthBar.classList.add('medium-health');
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
      
      // Play victory sound when gaining XP
      this._PlayVictorySound();
      
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
      this._availableUpgradePoints += GameConfig.player.statPointsPerLevel;
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
      console.log('🤖 Début du tour du robot');
      
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
      // Add visual indicator that it's robot's turn with hacking theme
      const indicator = document.createElement('div');
      indicator.id = 'robot-turn-indicator';
      indicator.innerHTML = `
        <div class="hack-container">
          <div class="wifi-icon">📶</div>
          <div class="hack-text">🤖 INJECTION DE CODE...</div>
          <div class="code-stream">01101001 01101110 01101010...</div>
        </div>
      `;
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #0f4c75, #3282b8, #0f4c75);
        color: #00ff41;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        border: 2px solid #00ff41;
        animation: hackingPulse 0.8s infinite alternate;
        font-family: 'Courier New', monospace;
        min-width: 300px;
      `;
      
      // Add hacking animations if not exists
      if (!document.querySelector('#robotTurnStyles')) {
        const style = document.createElement('style');
        style.id = 'robotTurnStyles';
        style.textContent = `
          @keyframes hackingPulse {
            0% { 
              transform: scale(1); 
              box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
              border-color: #00ff41;
            }
            100% { 
              transform: scale(1.02); 
              box-shadow: 0 0 30px rgba(0, 255, 65, 0.6);
              border-color: #00ff88;
            }
          }
          
          @keyframes codeScroll {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          
          .hack-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
          }
          
          .wifi-icon {
            font-size: 20px;
            animation: hackingPulse 0.5s infinite alternate;
          }
          
          .hack-text {
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 0 10px #00ff41;
          }
          
          .code-stream {
            font-size: 10px;
            opacity: 0.7;
            overflow: hidden;
            white-space: nowrap;
            animation: codeScroll 3s linear infinite;
            color: #00aa33;
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
      // Robot only handles geek questions - use externalized database
      const geekQuestions = quiz_database.getQuestionsByCategory('geek');
      
      if (geekQuestions.length === 0) {
        console.warn('⚠️ No geek questions available for robot!');
        return;
      }
      
      // Select a random geek question (different from current player quiz AND previous robot quiz)
      let robotQuiz;
      do {
        const randomIndex = Math.floor(Math.random() * geekQuestions.length);
        robotQuiz = geekQuestions[randomIndex];
      } while ((this._currentQuiz && robotQuiz === this._currentQuiz) || 
               (this._robotQuiz && robotQuiz === this._robotQuiz));
      
      this._robotQuiz = robotQuiz;
      
      console.log(`🤖 Loaded new robot geek quiz: ${this._robotQuiz.question}`);
      
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
        questionElement.innerHTML = `🤖 Question du Robot: ${this._robotQuiz.question}`;
        questionElement.style.color = '#e74c3c';
        questionElement.style.fontWeight = 'bold';
        questionElement.style.textShadow = '0 0 10px rgba(231, 76, 60, 0.5)';
        questionElement.style.animation = 'robotTextGlow 2s ease-in-out infinite alternate';
        
        // Ajouter la lecture vocale de la question du robot
        this._speakQuestion(`Question du Robot: ${this._robotQuiz.question}`);
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
            console.log('Monstre vaincu par erreur du robot, fin du combat');
            this._EndCombat({
              playerWon: true
            });
          } else if (this._playerHealth <= 0) {
            console.log('Joueur vaincu par le robot, fin du combat');
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
      
      // Mettre à jour l'audio spatial pendant le combat
      if (this._isInCombat) {
        this._UpdateSpatialAudio();
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
        // Vérification de sécurité pour éviter les erreurs
        if (this._currentQuiz.options && this._currentQuiz.options[index] !== undefined) {
          option.textContent = this._currentQuiz.options[index];
        } else {
          option.textContent = `Option ${index + 1}`; // Fallback
          console.warn(`Option manquante à l'index ${index}`);
        }
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
    
    async _PlayCombatStartSound() {
      // Vérifier si l'audio est activé
      if (!this._IsAudioEnabled()) {
        console.log('🔇 Sons de combat désactivés par l\'utilisateur');
        return;
      }

      try {
        // Arrêter le son précédent s'il existe
        if (this._currentCombatAudio) {
          this._currentCombatAudio.pause();
          this._currentCombatAudio.currentTime = 0;
        }
        
        // Charger la liste des sons de combat
        const response = await fetch('/resources/audios/combat/data.json');
        const combatSounds = await response.json();
        
        // Sélectionner un son aléatoire
        const randomIndex = Math.floor(Math.random() * combatSounds.length);
        const selectedSound = combatSounds[randomIndex];
        
        // Créer et jouer l'audio en boucle
        this._currentCombatAudio = new Audio(`/resources/audios/combat/${selectedSound}`);
        this._currentCombatAudio.volume = 0.2; // Volume réduit
        this._currentCombatAudio.loop = true; // Mettre en boucle
        
        console.log(`🎵 Lecture du son de combat en boucle: ${selectedSound}`);
        await this._currentCombatAudio.play();
        
      } catch (error) {
        console.warn('Erreur lors de la lecture du son de combat:', error);
        // Fallback vers l'ancien système en cas d'erreur
        this._PlayDynamicSound('combat_start', [400, 600, 800], [0.2, 0.15, 0.1], [0.1, 0.2, 0.3]);
      }
    }

    _IsAudioEnabled() {
      // Vérifier l'état du bouton audio dans le localStorage
      const audioEnabled = localStorage.getItem('combatAudioEnabled');
      return audioEnabled === null || audioEnabled === 'true';
    }

    _InitializeAudioControl() {
      const audioControl = document.getElementById('audio-control');
      const audioIcon = document.getElementById('audio-icon');
      
      if (audioControl && audioIcon) {
        // Initialiser l'état du bouton
        this._UpdateAudioButtonState();
        
        // Ajouter l'événement de clic
        audioControl.addEventListener('click', () => {
          const currentState = this._IsAudioEnabled();
          const newState = !currentState;
          
          localStorage.setItem('combatAudioEnabled', newState.toString());
          this._UpdateAudioButtonState();
          
          // Arrêter l'audio en cours si on désactive
          if (!newState) {
            this._StopCombatAudio();
            // Arrêter aussi l'audio d'ambiance
            this._StopAmbianceAudio();
          } else {
            if (this._isInCombat) {
              // Relancer le son si on réactive l'audio pendant un combat
              this._PlayCombatStartSound();
            } else {
              // Relancer l'audio d'ambiance si on n'est pas en combat
              this._RestartAmbianceAudio();
            }
          }
          
          console.log(`🔊 Audio ${newState ? 'activé' : 'désactivé'}`);
        });
      }
    }

    _UpdateAudioButtonState() {
      const audioIcon = document.getElementById('audio-icon');
      if (audioIcon) {
        const isEnabled = this._IsAudioEnabled();
        audioIcon.textContent = isEnabled ? '🔊' : '🔇';
        audioIcon.style.color = isEnabled ? '#4CAF50' : '#f44336';
      }
    }
    
    _StopCombatAudio() {
      if (this._currentCombatAudio) {
        this._currentCombatAudio.pause();
        this._currentCombatAudio.currentTime = 0;
        this._currentCombatAudio = null;
        console.log('🔇 Son de combat arrêté');
      }
    }
    
    _StopAmbianceAudio() {
      // Accéder à l'instance principale de l'application pour arrêter l'audio d'ambiance
      if (window._APP && window._APP._StopAmbianceAudio) {
        window._APP._StopAmbianceAudio();
      }
    }
    
    _RestartAmbianceAudio() {
      // Accéder à l'instance principale de l'application pour redémarrer l'audio d'ambiance
      if (window._APP && window._APP._PlayNextAmbianceSound) {
        setTimeout(() => {
          window._APP._PlayNextAmbianceSound();
        }, 500); // Petit délai pour éviter les conflits
      }
    }
    
    _StartVictoryCinematic() {
      if (!this._params.camera || !this._params.target) return;
      
      console.log('🎬 Démarrage de la cinématique de victoire');
      
      // Arrêter le son de combat immédiatement
      this._StopCombatAudio();
      
      const camera = this._params.camera;
      const playerPos = this._params.target._position;
      
      // TODO :  Paramètres de la cinématique
      const baseRadius = 15; // Distance de base de la caméra au joueur
      const height = 8; // Hauteur initiale
      const finalHeight = 50; // Hauteur finale
      const duration = 6000; // 6 secondes (plus lent)
      
      let startTime = Date.now();
      
      const animateCinematic = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 0.8) {
          // Phase 1: Rotation 180° plus lente autour du joueur (40% du temps)
          const rotationProgress = progress / 0.8;
          const angle = rotationProgress * Math.PI; // 180 degrés seulement
          
          camera.position.x = playerPos.x + Math.cos(angle) * baseRadius;
          camera.position.z = playerPos.z + Math.sin(angle) * baseRadius;
          camera.position.y = height + rotationProgress * 3; // Montée plus douce
          
          // Regarder le joueur
          camera.lookAt(playerPos.x, playerPos.y + 2, playerPos.z);
        } else  {
          // Phase 2: Zoom avant (20% du temps)
          const zoomProgress = (progress - 0.4) / 0.2;
          const easeInOut = 0.5 * (1 - Math.cos(Math.PI * zoomProgress));
          const zoomRadius = baseRadius * (1 - 0.6 * easeInOut); // Zoom jusqu'à 40% de la distance
          
          camera.position.x = playerPos.x + Math.cos(Math.PI) * zoomRadius;
          camera.position.z = playerPos.z + Math.sin(Math.PI) * zoomRadius;
          camera.position.y = height + 3;
          
          // Regarder le joueur
          camera.lookAt(playerPos.x, playerPos.y + 2, playerPos.z);
        } 
        
       
        
        // else {
        //   // Phase 4: Montée vers le ciel (20% du temps)
        //   const skyProgress = (progress - 0.8) / 0.2;
        //   const easeOut = 1 - Math.pow(1 - skyProgress, 3); // Easing out
          
        //   camera.position.y = height + 3 + easeOut * (finalHeight - height - 3);
          
        //   // Regarder vers le bas sur le joueur
        //   camera.lookAt(playerPos.x, playerPos.y, playerPos.z);
        // }
        
        if (progress < 1) {
          requestAnimationFrame(animateCinematic);
        } else {
          console.log('🎬 Cinématique de victoire terminée');
          // La transition normale reprendra après
        }
      };
      
      animateCinematic();
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
      // Utiliser le système d'audio spatial pour le son de victoire
      if (this._spatialAudio) {
        // Jouer le son de victoire à la position du monstre vaincu
        const monsterPos = this._currentMonster && this._currentMonster._position ? this._currentMonster._position : { x: 0, y: 2, z: 0 };
        this._spatialAudio.PlayVictorySound(monsterPos.x, monsterPos.y, monsterPos.z);
      } else {
        // Fallback vers l'ancien système
        this._PlayDynamicSound('victory', [800, 1000, 1200, 1500], [0.2, 0.18, 0.15, 0.12], [0.2, 0.2, 0.2, 0.4]);
      }
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
      // Create firewall repair effect overlay
      const repairOverlay = document.createElement('div');
      repairOverlay.id = 'firewall-repair-overlay';
      repairOverlay.innerHTML = `
        <div class="repair-container">
          <div class="firewall-icon">🛡️</div>
          <div class="repair-text">RÉPARATION FIREWALL</div>
          <div class="repair-progress">
            <div class="progress-bar"></div>
          </div>
          <div class="repair-stats">
            <div class="stat-line">🔧 DIAGNOSTIC SYSTÈME...</div>
            <div class="stat-line">🔒 RENFORCEMENT SÉCURITÉ...</div>
            <div class="stat-line">✅ INTÉGRITÉ RESTAURÉE +${healAmount}</div>
          </div>
          <div class="binary-stream">
            <span>11010011</span>
            <span>10110101</span>
            <span>01101110</span>
            <span>11001010</span>
          </div>
        </div>
      `;
      
      repairOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 50, 0, 0.9);
        color: #00ff41;
        font-family: 'Courier New', monospace;
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: repairFlash 2.5s ease-out;
        pointer-events: none;
      `;
      
      // Add repair effect styles if not exists
      if (!document.querySelector('#repairEffectStyles')) {
        const style = document.createElement('style');
        style.id = 'repairEffectStyles';
        style.textContent = `
          @keyframes repairFlash {
            0% { opacity: 0; }
            15% { opacity: 1; background: rgba(0, 100, 0, 0.8); }
            30% { opacity: 0.9; background: rgba(0, 255, 65, 0.3); }
            60% { opacity: 1; background: rgba(0, 150, 0, 0.6); }
            85% { opacity: 0.7; background: rgba(0, 255, 0, 0.2); }
            100% { opacity: 0; }
          }
          
          .repair-container {
            text-align: center;
            max-width: 500px;
            padding: 30px;
            border: 2px solid #00ff41;
            border-radius: 10px;
            background: rgba(0, 0, 0, 0.8);
            box-shadow: 0 0 30px #00ff41;
          }
          
          .firewall-icon {
            font-size: 48px;
            margin-bottom: 15px;
            animation: shieldPulse 0.5s ease-in-out infinite alternate;
          }
          
          .repair-text {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            text-shadow: 0 0 15px #00ff41;
            letter-spacing: 2px;
          }
          
          .repair-progress {
            width: 100%;
            height: 8px;
            background: rgba(0, 255, 65, 0.2);
            border-radius: 4px;
            margin: 20px 0;
            overflow: hidden;
          }
          
          .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #00ff41, #00cc33);
            width: 0%;
            animation: progressFill 2s ease-out;
            box-shadow: 0 0 10px #00ff41;
          }
          
          .repair-stats {
            margin: 20px 0;
          }
          
          .stat-line {
            font-size: 14px;
            margin: 8px 0;
            opacity: 0;
            animation: statAppear 0.5s ease-in forwards;
          }
          
          .stat-line:nth-child(1) { animation-delay: 0.3s; }
          .stat-line:nth-child(2) { animation-delay: 0.8s; }
          .stat-line:nth-child(3) { animation-delay: 1.3s; color: #00ff41; font-weight: bold; }
          
          .binary-stream {
            display: flex;
            justify-content: center;
            gap: 15px;
            font-size: 10px;
            opacity: 0.6;
            margin-top: 15px;
          }
          
          .binary-stream span {
            animation: binaryScroll 2s linear infinite;
          }
          
          .binary-stream span:nth-child(1) { animation-delay: 0s; }
          .binary-stream span:nth-child(2) { animation-delay: 0.3s; }
          .binary-stream span:nth-child(3) { animation-delay: 0.6s; }
          .binary-stream span:nth-child(4) { animation-delay: 0.9s; }
          
          @keyframes shieldPulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 5px #00ff41); }
            100% { transform: scale(1.1); filter: drop-shadow(0 0 15px #00ff41); }
          }
          
          @keyframes progressFill {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          
          @keyframes statAppear {
            0% { opacity: 0; transform: translateX(-20px); }
            100% { opacity: 1; transform: translateX(0); }
          }
          
          @keyframes binaryScroll {
            0% { transform: translateY(0); opacity: 0.6; }
            50% { opacity: 1; }
            100% { transform: translateY(-10px); opacity: 0.3; }
          }
          
          .heal-log {
            color: #00ff41 !important;
            background: rgba(0, 255, 65, 0.1) !important;
            border-left: 3px solid #00ff41 !important;
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(repairOverlay);
      
      // Remove effect after animation
      setTimeout(() => {
        if (repairOverlay.parentNode) {
          repairOverlay.parentNode.removeChild(repairOverlay);
        }
      }, 2500);
      
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
              <h3>⚔️ Dégâts (+${GameConfig.player.damagePerPoint} par point)</h3>
              <p>Actuellement: +${this._playerDamageBonus}</p>
              <button onclick="combatSystem._UpgradeAttribute('damage')">Améliorer</button>
            </div>
            <div class="upgrade-option" data-type="heal">
              <h3>💚 Soins (+${GameConfig.player.healPerPoint} par point)</h3>
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
        this._playerDamageBonus += GameConfig.player.damagePerPoint;
        console.log(`⚔️ Dégâts améliorés! Bonus: +${this._playerDamageBonus}`);
      } else if (type === 'heal') {
        this._playerHealBonus += GameConfig.player.healPerPoint;
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

    _speakQuestion(questionText) {
      if ('speechSynthesis' in window) {
        console.log('Tentative de lecture vocale:', questionText);
        
        // Arrêter toute lecture en cours
        speechSynthesis.cancel();
        
        // Attendre un peu pour que le cancel soit effectif
        setTimeout(() => {
          // Créer un nouvel énoncé
          const utterance = new SpeechSynthesisUtterance(questionText);
          
          // Configuration de la voix
          utterance.lang = 'fr-FR'; // Français
          utterance.rate = 0.8; // Vitesse de lecture
          utterance.pitch = 1; // Tonalité
          utterance.volume = 1.0; // Volume maximum
          
          // Événements pour le débogage
          utterance.onstart = () => {
            console.log('Lecture vocale démarrée');
          };
          
          utterance.onend = () => {
            console.log('Lecture vocale terminée');
          };
          
          utterance.onerror = (event) => {
            console.error('Erreur de lecture vocale:', event.error);
            // Fallback: afficher une alerte visuelle
            this._showAudioAlert(questionText);
          };
          
          // Vérifier si des voix sont disponibles
          const voices = speechSynthesis.getVoices();
          if (voices.length > 0) {
            // Chercher une voix française
            const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
            if (frenchVoice) {
              utterance.voice = frenchVoice;
              console.log('Voix française trouvée:', frenchVoice.name);
            }
          }
          
          // Lancer la lecture
          console.log('Lancement de speechSynthesis.speak()');
          speechSynthesis.speak(utterance);
          
          // Vérification après un délai
          setTimeout(() => {
            if (speechSynthesis.speaking) {
              console.log('Lecture en cours...');
            } else {
              console.warn('Aucune lecture détectée - possible problème');
              this._showAudioAlert(questionText);
            }
          }, 500);
          
        }, 100);
        
      } else {
        console.log('Synthèse vocale non supportée par ce navigateur');
        this._showAudioAlert(questionText);
      }
    }
    
    _showAudioAlert(text) {
      // Afficher une notification visuelle si l'audio ne fonctionne pas
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff6b6b;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 300px;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      alertDiv.innerHTML = `
        <strong>🔊 Audio indisponible</strong><br>
        <small>Activez le son ou vérifiez les paramètres audio</small><br>
        <em>"${text}"</em>
      `;
      
      document.body.appendChild(alertDiv);
      
      // Supprimer l'alerte après 5 secondes
      setTimeout(() => {
        if (alertDiv.parentNode) {
          alertDiv.parentNode.removeChild(alertDiv);
        }
      }, 5000);
    }

    _speakQuestionForChildren(quiz) {
      if (!quiz || !('speechSynthesis' in window)) {
        console.log('🔇 Synthèse vocale non disponible');
        return;
      }
      
      console.log('🔊 Lecture pour enfants:', quiz.question);
      
      // Arrêter toute lecture en cours
      speechSynthesis.cancel();
      
      setTimeout(() => {
        // Préparer le texte pour enfants
        let textToRead = `Voici ta question : ${quiz.question}`;
        
        // Ajouter les options pour les enfants
        if (quiz.options && Array.isArray(quiz.options)) {
          textToRead += `. Les réponses possibles sont : `;
          quiz.options.forEach((option, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            textToRead += `${letter}: ${option}. `;
          });
        }
        
        // Créer l'utterance avec paramètres enfants
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.7;  // Plus lent pour les enfants
        utterance.pitch = 1.3; // Voix plus aiguë
        utterance.volume = 1.0; // Volume max
        
        utterance.onstart = () => console.log('🎤 Lecture démarrée pour enfants');
        utterance.onend = () => console.log('✅ Lecture terminée');
        utterance.onerror = (e) => console.error('❌ Erreur audio enfants:', e);
        
        speechSynthesis.speak(utterance);
      }, 300);
    }

    get IsInCombat() {
      return this._isInCombat;
    }
  }

  return {
    CombatSystem: CombatSystem
  };

})();