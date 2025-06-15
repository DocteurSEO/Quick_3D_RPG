// Configuration des modes de jeu : enfant et adulte
// Définit les paramètres pour chaque mode et la progression par niveaux

export const game_modes_config = (() => {
  
  const GameModesConfig = {
    // === MODES DISPONIBLES ===
    modes: {
      CHILDREN: 'children',
      ADULTS: 'adults'
    },
    
    // === MODE ACTUEL ===
    currentMode: 'children', // Par défaut en mode enfant
    
    // === CONFIGURATION PAR MODE ===
    modeSettings: {
      children: {
        name: 'Mode Enfant',
        description: 'Questions adaptées aux enfants sans programmation',
        icon: '🧒',
        maxLevel: 20,
        categories: ['math', 'general', 'nature', 'animals'],
        hasCodeQuestions: false,
        timeLimit: {
          easy: 30000,    // 30 secondes
          medium: 45000,  // 45 secondes
          hard: 60000     // 1 minute
        },
        ageRange: '6-12 ans',
        difficultyProgression: {
          1: 'very_easy',
          3: 'easy',
          7: 'medium',
          12: 'medium_plus',
          17: 'hard'
        }
      },
      adults: {
        name: 'Mode Adulte',
        description: 'Questions incluant la programmation et défis techniques',
        icon: '👨‍💻',
        maxLevel: 20,
        categories: ['math', 'general', 'geek', 'code', 'algorithms'],
        hasCodeQuestions: true,
        timeLimit: {
          easy: 60000,     // 1 minute
          medium: 300000,  // 5 minutes
          hard: 600000,    // 10 minutes
          code: 600000     // 10 minutes pour le code
        },
        ageRange: '16+ ans',
        difficultyProgression: {
          1: 'easy',
          4: 'medium',
          8: 'hard',
          12: 'expert',
          16: 'master'
        }
      }
    },
    
    // === PROGRESSION PAR NIVEAU ===
    levelProgression: {
      // Définit combien de questions par catégorie selon le niveau
      children: {
        1: { math: 70, general: 20, nature: 10 },
        5: { math: 60, general: 25, nature: 15 },
        10: { math: 50, general: 30, nature: 20 },
        15: { math: 40, general: 35, nature: 25 },
        20: { math: 30, general: 40, nature: 30 }
      },
      adults: {
        1: { math: 40, general: 30, geek: 30 },
        5: { math: 30, general: 25, geek: 35, code: 10 },
        10: { math: 25, general: 20, geek: 30, code: 25 },
        15: { math: 20, general: 15, geek: 30, code: 35 },
        20: { math: 15, general: 10, geek: 25, code: 50 }
      }
    },
    
    // === RÉCOMPENSES PAR MODE ===
    rewards: {
      children: {
        xpMultiplier: 1.0,
        encouragementMessages: [
          "Bravo ! Continue comme ça ! 🌟",
          "Excellent travail ! 🎉",
          "Tu es sur la bonne voie ! 💪",
          "Fantastique ! Tu apprends vite ! 🚀"
        ],
        badges: {
          5: { name: "Petit Génie", icon: "🧠" },
          10: { name: "Explorateur", icon: "🔍" },
          15: { name: "Champion", icon: "🏆" },
          20: { name: "Maître des Questions", icon: "👑" }
        }
      },
      adults: {
        xpMultiplier: 1.2,
        encouragementMessages: [
          "Excellent raisonnement ! 💡",
          "Code parfaitement exécuté ! 💻",
          "Logique impeccable ! 🎯",
          "Expertise démontrée ! 🔥"
        ],
        badges: {
          5: { name: "Développeur Junior", icon: "💻" },
          10: { name: "Programmeur", icon: "⚡" },
          15: { name: "Expert Technique", icon: "🔧" },
          20: { name: "Architecte Logiciel", icon: "🏗️" }
        }
      }
    },
    
    // === FONCTIONS UTILITAIRES ===
    utils: {
      // Changer de mode
      setMode: (mode) => {
        if (GameModesConfig.modes[mode.toUpperCase()]) {
          GameModesConfig.currentMode = mode.toLowerCase();
          return true;
        }
        return false;
      },
      
      // Obtenir la configuration du mode actuel
      getCurrentModeConfig: () => {
        return GameModesConfig.modeSettings[GameModesConfig.currentMode];
      },
      
      // Obtenir le niveau de difficulté pour un niveau donné
      getDifficultyForLevel: (level, mode = null) => {
        const targetMode = mode || GameModesConfig.currentMode;
        const modeConfig = GameModesConfig.modeSettings[targetMode];
        const progression = modeConfig.difficultyProgression;
        
        let difficulty = 'easy';
        for (const [levelThreshold, diff] of Object.entries(progression)) {
          if (level >= parseInt(levelThreshold)) {
            difficulty = diff;
          }
        }
        return difficulty;
      },
      
      // Obtenir la limite de temps pour une difficulté
      getTimeLimit: (difficulty, mode = null) => {
        const targetMode = mode || GameModesConfig.currentMode;
        const modeConfig = GameModesConfig.modeSettings[targetMode];
        return modeConfig.timeLimit[difficulty] || modeConfig.timeLimit.medium;
      },
      
      // Obtenir les catégories disponibles pour un niveau
      getCategoriesForLevel: (level, mode = null) => {
        const targetMode = mode || GameModesConfig.currentMode;
        const progression = GameModesConfig.levelProgression[targetMode];
        
        // Trouver la configuration la plus proche du niveau
        let config = progression[1]; // Configuration par défaut
        for (const [levelThreshold, categories] of Object.entries(progression)) {
          if (level >= parseInt(levelThreshold)) {
            config = categories;
          }
        }
        return config;
      },
      
      // Obtenir un message d'encouragement aléatoire
      getEncouragementMessage: (mode = null) => {
        const targetMode = mode || GameModesConfig.currentMode;
        const messages = GameModesConfig.rewards[targetMode].encouragementMessages;
        return messages[Math.floor(Math.random() * messages.length)];
      },
      
      // Vérifier si un badge est débloqué
      getBadgeForLevel: (level, mode = null) => {
        const targetMode = mode || GameModesConfig.currentMode;
        const badges = GameModesConfig.rewards[targetMode].badges;
        return badges[level] || null;
      },
      
      // Valider si le code est autorisé dans le mode actuel
      isCodeAllowed: (mode = null) => {
        const targetMode = mode || GameModesConfig.currentMode;
        return GameModesConfig.modeSettings[targetMode].hasCodeQuestions;
      }
    }
  };
  
  return {
    GameModesConfig
  };
})();

// Export par défaut pour compatibilité
export default game_modes_config;