// Adaptateur pour le système de combat existant
// Remplace les appels à quiz_database par advanced_question_manager selon le mode

import { advanced_question_manager } from './advanced-question-manager.js';
import { game_modes_config } from './game-modes-config.js';

export const combat_system_adapter = (() => {
  
  const { GameModesConfig } = game_modes_config;
  
  // Wrapper qui remplace quiz_database dans combat-system.js
  const QuizDatabaseAdapter = {
    
    // Récupère une question selon le mode et le niveau actuels
    async getQuestionForCurrentMode(playerLevel = 1) {
      const currentMode = GameModesConfig.currentMode;
      console.log(`🎯 Récupération question pour mode: ${currentMode}, niveau: ${playerLevel}`);
      
      try {
        const question = await advanced_question_manager.getQuestionForLevel(playerLevel, currentMode);
        
        if (!question) {
          console.warn(`⚠️ Aucune question trouvée pour ${currentMode} niveau ${playerLevel}`);
          return this._getFallbackQuestion(currentMode);
        }
        
        // Vérifier que la question est appropriée pour le mode
        if (!this._isQuestionValidForMode(question, currentMode)) {
          console.warn(`⚠️ Question non adaptée au mode ${currentMode}:`, question);
          return this._getFallbackQuestion(currentMode);
        }
        
        return question;
      } catch (error) {
        console.error('❌ Erreur lors de la récupération de question:', error);
        return this._getFallbackQuestion(currentMode);
      }
    },
    
    // Méthode pour compatibilité avec l'ancien système
    getAllQuestions() {
      const currentMode = GameModesConfig.currentMode;
      console.log(`📚 getAllQuestions() appelé en mode: ${currentMode}`);
      
      // Retourner des questions par défaut selon le mode
      if (currentMode === 'children') {
        return this._getChildrenDefaultQuestions();
      } else {
        return this._getAdultDefaultQuestions();
      }
    },
    
    // Méthode pour obtenir une question aléatoire selon le mode
    getRandomQuestion(excludeQuestions = []) {
      const currentMode = GameModesConfig.currentMode;
      console.log(`🎲 getRandomQuestion() appelé en mode: ${currentMode}`);
      
      if (currentMode === 'children') {
        return this._getRandomChildrenQuestion(excludeQuestions);
      } else {
        return this._getRandomAdultQuestion(excludeQuestions);
      }
    },
    
    // Méthode pour obtenir des questions par catégorie (avec filtrage mode)
    getQuestionsByCategory(category) {
      const currentMode = GameModesConfig.currentMode;
      const modeConfig = GameModesConfig.modeSettings[currentMode];
      
      // Vérifier si la catégorie est autorisée dans le mode actuel
      if (!modeConfig.categories.includes(category)) {
        console.warn(`⚠️ Catégorie ${category} non autorisée en mode ${currentMode}`);
        return [];
      }
      
      // Si c'est une question de code en mode enfant, retourner vide
      if (category === 'code' && currentMode === 'children') {
        console.log(`🚫 Questions de code bloquées en mode enfant`);
        return [];
      }
      
      console.log(`📖 Questions de catégorie ${category} en mode ${currentMode}`);
      return this._getQuestionsByModeAndCategory(currentMode, category);
    },
    
    // Vérifie si une question est valide pour le mode donné
    _isQuestionValidForMode(question, mode) {
      const modeConfig = GameModesConfig.modeSettings[mode];
      
      // Vérifier la catégorie
      if (!modeConfig.categories.includes(question.category)) {
        return false;
      }
      
      // Vérifier le type de question
      if (question.type === 'code' && !modeConfig.hasCodeQuestions) {
        return false;
      }
      
      return true;
    },
    
    // Questions de secours pour les enfants
    _getFallbackQuestion(mode) {
      if (mode === 'children') {
        return {
          question: "Combien font 2 + 2 ?",
          options: ["2", "3", "4", "5"],
          correct: 2,
          category: "math",
          difficulty: "very_easy",
          points: 10
        };
      } else {
        return {
          question: "Que signifie HTML ?",
          options: ["HyperText Markup Language", "Home Tool Language", "High Tech Language", "Hyper Transfer Language"],
          correct: 0,
          category: "geek",
          difficulty: "easy",
          points: 20
        };
      }
    },
    
    // Questions par défaut pour les enfants
    _getChildrenDefaultQuestions() {
      return [
        {
          question: "Combien font 1 + 1 ?",
          options: ["1", "2", "3", "4"],
          correct: 1,
          category: "math",
          difficulty: "very_easy",
          points: 10
        },
        {
          question: "Quelle couleur obtient-on en mélangeant rouge et jaune ?",
          options: ["Vert", "Orange", "Violet", "Bleu"],
          correct: 1,
          category: "general",
          difficulty: "very_easy",
          points: 15
        },
        {
          question: "Combien de pattes a un chat ?",
          options: ["2", "3", "4", "5"],
          correct: 2,
          category: "nature",
          difficulty: "very_easy",
          points: 12
        }
      ];
    },
    
    // Questions par défaut pour les adultes
    _getAdultDefaultQuestions() {
      return [
        {
          question: "Que signifie HTML ?",
          options: ["HyperText Markup Language", "Home Tool Language", "High Tech Language", "Hyper Transfer Language"],
          correct: 0,
          category: "geek",
          difficulty: "easy",
          points: 20
        },
        {
          question: "Combien font 25 × 8 ?",
          options: ["180", "200", "220", "240"],
          correct: 1,
          category: "math",
          difficulty: "easy",
          points: 20
        }
      ];
    },
    
    // Question aléatoire pour enfants
    _getRandomChildrenQuestion(excludeQuestions) {
      const questions = this._getChildrenDefaultQuestions();
      const available = questions.filter(q => !excludeQuestions.includes(q));
      if (available.length === 0) return questions[0];
      return available[Math.floor(Math.random() * available.length)];
    },
    
    // Question aléatoire pour adultes
    _getRandomAdultQuestion(excludeQuestions) {
      const questions = this._getAdultDefaultQuestions();
      const available = questions.filter(q => !excludeQuestions.includes(q));
      if (available.length === 0) return questions[0];
      return available[Math.floor(Math.random() * available.length)];
    },
    
    // Questions par mode et catégorie
    _getQuestionsByModeAndCategory(mode, category) {
      if (mode === 'children') {
        const childrenQuestions = this._getChildrenDefaultQuestions();
        return childrenQuestions.filter(q => q.category === category);
      } else {
        const adultQuestions = this._getAdultDefaultQuestions();
        return adultQuestions.filter(q => q.category === category);
      }
    }
  };
  
  // Fonction pour injecter l'adaptateur dans le système de combat existant
  const injectAdapterIntoCombatSystem = () => {
    // Attendre que le système de combat soit chargé
    const checkCombatSystem = setInterval(() => {
      if (window.combatSystemInstance || document.querySelector('.combat-ui')) {
        clearInterval(checkCombatSystem);
        
        // Remplacer les références à quiz_database
        if (window.combatSystemInstance && window.combatSystemInstance._quizDatabase) {
          console.log('🔧 Injection de l\'adaptateur dans le système de combat');
          
          // Remplacer la base de données de quiz
          window.combatSystemInstance._quizDatabase = QuizDatabaseAdapter.getAllQuestions();
          
          // Ajouter des méthodes adaptées
          window.combatSystemInstance._getQuestionForCurrentMode = async (level) => {
            return await QuizDatabaseAdapter.getQuestionForCurrentMode(level);
          };
          
          window.combatSystemInstance._isCodeAllowed = () => {
            return GameModesConfig.utils.isCodeAllowed();
          };
          
          console.log('✅ Adaptateur injecté avec succès');
        }
        
        // Masquer les éléments de code si en mode enfant
        if (GameModesConfig.currentMode === 'children') {
          hideCodeElementsInCombat();
        }
      }
    }, 100);
    
    // Arrêter la vérification après 10 secondes
    setTimeout(() => {
      clearInterval(checkCombatSystem);
    }, 10000);
  };
  
  // Fonction pour masquer les éléments de code dans l'interface de combat
  const hideCodeElementsInCombat = () => {
    console.log('🚫 Masquage des éléments de code en mode enfant');
    
    const codeSelectors = [
      '.menu-option[data-action="code"]',
      '.code-interface',
      '.code-container',
      '#code-timer',
      '#code-input',
      '.code-actions',
      '.code-hints',
      '[data-code-question]'
    ];
    
    codeSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.style.display = 'none';
        element.setAttribute('data-hidden-by-mode', 'children');
      });
    });
    
    // Masquer spécifiquement l'option "Code" du menu de combat
    const codeMenuOption = document.querySelector('.menu-option[onclick*="code"]');
    if (codeMenuOption) {
      codeMenuOption.style.display = 'none';
      console.log('🚫 Option Code masquée du menu de combat');
    }
  };
  
  // Fonction pour restaurer les éléments de code en mode adulte
  const showCodeElementsInCombat = () => {
    console.log('✅ Affichage des éléments de code en mode adulte');
    
    const hiddenElements = document.querySelectorAll('[data-hidden-by-mode="children"]');
    hiddenElements.forEach(element => {
      element.style.display = '';
      element.removeAttribute('data-hidden-by-mode');
    });
  };
  
  // Écouter les changements de mode
  const handleModeChange = (newMode) => {
    console.log(`🔄 Changement de mode détecté: ${newMode}`);
    
    if (newMode === 'children') {
      hideCodeElementsInCombat();
    } else {
      showCodeElementsInCombat();
    }
  };
  
  // Initialisation
  const init = () => {
    console.log('🚀 Initialisation de l\'adaptateur de système de combat');
    
    // Injecter l'adaptateur
    injectAdapterIntoCombatSystem();
    
    // Écouter les changements de mode
    document.addEventListener('mode-changed', (event) => {
      handleModeChange(event.detail.mode);
    });
    
    // Masquer les éléments de code si on démarre en mode enfant
    if (GameModesConfig.currentMode === 'children') {
      setTimeout(hideCodeElementsInCombat, 1000);
    }
  };
  
  return {
    QuizDatabaseAdapter,
    init,
    injectAdapterIntoCombatSystem,
    hideCodeElementsInCombat,
    showCodeElementsInCombat,
    handleModeChange
  };
})();

// Auto-initialisation
document.addEventListener('DOMContentLoaded', () => {
  combat_system_adapter.init();
});

export default combat_system_adapter;