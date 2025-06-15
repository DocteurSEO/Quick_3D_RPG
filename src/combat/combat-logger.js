export const combat_logger = (() => {

  class CombatLogger {
    constructor(params) {
      this._params = params;
      this._logElement = null;
    }

    init() {
      this._logElement = document.getElementById('combat-log');
      console.log('📝 CombatLogger initialized');
    }

    _AddCombatLog(message) {
      if (!this._logElement) return;
      
      const logEntry = document.createElement('p');
      logEntry.textContent = message;
      logEntry.style.cssText = `
        margin: 3px 0;
        font-size: 0.9em;
        color: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
      `;
      
      this._logElement.appendChild(logEntry);
      
      // Animate entry
      setTimeout(() => {
        logEntry.style.opacity = '1';
        logEntry.style.transform = 'translateY(0)';
      }, 10);
      
      // Auto-scroll to bottom
      this._logElement.scrollTop = this._logElement.scrollHeight;
      
      // Remove old entries if too many
      const entries = this._logElement.querySelectorAll('p');
      if (entries.length > 10) {
        const oldEntry = entries[0];
        oldEntry.style.opacity = '0';
        oldEntry.style.transform = 'translateY(-10px)';
        setTimeout(() => oldEntry.remove(), 300);
      }
    }

    _AddCombatLogAnimated(message, type = 'normal') {
      if (!this._logElement) return;
      
      const logEntry = document.createElement('p');
      logEntry.textContent = message;
      
      // Style based on message type
      const styles = {
        normal: 'color: white;',
        success: 'color: #4CAF50; font-weight: bold;',
        error: 'color: #f44336; font-weight: bold;',
        warning: 'color: #ff9800; font-weight: bold;',
        info: 'color: #2196F3; font-weight: bold;'
      };
      
      logEntry.style.cssText = `
        margin: 3px 0;
        font-size: 0.9em;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        opacity: 0;
        transform: translateY(20px) scale(0.8);
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        ${styles[type] || styles.normal}
      `;
      
      this._logElement.appendChild(logEntry);
      
      // Enhanced animation
      setTimeout(() => {
        logEntry.style.opacity = '1';
        logEntry.style.transform = 'translateY(0) scale(1)';
      }, 10);
      
      // Add glow effect for special types
      if (type === 'success' || type === 'error') {
        logEntry.style.boxShadow = `0 0 10px ${type === 'success' ? '#4CAF50' : '#f44336'}40`;
        logEntry.style.borderRadius = '3px';
        logEntry.style.padding = '2px 5px';
        logEntry.style.background = `${type === 'success' ? '#4CAF50' : '#f44336'}20`;
      }
      
      // Auto-scroll to bottom with smooth animation
      this._smoothScrollToBottom();
      
      // Remove old entries if too many
      const entries = this._logElement.querySelectorAll('p');
      if (entries.length > 8) {
        const oldEntry = entries[0];
        oldEntry.style.opacity = '0';
        oldEntry.style.transform = 'translateY(-20px) scale(0.8)';
        setTimeout(() => oldEntry.remove(), 500);
      }
    }

    _smoothScrollToBottom() {
      if (!this._logElement) return;
      
      const targetScrollTop = this._logElement.scrollHeight;
      const startScrollTop = this._logElement.scrollTop;
      const distance = targetScrollTop - startScrollTop;
      const duration = 300;
      
      let startTime = null;
      
      const animateScroll = (currentTime) => {
        if (startTime === null) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        
        this._logElement.scrollTop = startScrollTop + (distance * easeOutCubic);
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        }
      };
      
      requestAnimationFrame(animateScroll);
    }

    clearLog() {
      if (!this._logElement) return;
      
      const entries = this._logElement.querySelectorAll('p');
      entries.forEach((entry, index) => {
        setTimeout(() => {
          entry.style.opacity = '0';
          entry.style.transform = 'translateY(-10px) scale(0.8)';
          setTimeout(() => entry.remove(), 300);
        }, index * 50);
      });
    }

    addSystemMessage(message) {
      this._AddCombatLogAnimated(`⚙️ ${message}`, 'info');
    }

    addPlayerAction(action, result = '') {
      const message = result ? `🎯 ${action} - ${result}` : `🎯 ${action}`;
      this._AddCombatLogAnimated(message, 'normal');
    }

    addMonsterAction(action, result = '') {
      const message = result ? `👾 ${action} - ${result}` : `👾 ${action}`;
      this._AddCombatLogAnimated(message, 'warning');
    }

    addDamageMessage(attacker, defender, damage) {
      const message = `💥 ${attacker} inflige ${damage} dégâts à ${defender}`;
      this._AddCombatLogAnimated(message, 'error');
    }

    addHealMessage(target, amount) {
      const message = `💚 ${target} récupère ${amount} PV`;
      this._AddCombatLogAnimated(message, 'success');
    }

    addLevelUpMessage(newLevel) {
      const message = `🎉 NIVEAU SUPÉRIEUR ! Niveau ${newLevel} atteint !`;
      this._AddCombatLogAnimated(message, 'success');
    }

    addCombatStartMessage(monsterName) {
      this.clearLog();
      this._AddCombatLogAnimated(`⚔️ Combat contre ${monsterName} !`, 'warning');
    }

    addCombatEndMessage(playerWon, xpReward = 0) {
      if (playerWon) {
        this._AddCombatLogAnimated(`🏆 Victoire ! +${xpReward} XP`, 'success');
      } else {
        this._AddCombatLogAnimated(`💀 Défaite...`, 'error');
      }
    }
  }

  return {
    CombatLogger: CombatLogger,
  };

})();