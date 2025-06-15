import {game_config} from '../game-config.js';

export const health_stats = (() => {
  const {GameConfig} = game_config;

  class HealthStatsManager {
    constructor(params) {
      this._params = params;
      this._combatLogger = null;
      this._audioSystem = null;
      this._visualEffects = null;
      
      // Player stats based on game config
      this._playerLevel = 1;
      this._playerXP = 0;
      this._playerDamageBonus = 0;
      this._playerHealBonus = 0;
      
      // Calculate initial stats
      this._playerMaxHealth = GameConfig.formulas.playerMaxHealth(this._playerLevel);
      this._playerHealth = this._playerMaxHealth;
      this._playerXPToNextLevel = GameConfig.formulas.xpToNextLevel(this._playerLevel);
      
      // Upgrade system
      this._pendingLevelUp = false;
      this._availableUpgradePoints = 0;
      
      // Current monster reference
      this._currentMonster = null;
    }

    init(combatLogger, audioSystem, visualEffects) {
      this._combatLogger = combatLogger;
      this._audioSystem = audioSystem;
      this._visualEffects = visualEffects;
      console.log('💪 HealthStatsManager initialized');
    }

    setCurrentMonster(monster) {
      this._currentMonster = monster;
    }

    // Damage calculation methods
    _CalculatePlayerDamage() {
      const baseDamage = GameConfig.formulas.playerBaseDamage(this._playerLevel);
      const randomFactor = 0.8 + Math.random() * 0.4; // 80% to 120%
      const totalDamage = Math.floor((baseDamage + this._playerDamageBonus) * randomFactor);
      return Math.max(1, totalDamage);
    }

    _CalculateMonsterDamage() {
      if (!this._currentMonster) return 0;
      
      const monsterLevel = this._GetMonsterLevel();
      const baseDamage = GameConfig.formulas.monsterBaseDamage(monsterLevel);
      const randomFactor = 0.8 + Math.random() * 0.4; // 80% to 120%
      return Math.floor(baseDamage * randomFactor);
    }

    _CalculateRobotDamage() {
      const robotLevel = Math.floor(this._playerLevel * 0.8);
      const baseDamage = GameConfig.formulas.monsterBaseDamage(robotLevel);
      const randomFactor = 0.7 + Math.random() * 0.6; // 70% to 130%
      return Math.floor(baseDamage * randomFactor);
    }

    // Health manipulation methods
    _DamageMonster(damage) {
      if (!this._currentMonster) return;
      
      this._currentMonster._health = Math.max(0, this._currentMonster._health - damage);
      
      if (this._combatLogger) {
        this._combatLogger.addDamageMessage('Joueur', this._currentMonster.Name || 'Monstre', damage);
      }
      
      if (this._audioSystem) {
        this._audioSystem._PlayDamageSound();
      }
      
      if (this._visualEffects) {
        this._visualEffects._CreateDamageEffect(damage, 'monster');
      }
      
      console.log(`Monster took ${damage} damage. Health: ${this._currentMonster._health}/${this._currentMonster._maxHealth}`);
      
      return this._currentMonster._health <= 0;
    }

    _DamagePlayer(damage) {
      this._playerHealth = Math.max(0, this._playerHealth - damage);
      
      if (this._combatLogger) {
        this._combatLogger.addDamageMessage('Monstre', 'Joueur', damage);
      }
      
      if (this._audioSystem) {
        this._audioSystem._PlayDamageSound();
      }
      
      if (this._visualEffects) {
        this._visualEffects._CreateDamageEffect(damage, 'player');
        this._visualEffects._ShakeScreen();
      }
      
      console.log(`Player took ${damage} damage. Health: ${this._playerHealth}/${this._playerMaxHealth}`);
      
      return this._playerHealth <= 0;
    }

    _HealPlayer(amount) {
      const actualHeal = Math.min(amount, this._playerMaxHealth - this._playerHealth);
      this._playerHealth += actualHeal;
      
      if (this._combatLogger && actualHeal > 0) {
        this._combatLogger.addHealMessage('Joueur', actualHeal);
      }
      
      if (this._audioSystem && actualHeal > 0) {
        this._audioSystem._PlayHealSound();
      }
      
      if (this._visualEffects && actualHeal > 0) {
        this._visualEffects._ShowHealEffect();
        this._visualEffects._CreateHealParticles();
      }
      
      console.log(`Player healed for ${actualHeal}. Health: ${this._playerHealth}/${this._playerMaxHealth}`);
      
      return actualHeal;
    }

    // XP and leveling methods
    _AwardXP(amount) {
      this._playerXP += amount;
      console.log(`Awarded ${amount} XP. Total: ${this._playerXP}/${this._playerXPToNextLevel}`);
      
      if (this._playerXP >= this._playerXPToNextLevel) {
        this._LevelUp();
      }
    }

    _LevelUp() {
      const oldLevel = this._playerLevel;
      this._playerLevel++;
      
      // Calculate new stats
      const oldMaxHealth = this._playerMaxHealth;
      this._playerMaxHealth = GameConfig.formulas.playerMaxHealth(this._playerLevel);
      const healthIncrease = this._playerMaxHealth - oldMaxHealth;
      
      // Heal to full and add the health increase
      this._playerHealth = this._playerMaxHealth;
      
      // Calculate new XP requirement
      this._playerXPToNextLevel = GameConfig.formulas.xpToNextLevel(this._playerLevel);
      
      // Award upgrade points
      this._availableUpgradePoints += GameConfig.player.statPointsPerLevel;
      this._pendingLevelUp = true;
      
      console.log(`🎉 LEVEL UP! ${oldLevel} → ${this._playerLevel}`);
      console.log(`Health increased by ${healthIncrease} (${oldMaxHealth} → ${this._playerMaxHealth})`);
      console.log(`Next level requires ${this._playerXPToNextLevel} XP`);
      console.log(`Gained ${GameConfig.player.statPointsPerLevel} upgrade points`);
      
      if (this._combatLogger) {
        this._combatLogger.addLevelUpMessage(this._playerLevel);
      }
      
      if (this._audioSystem) {
        this._audioSystem._PlayUISound('levelup');
      }
      
      if (this._visualEffects) {
        this._visualEffects._TriggerLevelUpEffect();
      }
    }

    _CalculateXPReward() {
      if (!this._currentMonster) return 0;
      
      const monsterLevel = this._GetMonsterLevel();
      const baseXP = GameConfig.formulas.xpReward(monsterLevel);
      const randomBonus = Math.floor(Math.random() * (baseXP * 0.3)); // Up to 30% bonus
      return baseXP + randomBonus;
    }

    _GetMonsterLevel() {
      if (!this._currentMonster) return 1;
      
      // Calculate monster level based on its health relative to player
      const healthRatio = this._currentMonster._maxHealth / this._playerMaxHealth;
      return Math.max(1, Math.floor(this._playerLevel * healthRatio));
    }

    _UpgradeAttribute(attribute) {
      if (this._availableUpgradePoints <= 0) {
        console.warn('No upgrade points available');
        return false;
      }
      
      switch (attribute) {
        case 'damage':
          this._playerDamageBonus += GameConfig.player.damagePerPoint;
          break;
        case 'heal':
          this._playerHealBonus += GameConfig.player.healPerPoint;
          break;
        case 'health':
          const healthIncrease = GameConfig.player.healthPerLevel;
          this._playerMaxHealth += healthIncrease;
          this._playerHealth += healthIncrease; // Also increase current health
          break;
        default:
          console.warn('Unknown attribute:', attribute);
          return false;
      }
      
      this._availableUpgradePoints--;
      
      if (this._audioSystem) {
        this._audioSystem._PlayUpgradeSound();
      }
      
      console.log(`Upgraded ${attribute}. Remaining points: ${this._availableUpgradePoints}`);
      return true;
    }

    _RespawnPlayer() {
      this._playerHealth = this._playerMaxHealth;
      console.log('Player respawned with full health');
      
      if (this._combatLogger) {
        this._combatLogger.addSystemMessage('Joueur ressuscité');
      }
    }

    _KillMonster() {
      if (!this._currentMonster) return;
      
      console.log(`Monster ${this._currentMonster.Name || 'Unknown'} defeated`);
      
      if (this._combatLogger) {
        this._combatLogger.addSystemMessage(`${this._currentMonster.Name || 'Monstre'} vaincu !`);
      }
    }

    // Getters for accessing stats
    getPlayerHealth() {
      return this._playerHealth;
    }

    getPlayerMaxHealth() {
      return this._playerMaxHealth;
    }

    getPlayerLevel() {
      return this._playerLevel;
    }

    getPlayerXP() {
      return this._playerXP;
    }

    getPlayerXPToNextLevel() {
      return this._playerXPToNextLevel;
    }

    getPlayerDamageBonus() {
      return this._playerDamageBonus;
    }

    getPlayerHealBonus() {
      return this._playerHealBonus;
    }

    getAvailableUpgradePoints() {
      return this._availableUpgradePoints;
    }

    isPendingLevelUp() {
      return this._pendingLevelUp;
    }

    clearPendingLevelUp() {
      this._pendingLevelUp = false;
    }

    // Status checks
    isPlayerDead() {
      return this._playerHealth <= 0;
    }

    isMonsterDead() {
      return this._currentMonster && this._currentMonster._health <= 0;
    }

    getPlayerHealthPercentage() {
      return (this._playerHealth / this._playerMaxHealth) * 100;
    }

    getMonsterHealthPercentage() {
      if (!this._currentMonster) return 0;
      return (this._currentMonster._health / this._currentMonster._maxHealth) * 100;
    }
  }

  return {
    HealthStatsManager: HealthStatsManager,
  };

})();