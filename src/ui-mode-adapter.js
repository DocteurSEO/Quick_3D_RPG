// Adaptateur d'interface utilisateur selon le mode (enfant/adulte)
// Masque les éléments de code en mode enfant et adapte l'UI

import { entity } from './entity.js';
import { advanced_question_manager } from './advanced-question-manager.js';

export const ui_mode_adapter = (() => {
  
  class UIModeAdapter extends entity.Component {
    constructor(params) {
      super();
      this._params = params || {};
      this._currentMode = 'children';
      this._hiddenElements = new Set();
      this._originalStyles = new Map();
      this._codeRelatedSelectors = [
        '.code-editor',
        '.code-input',
        '.code-hint',
        '.code-timer',
        '.syntax-highlight',
        '.code-validation',
        '[data-code-related]',
        '.programming-section',
        '.algorithm-display'
      ];
      
      this._Init();
    }
    
    _Init() {
      // Écouter les changements de mode
      this._parent.RegisterHandler('mode.changed', (m) => this._OnModeChanged(m));
      
      // Appliquer le mode initial
      this._ApplyModeToUI(this._currentMode);
    }
    
    _OnModeChanged(message) {
      if (message.mode) {
        this._currentMode = message.mode;
        this._ApplyModeToUI(message.mode);
      }
    }
    
    _ApplyModeToUI(mode) {
      if (mode === 'children') {
        this._HideCodeElements();
        this._ApplyChildrenModeStyles();
      } else {
        this._ShowCodeElements();
        this._ApplyAdultModeStyles();
      }
      
      this._UpdateUIClasses(mode);
    }
    
    _HideCodeElements() {
      this._codeRelatedSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (!this._hiddenElements.has(element)) {
            // Sauvegarder le style original
            this._originalStyles.set(element, {
              display: element.style.display || getComputedStyle(element).display,
              visibility: element.style.visibility || getComputedStyle(element).visibility
            });
            
            // Masquer l'élément
            element.style.display = 'none';
            element.setAttribute('data-hidden-by-mode', 'true');
            this._hiddenElements.add(element);
          }
        });
      });
      
      // Masquer spécifiquement les sections de code dans le combat
      this._HideCombatCodeSections();
    }
    
    _ShowCodeElements() {
      this._hiddenElements.forEach(element => {
        const originalStyle = this._originalStyles.get(element);
        if (originalStyle) {
          element.style.display = originalStyle.display === 'none' ? '' : originalStyle.display;
          element.style.visibility = originalStyle.visibility;
        }
        element.removeAttribute('data-hidden-by-mode');
      });
      
      this._hiddenElements.clear();
      this._originalStyles.clear();
      
      // Afficher les sections de code dans le combat
      this._ShowCombatCodeSections();
    }
    
    _HideCombatCodeSections() {
      // Masquer les éléments spécifiques au combat avec code
      const combatCodeElements = [
        '#code-input-area',
        '#code-editor-container',
        '#syntax-highlighter',
        '#code-hints-panel',
        '.code-question-type',
        '.programming-challenge'
      ];
      
      combatCodeElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          this._originalStyles.set(element, {
            display: element.style.display || getComputedStyle(element).display
          });
          element.style.display = 'none';
          element.setAttribute('data-hidden-by-mode', 'true');
          this._hiddenElements.add(element);
        }
      });
      
      // Injecter du CSS pour masquer dynamiquement les éléments de code
      this._InjectChildrenModeCSS();
    }
    
    _ShowCombatCodeSections() {
      // Retirer le CSS spécifique au mode enfant
      this._RemoveChildrenModeCSS();
    }
    
    _InjectChildrenModeCSS() {
      let styleElement = document.getElementById('children-mode-styles');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'children-mode-styles';
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = `
        /* Mode Enfant - Masquer tous les éléments de code */
        body.mode-children .code-related,
        body.mode-children [data-code="true"],
        body.mode-children .programming-ui,
        body.mode-children .code-timer-advanced,
        body.mode-children .syntax-error,
        body.mode-children .code-validation-panel {
          display: none !important;
        }
        
        /* Adapter l'interface pour les enfants */
        body.mode-children .question-container {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        body.mode-children .question-text {
          font-size: 1.3em;
          color: #2c3e50;
          font-weight: 600;
          line-height: 1.5;
          text-align: center;
        }
        
        body.mode-children .option-button {
          background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 15px;
          color: white;
          font-size: 1.1em;
          padding: 15px 20px;
          margin: 10px 5px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        body.mode-children .option-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        
        body.mode-children .timer-display {
          font-size: 2em;
          color: #e74c3c;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
      `;
    }
    
    _RemoveChildrenModeCSS() {
      const styleElement = document.getElementById('children-mode-styles');
      if (styleElement) {
        styleElement.remove();
      }
    }
    
    _ApplyChildrenModeStyles() {
      document.body.classList.remove('mode-adults');
      document.body.classList.add('mode-children');
      
      // Adapter les couleurs et la présentation pour les enfants
      this._UpdateChildrenTheme();
    }
    
    _ApplyAdultModeStyles() {
      document.body.classList.remove('mode-children');
      document.body.classList.add('mode-adults');
      
      // Restaurer le thème adulte
      this._UpdateAdultTheme();
    }
    
    _UpdateChildrenTheme() {
      // Injecter un thème coloré et amical pour les enfants
      let themeStyle = document.getElementById('children-theme');
      if (!themeStyle) {
        themeStyle = document.createElement('style');
        themeStyle.id = 'children-theme';
        document.head.appendChild(themeStyle);
      }
      
      themeStyle.textContent = `
        body.mode-children {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        body.mode-children .ui-panel {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        body.mode-children .health-bar {
          background: linear-gradient(90deg, #ff6b6b, #ee5a24);
          border-radius: 10px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        
        body.mode-children .score-display {
          color: #2c3e50;
          font-weight: bold;
          font-size: 1.2em;
        }
        
        /* Animations amicales pour les enfants */
        body.mode-children .correct-answer {
          animation: celebrate 0.6s ease-in-out;
        }
        
        @keyframes celebrate {
          0% { transform: scale(1); }
          50% { transform: scale(1.1) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `;
    }
    
    _UpdateAdultTheme() {
      const themeStyle = document.getElementById('children-theme');
      if (themeStyle) {
        themeStyle.remove();
      }
    }
    
    _UpdateUIClasses(mode) {
      // Mettre à jour les classes CSS pour refléter le mode
      const mainContainers = document.querySelectorAll('.game-container, .combat-ui, .main-interface');
      mainContainers.forEach(container => {
        container.classList.remove('ui-mode-children', 'ui-mode-adults');
        container.classList.add(`ui-mode-${mode}`);
      });
    }
    
    // === MÉTHODES PUBLIQUES ===
    getCurrentMode() {
      return this._currentMode;
    }
    
    hideElementsForChildren(additionalSelectors = []) {
      const allSelectors = [...this._codeRelatedSelectors, ...additionalSelectors];
      allSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.style.display = 'none';
          element.setAttribute('data-hidden-by-mode', 'true');
          this._hiddenElements.add(element);
        });
      });
    }
    
    showElementsForAdults() {
      this._ShowCodeElements();
    }
    
    isChildrenMode() {
      return this._currentMode === 'children';
    }
    
    isAdultMode() {
      return this._currentMode === 'adults';
    }
    
    // === MÉTHODES DU COMPOSANT ===
    InitComponent() {
      // Déjà initialisé
    }
    
    Update(timeElapsed) {
      // Vérifier s'il y a de nouveaux éléments à masquer/afficher
      if (this._currentMode === 'children') {
        this._CheckForNewCodeElements();
      }
    }
    
    _CheckForNewCodeElements() {
      // Masquer automatiquement les nouveaux éléments de code qui apparaissent
      this._codeRelatedSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (!this._hiddenElements.has(element) && !element.hasAttribute('data-hidden-by-mode')) {
            element.style.display = 'none';
            element.setAttribute('data-hidden-by-mode', 'true');
            this._hiddenElements.add(element);
          }
        });
      });
    }
    
    Destroy() {
      this._ShowCodeElements();
      this._RemoveChildrenModeCSS();
      this._UpdateAdultTheme();
      
      document.body.classList.remove('mode-children', 'mode-adults');
    }
  }
  
  return {
    UIModeAdapter: UIModeAdapter
  };
})();

export default ui_mode_adapter;