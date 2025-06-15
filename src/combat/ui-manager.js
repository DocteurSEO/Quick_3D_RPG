export const ui_manager = (() => {

  class UIManager {
    constructor(params) {
      this._params = params;
      this._selectedMenuIndex = 0;
      this._selectedQuizIndex = 0;
      this._currentMenu = 'action'; // 'action' or 'quiz'
      this._isAnimating = false;
      this._keydownHandler = null;
      
      // Module dependencies - will be injected
      this._audioSystem = null;
      this._healthStats = null;
      this._combatLogger = null;
    }

    init(audioSystem, healthStats, combatLogger) {
      this._audioSystem = audioSystem;
      this._healthStats = healthStats;
      this._combatLogger = combatLogger;
      console.log('🎮 UIManager initialized');
    }

    _InitUI() {
      this._selectedMenuIndex = 0;
      this._selectedQuizIndex = 0;
      this._currentMenu = 'action';
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
          if (this._audioSystem) this._audioSystem._PlayUISound('select');
          this._selectedQuizIndex = index;
          this._UpdateQuizSelection();
          // Quiz answer handling would be delegated to quiz system
          this._onQuizAnswerCallback && this._onQuizAnswerCallback(index);
        });
      });

      // Menu option handlers
      const menuOptions = document.querySelectorAll('.menu-option');
      menuOptions.forEach((option, index) => {
        option.addEventListener('click', () => {
          if (this._isAnimating) return;
          if (this._audioSystem) this._audioSystem._PlayUISound('select');
          this._selectedMenuIndex = index;
          this._UpdateMenuSelection();
          // Menu action handling would be delegated to combat flow
          this._onMenuActionCallback && this._onMenuActionCallback(option.dataset.action);
        });
      });

      this._UpdateMenuSelection();
    }

    _CleanupUI() {
      if (this._keydownHandler) {
        document.removeEventListener('keydown', this._keydownHandler);
        this._keydownHandler = null;
      }
      
      // Remove click handlers by cloning and replacing elements
      const quizOptions = document.querySelectorAll('.quiz-option');
      quizOptions.forEach(option => {
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
      });
      
      const menuOptions = document.querySelectorAll('.menu-option');
      menuOptions.forEach(option => {
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
      });
    }

    _HandleKeyInput(e) {
      if (this._isAnimating) return;
      
      switch (e.code) {
        case 'ArrowUp':
          e.preventDefault();
          this._NavigateUp();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this._NavigateDown();
          break;
        case 'Enter':
        case 'Space':
          e.preventDefault();
          this._ConfirmSelection();
          break;
        case 'Escape':
          e.preventDefault();
          this._HandleEscape();
          break;
        case 'KeyC':
          if (this._currentMenu === 'action') {
            this._ChangeCameraAngle();
          }
          break;
      }
    }

    _NavigateUp() {
      if (this._audioSystem) this._audioSystem._PlayUISound('select');
      
      if (this._currentMenu === 'action') {
        const menuOptions = document.querySelectorAll('.menu-option:not(.hidden)');
        this._selectedMenuIndex = (this._selectedMenuIndex - 1 + menuOptions.length) % menuOptions.length;
        this._UpdateMenuSelection();
      } else if (this._currentMenu === 'quiz') {
        const quizOptions = document.querySelectorAll('.quiz-option');
        this._selectedQuizIndex = (this._selectedQuizIndex - 1 + quizOptions.length) % quizOptions.length;
        this._UpdateQuizSelection();
      }
    }

    _NavigateDown() {
      if (this._audioSystem) this._audioSystem._PlayUISound('select');
      
      if (this._currentMenu === 'action') {
        const menuOptions = document.querySelectorAll('.menu-option:not(.hidden)');
        this._selectedMenuIndex = (this._selectedMenuIndex + 1) % menuOptions.length;
        this._UpdateMenuSelection();
      } else if (this._currentMenu === 'quiz') {
        const quizOptions = document.querySelectorAll('.quiz-option');
        this._selectedQuizIndex = (this._selectedQuizIndex + 1) % quizOptions.length;
        this._UpdateQuizSelection();
      }
    }

    _ConfirmSelection() {
      if (this._audioSystem) this._audioSystem._PlayUISound('confirm');
      
      if (this._currentMenu === 'action') {
        const menuOptions = document.querySelectorAll('.menu-option:not(.hidden)');
        const selectedOption = menuOptions[this._selectedMenuIndex];
        if (selectedOption) {
          const action = selectedOption.dataset.action;
          this._onMenuActionCallback && this._onMenuActionCallback(action);
        }
      } else if (this._currentMenu === 'quiz') {
        this._onQuizAnswerCallback && this._onQuizAnswerCallback(this._selectedQuizIndex);
      }
    }

    _HandleEscape() {
      if (this._currentMenu === 'quiz') {
        this._ShowActionMenu();
      }
    }

    _UpdateMenuSelection() {
      const menuOptions = document.querySelectorAll('.menu-option');
      menuOptions.forEach((option, index) => {
        const arrow = option.querySelector('.arrow');
        if (index === this._selectedMenuIndex) {
          option.classList.add('selected');
          if (arrow) arrow.style.opacity = '1';
        } else {
          option.classList.remove('selected');
          if (arrow) arrow.style.opacity = '0';
        }
      });
    }

    _UpdateQuizSelection() {
      const quizOptions = document.querySelectorAll('.quiz-option');
      quizOptions.forEach((option, index) => {
        const arrow = option.querySelector('.arrow');
        if (index === this._selectedQuizIndex) {
          option.classList.add('selected');
          if (arrow) arrow.style.opacity = '1';
        } else {
          option.classList.remove('selected');
          if (arrow) arrow.style.opacity = '0';
        }
      });
    }

    _ShowCombatUI() {
      const combatUI = document.getElementById('combat-ui');
      if (combatUI) {
        combatUI.classList.remove('hidden');
      }
    }

    _HideCombatUI() {
      const combatUI = document.getElementById('combat-ui');
      if (combatUI) {
        combatUI.classList.add('hidden');
      }
    }
    
    _HideCombatUIAnimated() {
      const combatUI = document.getElementById('combat-ui');
      if (!combatUI) return;
      
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

    _ShowQuizSection() {
      this._currentMenu = 'quiz';
      this._selectedQuizIndex = 0;
      
      const quizSection = document.getElementById('quiz-section');
      const actionMenu = document.getElementById('action-menu');
      
      if (quizSection) quizSection.classList.remove('hidden');
      if (actionMenu) actionMenu.classList.add('hidden');
      
      this._UpdateQuizSelection();
    }

    _ShowActionMenu() {
      this._currentMenu = 'action';
      this._selectedMenuIndex = 0;
      
      const quizSection = document.getElementById('quiz-section');
      const actionMenu = document.getElementById('action-menu');
      
      if (quizSection) quizSection.classList.add('hidden');
      if (actionMenu) actionMenu.classList.remove('hidden');
      
      this._UpdateMenuSelection();
    }

    _UpdateHealthBars() {
      if (!this._healthStats) return;
      
      // Update player health bar with enhanced visuals
      const playerHealthBar = document.getElementById('player-health');
      if (playerHealthBar) {
        const healthPercentage = this._healthStats.getPlayerHealthPercentage();
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
        this._UpdateHealthText('player', this._healthStats.getPlayerHealth(), this._healthStats.getPlayerMaxHealth());
      }
      
      // Update monster health bar with enhanced visuals
      const monsterHealthBar = document.getElementById('monster-health');
      if (monsterHealthBar) {
        const healthPercentage = this._healthStats.getMonsterHealthPercentage();
        monsterHealthBar.style.width = healthPercentage + '%';
        
        // Remove previous health classes
        monsterHealthBar.classList.remove('low-health', 'medium-health');
        
        // Add appropriate health class based on percentage
        if (healthPercentage <= 40) {
          monsterHealthBar.classList.add('low-health');
        } else if (healthPercentage <= 80) {
          monsterHealthBar.classList.add('medium-health');
        }
        
        // Add health text overlay for monster if current monster exists
        const currentMonster = this._healthStats._currentMonster;
        if (currentMonster) {
          this._UpdateHealthText('monster', currentMonster._health, currentMonster._maxHealth);
        }
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
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);
          pointer-events: none;
          z-index: 10;
          font-family: 'Courier New', monospace;
        `;
        
        const healthBarContainer = document.querySelector(`.${type}-health .health-bar`);
        if (healthBarContainer) {
          healthBarContainer.style.position = 'relative';
          healthBarContainer.appendChild(healthTextElement);
        }
      }
      
      if (healthTextElement) {
        healthTextElement.textContent = `${currentHealth}/${maxHealth}`;
      }
    }

    _UpdateXPDisplay() {
      if (!this._healthStats) return;
      
      const levelElement = document.getElementById('player-level');
      const xpElement = document.getElementById('player-xp');
      const xpTextElement = document.getElementById('player-xp-text');
      
      if (levelElement) {
        levelElement.textContent = `Niveau ${this._healthStats.getPlayerLevel()}`;
      }
      
      if (xpElement && xpTextElement) {
        const currentXP = this._healthStats.getPlayerXP();
        const xpToNext = this._healthStats.getPlayerXPToNextLevel();
        const xpProgress = (currentXP / xpToNext) * 100;
        
        xpElement.style.width = `${Math.min(100, xpProgress)}%`;
        xpTextElement.textContent = `${currentXP}/${xpToNext} XP`;
      }
    }

    _ShowUpgradeMenu() {
      if (!this._healthStats) return;
      
      const upgradePoints = this._healthStats.getAvailableUpgradePoints();
      if (upgradePoints <= 0) return;
      
      // Create upgrade menu overlay
      const upgradeOverlay = document.createElement('div');
      upgradeOverlay.id = 'upgrade-overlay';
      upgradeOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 3000;
        display: flex;
        justify-content: center;
        align-items: center;
      `;
      
      const upgradeMenu = document.createElement('div');
      upgradeMenu.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 3px solid #00ff88;
        border-radius: 15px;
        padding: 30px;
        color: white;
        font-family: 'Courier New', monospace;
        text-align: center;
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
      `;
      
      upgradeMenu.innerHTML = `
        <h2 style="color: #00ff88; margin-bottom: 20px;">NIVEAU SUPÉRIEUR !</h2>
        <p style="margin-bottom: 20px;">Points d'amélioration disponibles: ${upgradePoints}</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="upgrade-btn" data-attribute="damage" style="
            background: #ff6b35;
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
          ">Augmenter les dégâts (+${this._params.upgradeCosts?.damage?.increase || 2})</button>
          <button class="upgrade-btn" data-attribute="heal" style="
            background: #4ecdc4;
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
          ">Améliorer les soins (+${this._params.upgradeCosts?.heal?.increase || 3})</button>
          <button class="upgrade-btn" data-attribute="health" style="
            background: #45b7d1;
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
          ">Augmenter la vie max (+${this._params.upgradeCosts?.health?.increase || 10})</button>
        </div>
        <button id="finish-upgrade" style="
          background: #28a745;
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 20px;
        ">Terminer</button>
      `;
      
      upgradeOverlay.appendChild(upgradeMenu);
      document.body.appendChild(upgradeOverlay);
      
      // Add event listeners
      const upgradeButtons = upgradeMenu.querySelectorAll('.upgrade-btn');
      upgradeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const attribute = btn.dataset.attribute;
          this._onUpgradeAttributeCallback && this._onUpgradeAttributeCallback(attribute);
          this._UpdateUpgradeDisplay();
        });
      });
      
      document.getElementById('finish-upgrade').addEventListener('click', () => {
        this._FinishUpgrade();
      });
    }

    _UpdateUpgradeDisplay() {
      if (!this._healthStats) return;
      
      const overlay = document.getElementById('upgrade-overlay');
      if (!overlay) return;
      
      const pointsText = overlay.querySelector('p');
      if (pointsText) {
        pointsText.textContent = `Points d'amélioration disponibles: ${this._healthStats.getAvailableUpgradePoints()}`;
      }
    }

    _FinishUpgrade() {
      const overlay = document.getElementById('upgrade-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
      }
      
      if (this._healthStats) {
        this._healthStats.clearPendingLevelUp();
      }
      
      this._UpdateXPDisplay();
      this._UpdateHealthBars();
    }

    _ShowLevelUpNotification(newLevel) {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #ff6b35, #f7931e);
        color: white;
        padding: 20px 40px;
        border-radius: 15px;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        z-index: 4000;
        animation: levelUpPop 2s ease-out;
        box-shadow: 0 0 30px rgba(255, 107, 53, 0.6);
        border: 3px solid #ffffff;
      `;
      
      notification.innerHTML = `
        <div>🎉 NIVEAU ${newLevel} 🎉</div>
        <div style="font-size: 16px; margin-top: 10px;">Nouvelle puissance débloquée !</div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
      }, 2000);
    }

    _ShowResetNotification() {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        padding: 20px 40px;
        border-radius: 15px;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        z-index: 4000;
        animation: levelUpPop 2s ease-out;
        box-shadow: 0 0 30px rgba(231, 76, 60, 0.6);
        border: 3px solid #ffffff;
      `;
      
      notification.innerHTML = `
        <div>💀 DÉFAITE 💀</div>
        <div style="font-size: 14px; margin-top: 10px;">Retour au point de départ...</div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
      }, 2000);
    }

    // Callback setters for communication with other modules
    setOnQuizAnswerCallback(callback) {
      this._onQuizAnswerCallback = callback;
    }

    setOnMenuActionCallback(callback) {
      this._onMenuActionCallback = callback;
    }

    setOnUpgradeAttributeCallback(callback) {
      this._onUpgradeAttributeCallback = callback;
    }

    setOnCameraChangeCallback(callback) {
      this._onCameraChangeCallback = callback;
    }

    _ChangeCameraAngle() {
      this._onCameraChangeCallback && this._onCameraChangeCallback();
    }

    // State getters
    getCurrentMenu() {
      return this._currentMenu;
    }

    getSelectedMenuIndex() {
      return this._selectedMenuIndex;
    }

    getSelectedQuizIndex() {
      return this._selectedQuizIndex;
    }

    isAnimating() {
      return this._isAnimating;
    }

    setAnimating(animating) {
      this._isAnimating = animating;
    }
  }

  return {
    UIManager: UIManager,
  };

})();