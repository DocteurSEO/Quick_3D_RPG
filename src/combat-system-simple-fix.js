// Correction simple et directe du système de combat
// Remplace la base de données de quiz par des questions pour enfants

import { children_questions_direct } from './children-questions-direct.js';
import { audio_helper } from './audio-helper.js';

export const combat_system_simple_fix = (() => {
  
  // Questions simples pour enfants intégrées directement
  const childrenQuestions = [
    {
      question: "Combien font 1 + 1 ?",
      options: ["1", "2", "3", "4"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 2 + 2 ?",
      options: ["3", "4", "5", "6"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 3 + 1 ?",
      options: ["3", "4", "5", "6"],
      correct: 1,
      category: "math"
    },
    {
      question: "Quelle couleur fait rouge + jaune ?",
      options: ["Vert", "Orange", "Violet", "Bleu"],
      correct: 1,
      category: "general"
    },
    {
      question: "Combien de pattes a un chat ?",
      options: ["2", "3", "4", "5"],
      correct: 2,
      category: "general"
    },
    {
      question: "Quel animal dit 'miaou' ?",
      options: ["Chien", "Chat", "Vache", "Coq"],
      correct: 1,
      category: "general"
    },
    {
      question: "De quelle couleur est le soleil ?",
      options: ["Bleu", "Vert", "Jaune", "Rouge"],
      correct: 2,
      category: "general"
    },
    {
      question: "Combien font 5 + 2 ?",
      options: ["6", "7", "8", "9"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 10 - 3 ?",
      options: ["6", "7", "8", "9"],
      correct: 1,
      category: "math"
    },
    {
      question: "Quel animal vit dans l'eau ?",
      options: ["Chat", "Chien", "Poisson", "Oiseau"],
      correct: 2,
      category: "general"
    }
  ];
  
  // Fonction pour appliquer la correction
  const applyFix = () => {
    console.log('🔧 Application de la correction simple du système de combat');
    
    // Attendre que le système de combat soit disponible
    const checkCombatSystem = setInterval(() => {
      if (window.combatSystemInstance) {
        clearInterval(checkCombatSystem);
        
        console.log('✅ Système de combat trouvé, application de la correction...');
        
        const combatInstance = window.combatSystemInstance;
        
        // ÉTAPE 1: Remplacer la base de données de quiz
        combatInstance._quizDatabase = childrenQuestions;
        console.log('📚 Base de données de quiz remplacée par les questions d\'enfants');
        
        // ÉTAPE 2: Sauvegarder et remplacer _LoadRandomQuiz
        combatInstance._originalLoadRandomQuiz = combatInstance._LoadRandomQuiz;
        
        combatInstance._LoadRandomQuiz = function() {
          console.log('🎯 _LoadRandomQuiz appelé (version enfants)');
          
          // Sélectionner une question aléatoire
          const randomIndex = Math.floor(Math.random() * childrenQuestions.length);
          this._currentQuiz = childrenQuestions[randomIndex];
          
          // Mettre à jour l'interface
          const questionElement = document.getElementById('quiz-question');
          if (questionElement) {
            questionElement.textContent = this._currentQuiz.question;
          }
          
          // Mettre à jour les options
          const options = document.querySelectorAll('.quiz-option .option-text');
          options.forEach((option, index) => {
            if (this._currentQuiz.options[index]) {
              option.textContent = `${String.fromCharCode(65 + index)}) ${this._currentQuiz.options[index]}`;
            }
          });
          
          // Nettoyer les classes précédentes
          const quizOptions = document.querySelectorAll('.quiz-option');
          quizOptions.forEach((option) => {
            option.classList.remove('correct', 'incorrect', 'selected');
            option.disabled = false;
          });
          
          // Réinitialiser la sélection
          this._selectedQuizIndex = 0;
          if (this._UpdateQuizSelection) {
            this._UpdateQuizSelection();
          }
          
          // Lire la question à voix haute (mode enfant)
          setTimeout(() => {
            readQuestionAloud(this._currentQuiz);
          }, 500);
          
          console.log(`📝 Question chargée: ${this._currentQuiz.question}`);
        };
        
        // ÉTAPE 3: Masquer l'option CODE du menu
        hideCodeOption();
        
        // ÉTAPE 4: Forcer une nouvelle question pour enfants
        if (combatInstance._currentQuiz) {
          combatInstance._LoadRandomQuiz();
        }
        
        console.log('✅ Correction appliquée avec succès');
      }
    }, 100);
    
    // Arrêter après 10 secondes si non trouvé
    setTimeout(() => {
      clearInterval(checkCombatSystem);
    }, 10000);
  };
  
  // Fonction pour masquer l'option CODE
  const hideCodeOption = () => {
    console.log('🚫 Masquage de l\'option CODE');
    
    // Masquer par data-action
    const codeOption = document.querySelector('.menu-option[data-action="code"]');
    if (codeOption) {
      codeOption.style.display = 'none';
      console.log('✅ Option CODE masquée par data-action');
    }
    
    // Masquer par contenu textuel
    const menuOptions = document.querySelectorAll('.menu-option');
    menuOptions.forEach(option => {
      const text = option.textContent || option.innerText || '';
      if (text.includes('CODE') || text.includes('code')) {
        option.style.display = 'none';
        console.log('✅ Option CODE masquée par texte');
      }
    });
  };
  
  // Fonction pour lire la question à voix haute
  const readQuestionAloud = (question) => {
    if (!question) return;
    
    console.log('🔊 Lecture de la question à voix haute');
    
    // Utiliser l'API Web Speech directement
    if ('speechSynthesis' in window) {
      // Arrêter toute lecture en cours
      window.speechSynthesis.cancel();
      
      // Préparer le texte pour enfants
      let textToRead = `Voici ta question : ${question.question}`;
      
      // Ajouter les options
      if (question.options && Array.isArray(question.options)) {
        textToRead += `. Les réponses possibles sont : `;
        question.options.forEach((option, index) => {
          const letter = String.fromCharCode(65 + index);
          textToRead += `${letter}: ${option}. `;
        });
      }
      
      // Créer et configurer l'utterance
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 0.8;  // Plus lent pour les enfants
      utterance.pitch = 1.2; // Voix plus aiguë
      utterance.volume = 0.9; // Volume élevé
      utterance.lang = 'fr-FR';
      
      // Événements
      utterance.onstart = () => console.log('🎤 Démarrage de la lecture');
      utterance.onend = () => console.log('✅ Fin de la lecture');
      utterance.onerror = (e) => console.error('❌ Erreur audio:', e);
      
      // Démarrer la lecture
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('⚠️ Synthèse vocale non supportée');
    }
  };
  
  // Observer pour détecter les changements dans l'interface de combat
  const observeCombatChanges = () => {
    // Observer les changements dans le DOM pour masquer l'option CODE
    const observer = new MutationObserver(() => {
      hideCodeOption();
    });
    
    // Observer le body pour les changements
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  };
  
  return {
    applyFix,
    hideCodeOption,
    childrenQuestions,
    observeCombatChanges
  };
})();

// Auto-application de la correction
document.addEventListener('DOMContentLoaded', () => {
  combat_system_simple_fix.applyFix();
  combat_system_simple_fix.observeCombatChanges();
});

export default combat_system_simple_fix;