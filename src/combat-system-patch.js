// Patch pour combat-system.js - Remplace quiz_database par advanced_question_manager
// S'applique automatiquement pour utiliser les questions selon le mode actuel

import { advanced_question_manager } from './advanced-question-manager.js';
import { game_modes_config } from './game-modes-config.js';
import { children_questions_direct } from './children-questions-direct.js';
import { audio_helper } from './audio-helper.js';

export const combat_system_patch = (() => {
  
  const { GameModesConfig } = game_modes_config;
  
  // Fonction pour patcher le système de combat existant
  const applyPatch = () => {
    console.log('🔧 Application du patch pour combat-system.js');
    
    // Attendre que le système de combat soit disponible
    const waitForCombatSystem = setInterval(() => {
      const combatInstance = window.combatSystemInstance;
      
      if (combatInstance) {
        clearInterval(waitForCombatSystem);
        console.log('✅ Système de combat trouvé, application du patch...');
        
        // Sauvegarder les méthodes originales
        combatInstance._originalGetRandomQuestion = combatInstance._GetRandomQuestion?.bind(combatInstance);
        combatInstance._originalShowQuizSection = combatInstance._ShowQuizSection?.bind(combatInstance);
        combatInstance._originalHandleCodeAction = combatInstance._HandleCodeAction?.bind(combatInstance);
        
        // Remplacer _GetRandomQuestion
        combatInstance._GetRandomQuestion = function() {
          const currentMode = GameModesConfig.currentMode;
          console.log(`🎯 _GetRandomQuestion appelé en mode: ${currentMode}`);
          
          if (currentMode === 'children') {
            // Utiliser les questions d'enfants directement
            const question = children_questions_direct.getRandomQuestionForLevel(
              this._playerLevel || 1, 
              Array.from(this._usedQuestions || [])
            );
            console.log(`✅ Question enfant obtenue:`, question);
            return question;
          } else {
            // Pour les adultes, utiliser l'ancien système
            try {
              const adultQuestion = getDefaultQuestionForMode('adults');
              console.log(`✅ Question adulte obtenue:`, adultQuestion);
              return adultQuestion;
            } catch (error) {
              console.error('❌ Erreur question adulte:', error);
              return getDefaultQuestionForMode('adults');
            }
          }
        };
        
        // Remplacer _ShowQuizSection pour filtrer selon le mode et ajouter l'audio
        combatInstance._ShowQuizSection = function() {
          const currentMode = GameModesConfig.currentMode;
          console.log(`📚 _ShowQuizSection appelé en mode: ${currentMode}`);
          
          // Obtenir une nouvelle question selon le mode
          const question = this._GetRandomQuestion();
          
          if (!question) {
            console.error('❌ Aucune question disponible');
            return;
          }
          
          // Bloquer les questions de code en mode enfant
          if (currentMode === 'children' && question.type === 'code') {
            console.log('🚫 Question de code bloquée en mode enfant');
            const childQuestion = children_questions_direct.getRandomQuestionForLevel(this._playerLevel || 1);
            this._currentQuiz = childQuestion;
          } else {
            this._currentQuiz = question;
          }
          
          // Afficher l'interface quiz
          this._ShowQuizUI();
          
          // Lire la question à voix haute après un petit délai
          setTimeout(() => {
            if (currentMode === 'children') {
              audio_helper.readQuestion(this._currentQuiz, 'children');
            }
          }, 500);
        };
        
        // Remplacer _HandleCodeAction pour le bloquer en mode enfant
        combatInstance._HandleCodeAction = function() {
          const currentMode = GameModesConfig.currentMode;
          
          if (currentMode === 'children') {
            console.log('🚫 Action code bloquée en mode enfant');
            this._AddCombatLog('❌ Cette action n\'est pas disponible en mode enfant!');
            this._PlayUISound('incorrect');
            return;
          }
          
          // Appeler la méthode originale pour les adultes
          if (this._originalHandleCodeAction) {
            this._originalHandleCodeAction();
          }
        };
        
        // Ajouter une méthode pour obtenir une question selon le mode
        combatInstance._GetQuestionForCurrentMode = async function() {
          return await advanced_question_manager.getQuestionForLevel(this._playerLevel || 1);
        };
        
        // Ajouter une méthode pour vérifier si le code est autorisé
        combatInstance._IsCodeAllowed = function() {
          return GameModesConfig.utils.isCodeAllowed();
        };
        
        // Remplacer la base de données de quiz pour forcer les questions d'enfants
        if (GameModesConfig.currentMode === 'children') {
          combatInstance._quizDatabase = children_questions_direct.getAllChildrenQuestions();
          console.log('🧒 Base de données de quiz remplacée par les questions d\'enfants');
        }
        
        // Forcer une nouvelle question si nécessaire
        refreshCurrentQuestion(combatInstance);
        
        console.log('✅ Patch appliqué avec succès');
      }
    }, 100);
    
    // Arrêter après 10 secondes si non trouvé
    setTimeout(() => {
      clearInterval(waitForCombatSystem);
    }, 10000);
  };
  
  // Fonction pour rafraîchir la question actuelle selon le mode
  const refreshCurrentQuestion = async (combatInstance) => {
    if (combatInstance._currentQuiz) {
      const currentMode = GameModesConfig.currentMode;
      
      // Si on a une question de code en mode enfant, la remplacer
      if (currentMode === 'children' && combatInstance._currentQuiz.type === 'code') {
        console.log('🔄 Remplacement de la question de code en mode enfant');
        
        try {
          const newQuestion = await advanced_question_manager.getQuestionForLevel(
            combatInstance._playerLevel || 1, 
            'children'
          );
          
          if (newQuestion && newQuestion.type !== 'code') {
            combatInstance._currentQuiz = newQuestion;
            console.log('✅ Question remplacée par:', newQuestion);
          }
        } catch (error) {
          console.error('❌ Erreur lors du remplacement de question:', error);
        }
      }
    }
  };
  
  // Questions par défaut selon le mode
  const getDefaultQuestionForMode = (mode) => {
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
  };
  
  // Fonction pour masquer les éléments de code de façon agressive
  const hideCodeElementsInCombat = () => {
    console.log('🚫 Masquage agressif des éléments de code');
    
    const hideElement = (element) => {
      if (element) {
        element.style.display = 'none !important';
        element.style.visibility = 'hidden';
        element.setAttribute('data-hidden-by-children-mode', 'true');
        
        // Masquer aussi les parents si nécessaire
        if (element.parentElement && element.parentElement.classList.contains('code-related')) {
          hideElement(element.parentElement);
        }
      }
    };
    
    // Liste exhaustive des sélecteurs à masquer
    const codeSelectors = [
      // Sélecteurs génériques
      '.code-related',
      '.programming-section',
      '.code-interface',
      '.code-container',
      '#code-container',
      '.code-editor',
      '#code-editor',
      '.code-input',
      '#code-input',
      '.syntax-highlight',
      '.code-timer',
      '#code-timer',
      '.code-actions',
      '.code-hints',
      
      // Sélecteurs spécifiques au combat
      '.menu-option[data-action="code"]',
      '.menu-option[onclick*="code"]',
      '.menu-option[onclick*="Code"]',
      'button[onclick*="Code"]',
      '[data-code-question]',
      '[data-code="true"]',
      
      // Sélecteurs par contenu
      'button:contains("Code")',
      'div:contains("SUPER ATTAQUE - DÉFI CODE")',
      'div:contains("💻")'
    ];
    
    codeSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(hideElement);
      } catch (e) {
        // Ignorer les erreurs de sélecteur
      }
    });
    
    // Masquage par recherche de texte
    const allButtons = document.querySelectorAll('button, .menu-option');
    allButtons.forEach(button => {
      const text = button.textContent || button.innerText || '';
      if (text.toLowerCase().includes('code') || text.includes('💻')) {
        hideElement(button);
      }
    });
  };
  
  // Écouter les changements de mode
  document.addEventListener('mode-changed', (event) => {
    console.log('🔄 Patch: Changement de mode détecté:', event.detail.mode);
    
    if (event.detail.mode === 'children') {
      setTimeout(hideCodeElementsInCombat, 100);
    }
  });
  
  // Masquer immédiatement si on démarre en mode enfant
  if (GameModesConfig.currentMode === 'children') {
    setTimeout(hideCodeElementsInCombat, 500);
  }
  
  return {
    applyPatch,
    hideCodeElementsInCombat,
    refreshCurrentQuestion
  };
})();

// Auto-application du patch
document.addEventListener('DOMContentLoaded', () => {
  combat_system_patch.applyPatch();
});

export default combat_system_patch;