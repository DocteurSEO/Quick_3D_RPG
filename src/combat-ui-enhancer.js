// Améliorateur d'interface de combat selon le mode
// Adapte l'UI de combat pour masquer le code en mode enfant et intégrer l'audio

import { entity } from './entity.js';
import { ui_mode_adapter } from './ui-mode-adapter.js';
import { audio_question_reader } from './audio-question-reader.js';

export const combat_ui_enhancer = (() => {
  
  class CombatUIEnhancer extends entity.Component {
    constructor(params) {
      super();
      this._params = params || {};
      this._currentMode = 'children';
      this._originalCombatUI = null;
      this._enhancedUI = null;
      this._audioReader = null;
      this._modeAdapter = null;
      this._combatContainer = null;
      
      this._Init();
    }
    
    _Init() {
      // Créer les composants de support
      this._modeAdapter = new ui_mode_adapter.UIModeAdapter();
      this._audioReader = new audio_question_reader.AudioQuestionReader();
      
      // Écouter les événements de combat
      this._parent.RegisterHandler('combat.started', (m) => this._OnCombatStarted(m));
      this._parent.RegisterHandler('combat.question_shown', (m) => this._OnQuestionShown(m));
      this._parent.RegisterHandler('combat.ended', (m) => this._OnCombatEnded(m));
      this._parent.RegisterHandler('mode.changed', (m) => this._OnModeChanged(m));
      
      this._EnhanceCombatUI();
    }
    
    _OnModeChanged(message) {
      this._currentMode = message.mode;
      this._AdaptCombatUIForMode();
    }
    
    _OnCombatStarted(message) {
      console.log('Combat démarré, adaptation de l\'UI pour le mode:', this._currentMode);
      this._AdaptCombatUIForMode();
      this._ShowModeSpecificElements();
    }
    
    _OnQuestionShown(message) {
      if (message.question) {
        // Masquer les éléments de code si nécessaire
        if (this._currentMode === 'children') {
          this._HideCodeElementsInQuestion(message.question);
        }
        
        // Déclencher la lecture audio
        this._audioReader.readQuestion(message.question);
        
        // Broadcaster pour que l'audio reader puisse réagir
        this._parent.Broadcast({
          topic: 'question.displayed',
          question: message.question
        });
      }
    }
    
    _OnCombatEnded(message) {
      this._audioReader.stop();
      this._RestoreOriginalUI();
    }
    
    _EnhanceCombatUI() {
      // Attendre que l'UI de combat soit prête
      this._waitForCombatUI().then(() => {
        this._SetupEnhancedCombatInterface();
      });
    }
    
    _waitForCombatUI() {
      return new Promise((resolve) => {
        const checkUI = () => {
          this._combatContainer = document.querySelector('.combat-ui') || 
                                  document.querySelector('#combat-interface') ||
                                  document.querySelector('.combat-container');
          
          if (this._combatContainer) {
            resolve();
          } else {
            setTimeout(checkUI, 100);
          }
        };
        checkUI();
      });
    }
    
    _SetupEnhancedCombatInterface() {
      if (!this._combatContainer) return;
      
      // Sauvegarder l'UI originale
      this._originalCombatUI = this._combatContainer.cloneNode(true);
      
      // Ajouter des classes pour l'adaptation
      this._combatContainer.classList.add('enhanced-combat-ui');
      
      // Injecter les styles d'amélioration
      this._InjectEnhancementStyles();
      
      // Adapter pour le mode actuel
      this._AdaptCombatUIForMode();
    }
    
    _AdaptCombatUIForMode() {
      if (!this._combatContainer) return;
      
      // Nettoyer les classes précédentes
      this._combatContainer.classList.remove('combat-mode-children', 'combat-mode-adults');
      
      if (this._currentMode === 'children') {
        this._AdaptForChildrenMode();
      } else {
        this._AdaptForAdultMode();
      }
    }
    
    _AdaptForChildrenMode() {
      this._combatContainer.classList.add('combat-mode-children');
      
      // Masquer tous les éléments de code existants
      this._HideAllCodeElements();
      
      // Adapter l'interface pour les enfants
      this._ApplyChildrenCombatStyles();
      
      // Ajouter des éléments amicaux pour les enfants
      this._AddChildrenFriendlyElements();
    }
    
    _AdaptForAdultMode() {
      this._combatContainer.classList.add('combat-mode-adults');
      
      // Afficher les éléments de code
      this._ShowAllCodeElements();
      
      // Appliquer le style adulte
      this._ApplyAdultCombatStyles();
    }
    
    _HideAllCodeElements() {
      const codeSelectors = [
        '.code-input',
        '.code-editor',
        '.syntax-highlight',
        '.code-timer',
        '.programming-hint',
        '.code-submission',
        '[data-code-question]',
        '.algorithm-display'
      ];
      
      codeSelectors.forEach(selector => {
        const elements = this._combatContainer.querySelectorAll(selector);
        elements.forEach(element => {
          element.style.display = 'none';
          element.setAttribute('data-hidden-children-mode', 'true');
        });
      });
    }
    
    _ShowAllCodeElements() {
      const hiddenElements = this._combatContainer.querySelectorAll('[data-hidden-children-mode="true"]');
      hiddenElements.forEach(element => {
        element.style.display = '';
        element.removeAttribute('data-hidden-children-mode');
      });
    }
    
    _HideCodeElementsInQuestion(question) {
      if (question.type === 'code') {
        // Cette question ne devrait pas apparaître en mode enfant,
        // mais au cas où, la masquer complètement
        const questionContainer = document.querySelector('.current-question');
        if (questionContainer) {
          questionContainer.style.display = 'none';
          console.warn('Question de code affichée en mode enfant - masquée');
        }
      }
    }
    
    _ApplyChildrenCombatStyles() {
      const style = document.createElement('style');
      style.id = 'children-combat-styles';
      
      style.textContent = `
        .combat-mode-children {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
          border-radius: 25px;
          padding: 25px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        }
        
        .combat-mode-children .question-container {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 30px;
          margin: 20px 0;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border: 3px solid rgba(255, 255, 255, 0.8);
        }
        
        .combat-mode-children .question-text {
          font-size: 1.4em;
          color: #2c3e50;
          font-weight: 600;
          line-height: 1.6;
          text-align: center;
          margin-bottom: 25px;
        }
        
        .combat-mode-children .options-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          max-width: 600px;
          margin: 0 auto;
        }
        
        .combat-mode-children .option-button {
          background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 15px;
          color: white;
          font-size: 1.2em;
          font-weight: 600;
          padding: 20px 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
          text-align: center;
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .combat-mode-children .option-button:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 12px 30px rgba(0,0,0,0.3);
          background: linear-gradient(45deg, #5a6fd8 0%, #6b5b95 100%);
        }
        
        .combat-mode-children .timer-display {
          font-size: 2.5em;
          color: #e74c3c;
          font-weight: bold;
          text-shadow: 3px 3px 6px rgba(0,0,0,0.2);
          text-align: center;
          margin: 20px 0;
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .combat-mode-children .health-bar {
          background: linear-gradient(90deg, #ff6b6b, #ee5a24);
          border-radius: 15px;
          height: 25px;
          box-shadow: inset 0 3px 6px rgba(0,0,0,0.2);
          border: 2px solid rgba(255,255,255,0.8);
        }
        
        .combat-mode-children .score-display {
          background: rgba(255,255,255,0.9);
          color: #2c3e50;
          font-weight: bold;
          font-size: 1.3em;
          padding: 15px 25px;
          border-radius: 20px;
          text-align: center;
          margin: 15px 0;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        /* Animations pour les enfants */
        .combat-mode-children .correct-answer {
          animation: celebrate 0.8s ease-in-out;
        }
        
        .combat-mode-children .wrong-answer {
          animation: wiggle 0.5s ease-in-out;
        }
        
        @keyframes celebrate {
          0% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(2deg); }
          50% { transform: scale(1.2) rotate(-2deg); }
          75% { transform: scale(1.1) rotate(1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        
        @keyframes wiggle {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
      `;
      
      document.head.appendChild(style);
    }
    
    _ApplyAdultCombatStyles() {
      // Retirer les styles enfants s'ils existent
      const childrenStyles = document.getElementById('children-combat-styles');
      if (childrenStyles) {
        childrenStyles.remove();
      }
      
      // Appliquer les styles adultes (plus sobres)
      const adultStyles = document.createElement('style');
      adultStyles.id = 'adult-combat-styles';
      
      adultStyles.textContent = `
        .combat-mode-adults {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          border-radius: 10px;
          padding: 20px;
        }
        
        .combat-mode-adults .question-container {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 20px;
          backdrop-filter: blur(10px);
        }
        
        .combat-mode-adults .question-text {
          color: #ecf0f1;
          font-size: 1.1em;
          line-height: 1.5;
        }
        
        .combat-mode-adults .code-editor {
          background: #1e1e1e;
          border: 1px solid #444;
          border-radius: 5px;
          color: #d4d4d4;
          font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
        }
      `;
      
      document.head.appendChild(adultStyles);
    }
    
    _AddChildrenFriendlyElements() {
      // Ajouter des éléments encourageants pour les enfants
      const encouragementPanel = document.createElement('div');
      encouragementPanel.className = 'children-encouragement';
      encouragementPanel.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.9);
        padding: 15px;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        font-weight: bold;
        color: #2c3e50;
      `;
      
      encouragementPanel.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 5px;">🌟</div>
        <div style="font-size: 14px;">Tu peux le faire !</div>
      `;
      
      if (this._combatContainer) {
        this._combatContainer.style.position = 'relative';
        this._combatContainer.appendChild(encouragementPanel);
      }
    }
    
    _ShowModeSpecificElements() {
      // Afficher des éléments spécifiques selon le mode
      if (this._currentMode === 'children') {
        this._ShowAudioIndicator();
      }
    }
    
    _ShowAudioIndicator() {
      // Indicateur que la question sera lue
      const audioIndicator = document.createElement('div');
      audioIndicator.className = 'audio-reading-indicator';
      audioIndicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(52, 152, 219, 0.9);
        color: white;
        padding: 20px 30px;
        border-radius: 25px;
        font-size: 18px;
        font-weight: bold;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        animation: fadeInOut 3s ease-in-out;
      `;
      
      audioIndicator.innerHTML = `
        <div style="font-size: 24px; animation: pulse 1s infinite;">🔊</div>
        <div>Écoute bien la question !</div>
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(audioIndicator);
      
      setTimeout(() => {
        if (audioIndicator.parentNode) {
          audioIndicator.parentNode.removeChild(audioIndicator);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 3000);
    }
    
    _InjectEnhancementStyles() {
      const enhancementStyles = document.createElement('style');
      enhancementStyles.id = 'combat-ui-enhancements';
      
      enhancementStyles.textContent = `
        .enhanced-combat-ui {
          transition: all 0.3s ease;
        }
        
        .enhanced-combat-ui .question-transition {
          animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      
      document.head.appendChild(enhancementStyles);
    }
    
    _RestoreOriginalUI() {
      // Nettoyer les améliorations
      const stylesToRemove = ['children-combat-styles', 'adult-combat-styles', 'combat-ui-enhancements'];
      stylesToRemove.forEach(id => {
        const style = document.getElementById(id);
        if (style) style.remove();
      });
      
      // Retirer les classes ajoutées
      if (this._combatContainer) {
        this._combatContainer.classList.remove('enhanced-combat-ui', 'combat-mode-children', 'combat-mode-adults');
      }
    }
    
    // === MÉTHODES DU COMPOSANT ===
    InitComponent() {
      // Déjà initialisé
    }
    
    Update(timeElapsed) {
      // Mise à jour des composants enfants
      if (this._modeAdapter) {
        this._modeAdapter.Update(timeElapsed);
      }
      if (this._audioReader) {
        this._audioReader.Update(timeElapsed);
      }
    }
    
    Destroy() {
      this._RestoreOriginalUI();
      
      if (this._modeAdapter) {
        this._modeAdapter.Destroy();
      }
      if (this._audioReader) {
        this._audioReader.Destroy();
      }
    }
  }
  
  return {
    CombatUIEnhancer: CombatUIEnhancer
  };
})();

export default combat_ui_enhancer;