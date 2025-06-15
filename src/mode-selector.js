// Composant pour sélectionner et gérer les modes de jeu
// Interface utilisateur pour choisir entre mode enfant et adulte

import { entity } from './entity.js';
import { advanced_question_manager } from './advanced-question-manager.js';

export const mode_selector = (() => {
  
  class ModeSelector extends entity.Component {
    constructor(params) {
      super();
      this._params = params || {};
      this._isVisible = false;
      this._selectedMode = 'children'; // Mode par défaut
      this._uiContainer = null;
      
      this._Init();
    }
    
    _Init() {
      this._CreateUI();
      this._AttachEventListeners();
      
      // Appliquer le mode par défaut
      this._ApplyMode(this._selectedMode);
    }
    
    _CreateUI() {
      // Créer le conteneur principal
      this._uiContainer = document.createElement('div');
      this._uiContainer.id = 'mode-selector';
      this._uiContainer.className = 'mode-selector-container';
      this._uiContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      
      // Créer le panneau de sélection
      const panel = document.createElement('div');
      panel.className = 'mode-selector-panel';
      panel.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
        max-width: 600px;
        width: 90%;
        color: white;
      `;
      
      // Titre
      const title = document.createElement('h1');
      title.textContent = '🎮 Choisissez votre mode de jeu';
      title.style.cssText = `
        margin: 0 0 30px 0;
        font-size: 2.5em;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      `;
      
      // Description
      const description = document.createElement('p');
      description.textContent = 'Sélectionnez le mode adapté à votre niveau et vos préférences';
      description.style.cssText = `
        margin: 0 0 40px 0;
        font-size: 1.2em;
        opacity: 0.9;
      `;
      
      // Conteneur des modes
      const modesContainer = document.createElement('div');
      modesContainer.style.cssText = `
        display: flex;
        gap: 30px;
        justify-content: center;
        flex-wrap: wrap;
      `;
      
      // Mode Enfant
      const childrenMode = this._CreateModeCard({
        mode: 'children',
        icon: '🧒',
        title: 'Mode Enfant',
        description: 'Questions adaptées aux 6-12 ans<br>Mathématiques, culture générale, nature',
        features: ['✨ Questions simples', '🎯 Pas de code', '⏰ Temps adapté', '🏆 Badges motivants']
      });
      
      // Mode Adulte
      const adultMode = this._CreateModeCard({
        mode: 'adults',
        icon: '👨‍💻',
        title: 'Mode Adulte',
        description: 'Défis techniques et programmation<br>Algorithmes, code, questions avancées',
        features: ['💻 Questions de code', '🔧 Défis techniques', '⚡ 10 min max', '🚀 Expertise']
      });
      
      modesContainer.appendChild(childrenMode);
      modesContainer.appendChild(adultMode);
      
      // Bouton de fermeture
      const closeButton = document.createElement('button');
      closeButton.textContent = '✕';
      closeButton.style.cssText = `
        position: absolute;
        top: 15px;
        right: 20px;
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.3s;
      `;
      closeButton.addEventListener('mouseover', () => closeButton.style.opacity = '1');
      closeButton.addEventListener('mouseout', () => closeButton.style.opacity = '0.7');
      closeButton.addEventListener('click', () => this.hide());
      
      // Assemblage
      panel.appendChild(closeButton);
      panel.appendChild(title);
      panel.appendChild(description);
      panel.appendChild(modesContainer);
      
      this._uiContainer.appendChild(panel);
      document.body.appendChild(this._uiContainer);
    }
    
    _CreateModeCard(config) {
      const card = document.createElement('div');
      card.className = `mode-card mode-${config.mode}`;
      card.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 15px;
        padding: 30px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 250px;
        backdrop-filter: blur(10px);
      `;
      
      // Effet hover
      card.addEventListener('mouseover', () => {
        card.style.transform = 'translateY(-5px)';
        card.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        card.style.background = 'rgba(255, 255, 255, 0.15)';
      });
      
      card.addEventListener('mouseout', () => {
        card.style.transform = 'translateY(0)';
        card.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        card.style.background = 'rgba(255, 255, 255, 0.1)';
      });
      
      // Icône
      const icon = document.createElement('div');
      icon.textContent = config.icon;
      icon.style.cssText = `
        font-size: 4em;
        margin-bottom: 15px;
      `;
      
      // Titre
      const title = document.createElement('h2');
      title.textContent = config.title;
      title.style.cssText = `
        margin: 0 0 15px 0;
        font-size: 1.5em;
      `;
      
      // Description
      const description = document.createElement('p');
      description.innerHTML = config.description;
      description.style.cssText = `
        margin: 0 0 20px 0;
        font-size: 1em;
        opacity: 0.9;
        line-height: 1.4;
      `;
      
      // Caractéristiques
      const features = document.createElement('ul');
      features.style.cssText = `
        list-style: none;
        padding: 0;
        margin: 0;
        font-size: 0.9em;
      `;
      
      config.features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        li.style.cssText = `
          margin: 8px 0;
          opacity: 0.8;
        `;
        features.appendChild(li);
      });
      
      // Gestionnaire de clic
      card.addEventListener('click', () => {
        this._SelectMode(config.mode);
      });
      
      // Assemblage
      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(description);
      card.appendChild(features);
      
      return card;
    }
    
    _SelectMode(mode) {
      this._selectedMode = mode;
      this._ApplyMode(mode);
      this.hide();
      
      // Notification du changement de mode
      this.Broadcast({
        topic: 'mode.changed',
        mode: mode,
        config: advanced_question_manager.manager.getModeConfig()
      });
    }
    
    _ApplyMode(mode) {
      const success = advanced_question_manager.setMode(mode);
      if (success) {
        console.log(`Mode changé vers: ${mode}`);
        
        // Mettre à jour l'interface si nécessaire
        this._UpdateModeIndicator(mode);
      } else {
        console.error(`Impossible de changer vers le mode: ${mode}`);
      }
    }
    
    _UpdateModeIndicator(mode) {
      // Chercher ou créer l'indicateur de mode
      let indicator = document.getElementById('current-mode-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'current-mode-indicator';
        indicator.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 15px;
          border-radius: 20px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          z-index: 1000;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        //document.body.appendChild(indicator);
      }
      
      const modeConfig = advanced_question_manager.manager.getModeConfig();
      indicator.innerHTML = `${modeConfig.icon} ${modeConfig.name}`;
    }
    
    _AttachEventListeners() {
      // Fermer avec Escape
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this._isVisible) {
          this.hide();
        }
      });
      
      // Fermer en cliquant à l'extérieur
      this._uiContainer.addEventListener('click', (event) => {
        if (event.target === this._uiContainer) {
          this.hide();
        }
      });
    }
    
    // === API PUBLIQUE ===
    show() {
      this._isVisible = true;
      this._uiContainer.style.display = 'flex';
      
      // Animation d'entrée
      requestAnimationFrame(() => {
        this._uiContainer.style.opacity = '0';
        this._uiContainer.style.transform = 'scale(0.9)';
        this._uiContainer.style.transition = 'all 0.3s ease';
        
        requestAnimationFrame(() => {
          this._uiContainer.style.opacity = '1';
          this._uiContainer.style.transform = 'scale(1)';
        });
      });
    }
    
    hide() {
      this._isVisible = false;
      
      // Animation de sortie
      this._uiContainer.style.opacity = '0';
      this._uiContainer.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        this._uiContainer.style.display = 'none';
      }, 300);
    }
    
    toggle() {
      if (this._isVisible) {
        this.hide();
      } else {
        this.show();
      }
    }
    
    getCurrentMode() {
      return this._selectedMode;
    }
    
    // === MÉTHODES DU COMPOSANT ===
    InitComponent() {
      // Déjà initialisé dans le constructeur
    }
    
    Update(timeElapsed) {
      // Pas de mise à jour nécessaire pour ce composant
    }
    
    Destroy() {
      if (this._uiContainer) {
        document.body.removeChild(this._uiContainer);
      }
    }
  }
  
  return {
    ModeSelector: ModeSelector
  };
})();

// Export par défaut
export default mode_selector;