// Configuration du jeu pour l'équilibrage des dégâts, soins et XP
// Modifiez ces valeurs pour ajuster l'équilibre du jeu

const game_config = (() => {
  
  const GameConfig = {
    // === CONFIGURATION DU JOUEUR ===
    player: {
      // Stats de base au niveau 1
      baseHealth: 100,
      baseDamage: 15,
      baseHeal: 20,
      
      // Progression par niveau
      healthPerLevel: 20,        // +20 HP par niveau
      statPointsPerLevel: 1,     // 1 point à répartir par niveau
      
      // Bonus par point d'amélioration
      damagePerPoint: 5,         // +5 dégâts par point investi
      healPerPoint: 3,           // +3 soins par point investi
      
      // XP et niveaux
      baseXPToNextLevel: 100,
      xpMultiplierPerLevel: 1.5, // XP requis * 1.5 à chaque niveau
      maxLevel: 50,
      
      // Limites des améliorations
      maxDamageBonus: 200,       // Maximum +200 dégâts
      maxHealBonus: 150,         // Maximum +150 soins
    },
    
    // === CONFIGURATION DES ENNEMIS ===
    enemies: {
      // Les ennemis sont plus résistants pour augmenter la difficulté
      damageReductionFactor: 0.5,  // Ennemis font 50% des dégâts du joueur
      healthReductionFactor: 2.1,  // Ennemis ont 210% de la vie du joueur (3x plus résistants)
      
      // Bonus par type d'ennemi
      types: {
        'IA001': {
          healthMultiplier: 0.8,
          damageMultiplier: 0.6,
          xpReward: 25
        },
        'robot': {
          healthMultiplier: 1.0,
          damageMultiplier: 0.8,
          xpReward: 40
        },
        'monster': {
          healthMultiplier: 1.2,
          damageMultiplier: 0.9,
          xpReward: 60
        }
      }
    },
    
    // === CONFIGURATION DU COMBAT ===
    combat: {
      // Chances de réussite des IA
      robotSuccessRate: 0.7,      // 70% de chance de réussir
      
      // Effets visuels
      damageShakeDuration: 500,
      healEffectDuration: 2000,
      victoryEffectDuration: 1500,
      
      // Sons
      soundVolume: 0.3,
      soundDuration: 0.4,
    },
    
    // === FORMULES DE CALCUL ===
    formulas: {
      // Calcul des dégâts du joueur
      playerDamage: (level, damageBonus) => {
        return GameConfig.player.baseDamage + damageBonus + (level * 2);
      },
      
      // Calcul des soins du joueur
      playerHeal: (level, healBonus) => {
        return GameConfig.player.baseHeal + healBonus + (level * 1);
      },
      
      // Calcul de la vie maximale du joueur
      playerMaxHealth: (level) => {
        return GameConfig.player.baseHealth + ((level - 1) * GameConfig.player.healthPerLevel);
      },
      
      // Calcul des dégâts des ennemis (50% plus faible)
      enemyDamage: (playerLevel, playerDamageBonus, enemyType = 'robot') => {
        const playerDamage = GameConfig.formulas.playerDamage(playerLevel, playerDamageBonus);
        const baseEnemyDamage = playerDamage * GameConfig.enemies.damageReductionFactor;
        const typeMultiplier = GameConfig.enemies.types[enemyType]?.damageMultiplier || 1.0;
        return Math.floor(baseEnemyDamage * typeMultiplier);
      },
      
      // Calcul de la vie des ennemis
      enemyHealth: (playerLevel, enemyType = 'robot') => {
        const playerHealth = GameConfig.formulas.playerMaxHealth(playerLevel);
        const baseEnemyHealth = playerHealth * GameConfig.enemies.healthReductionFactor;
        const typeMultiplier = GameConfig.enemies.types[enemyType]?.healthMultiplier || 1.0;
        return Math.floor(baseEnemyHealth * typeMultiplier);
      },
      
      // Calcul de l'XP requis pour le niveau suivant
      xpToNextLevel: (currentLevel) => {
        return Math.floor(GameConfig.player.baseXPToNextLevel * Math.pow(GameConfig.player.xpMultiplierPerLevel, currentLevel - 1));
      },
      
      // Calcul de la récompense XP
      xpReward: (enemyLevel, enemyType = 'robot') => {
        const baseReward = GameConfig.enemies.types[enemyType]?.xpReward || 30;
        return Math.floor(baseReward + (enemyLevel * 5));
      }
    },
    
    // === SYSTÈME DE PROGRESSION ===
    progression: {
      // Options d'amélioration à chaque niveau
      upgradeOptions: [
        {
          id: 'damage',
          name: 'Augmenter les dégâts',
          description: '+10 points de dégâts',
          bonus: 10,
          icon: '⚔️'
        },
        {
          id: 'heal',
          name: 'Augmenter les soins',
          description: '+10 points de soins',
          bonus: 10,
          icon: '💚'
        }
      ],
      
      // Validation des choix
      canUpgrade: (currentBonus, maxBonus) => {
        return currentBonus < maxBonus;
      }
    },
    
    // === CONFIGURATION DES QUIZ ===
    quiz: {
      // Temps de réflexion
      thinkingTime: 1500,
      
      // Nombre minimum de questions différentes
      minQuestions: 20,
      
      // Difficulté par niveau
      difficultyByLevel: {
        1: 'easy',
        5: 'medium',
        10: 'hard',
        20: 'expert'
      }
    },
    
    // === FONCTIONS UTILITAIRES ===
    utils: {
      // Obtenir le type d'ennemi à partir du nom
      getEnemyType: (enemyName) => {
        if (enemyName && enemyName.toLowerCase().includes('ia001')) return 'IA001';
        if (enemyName && enemyName.toLowerCase().includes('robot')) return 'robot';
        return 'monster';
      },
      
      // Valider les stats du joueur
      validatePlayerStats: (damageBonus, healBonus) => {
        return {
          damage: Math.min(damageBonus, GameConfig.player.maxDamageBonus),
          heal: Math.min(healBonus, GameConfig.player.maxHealBonus)
        };
      },
      
      // Calculer les stats complètes du joueur
      getPlayerStats: (level, damageBonus, healBonus) => {
        const validated = GameConfig.utils.validatePlayerStats(damageBonus, healBonus);
        return {
          level: level,
          maxHealth: GameConfig.formulas.playerMaxHealth(level),
          damage: GameConfig.formulas.playerDamage(level, validated.damage),
          heal: GameConfig.formulas.playerHeal(level, validated.heal),
          xpToNext: GameConfig.formulas.xpToNextLevel(level),
          damageBonus: validated.damage,
          healBonus: validated.heal
        };
      },
      
      // Calculer les stats d'un ennemi
      getEnemyStats: (playerLevel, playerDamageBonus, enemyName) => {
        const enemyType = GameConfig.utils.getEnemyType(enemyName);
        return {
          type: enemyType,
          health: GameConfig.formulas.enemyHealth(playerLevel, enemyType),
          damage: GameConfig.formulas.enemyDamage(playerLevel, playerDamageBonus, enemyType),
          xpReward: GameConfig.formulas.xpReward(playerLevel, enemyType)
        };
      }
    }
  };
  
  return {
    GameConfig: GameConfig
  };
  
})();

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = game_config;
}

// Export ES6 pour les modules
export { game_config };