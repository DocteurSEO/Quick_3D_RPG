// Lecteur audio pour les questions avec synthèse vocale
// Lit automatiquement les questions à voix haute, adapté aux enfants

import { entity } from './entity.js';
import { advanced_question_manager } from './advanced-question-manager.js';

export const audio_question_reader = (() => {
  
  class AudioQuestionReader extends entity.Component {
    constructor(params) {
      super();
      this._params = params || {};
      this._isEnabled = true;
      this._currentMode = 'children';
      this._speechSynthesis = null;
      this._currentUtterance = null;
      this._isReading = false;
      this._audioSettings = {
        children: {
          rate: 0.8,        // Vitesse lente pour les enfants
          pitch: 1.2,       // Voix plus aiguë
          volume: 0.9,      // Volume élevé
          lang: 'fr-FR',    // Français
          voicePreference: ['Google français', 'Microsoft Hortense', 'Amelie', 'Thomas']
        },
        adults: {
          rate: 1.0,        // Vitesse normale
          pitch: 1.0,       // Voix normale
          volume: 0.8,      // Volume modéré
          lang: 'fr-FR',
          voicePreference: ['Google français', 'Microsoft Paul', 'Thomas', 'Amelie']
        }
      };
      this._selectedVoice = null;
      this._uiControls = null;
      
      this._Init();
    }
    
    _Init() {
      // Vérifier la disponibilité de la synthèse vocale
      if ('speechSynthesis' in window) {
        this._speechSynthesis = window.speechSynthesis;
        this._LoadVoices();
        
        // Écouter les changements de voix
        this._speechSynthesis.addEventListener('voiceschanged', () => {
          this._LoadVoices();
        });
      } else {
        console.warn('Synthèse vocale non supportée par ce navigateur');
        this._isEnabled = false;
      }
      
      // Écouter les changements de mode
      this._parent.RegisterHandler('mode.changed', (m) => this._OnModeChanged(m));
      this._parent.RegisterHandler('question.displayed', (m) => this._OnQuestionDisplayed(m));
      
      this._CreateAudioControls();
    }
    
    _LoadVoices() {
      if (!this._speechSynthesis) return;
      
      const voices = this._speechSynthesis.getVoices();
      const currentSettings = this._audioSettings[this._currentMode];
      
      // Chercher la meilleure voix française
      let bestVoice = null;
      for (const preferredVoice of currentSettings.voicePreference) {
        bestVoice = voices.find(voice => 
          voice.name.includes(preferredVoice) && voice.lang.startsWith('fr')
        );
        if (bestVoice) break;
      }
      
      // Si aucune voix préférée, prendre la première voix française
      if (!bestVoice) {
        bestVoice = voices.find(voice => voice.lang.startsWith('fr'));
      }
      
      // En dernier recours, prendre la voix par défaut
      if (!bestVoice && voices.length > 0) {
        bestVoice = voices[0];
      }
      
      this._selectedVoice = bestVoice;
      console.log('Voix sélectionnée:', bestVoice ? bestVoice.name : 'Aucune');
    }
    
    _OnModeChanged(message) {
      if (message.mode) {
        this._currentMode = message.mode;
        this._LoadVoices(); // Recharger la voix pour le nouveau mode
        this._UpdateAudioControlsForMode();
      }
    }
    
    _OnQuestionDisplayed(message) {
      if (message.question && this._isEnabled) {
        // Délai pour laisser l'UI se mettre en place
        setTimeout(() => {
          this._ReadQuestion(message.question);
        }, 500);
      }
    }
    
    _ReadQuestion(question) {
      if (!this._speechSynthesis || !question) return;
      
      // Arrêter la lecture précédente
      this._StopReading();
      
      // Préparer le texte à lire
      let textToRead = this._PrepareTextForReading(question);
      
      // Créer l'utterance
      this._currentUtterance = new SpeechSynthesisUtterance(textToRead);
      this._ApplyVoiceSettings(this._currentUtterance);
      
      // Événements
      this._currentUtterance.onstart = () => {
        this._isReading = true;
        this._UpdateControlsState();
      };
      
      this._currentUtterance.onend = () => {
        this._isReading = false;
        this._UpdateControlsState();
      };
      
      this._currentUtterance.onerror = (event) => {
        console.error('Erreur de synthèse vocale:', event);
        this._isReading = false;
        this._UpdateControlsState();
      };
      
      // Démarrer la lecture
      this._speechSynthesis.speak(this._currentUtterance);
    }
    
    _PrepareTextForReading(question) {
      let text = question.question;
      
      // Nettoyer le texte pour la lecture
      text = text.replace(/[&<>"']/g, ' '); // Supprimer les caractères HTML
      text = text.replace(/\s+/g, ' ').trim(); // Normaliser les espaces
      
      // Pour les enfants, ajouter une introduction plus amicale
      if (this._currentMode === 'children') {
        text = `Voici ta question : ${text}`;
        
        // Lire aussi les options pour les enfants
        if (question.options && Array.isArray(question.options)) {
          text += `. Les réponses possibles sont : `;
          question.options.forEach((option, index) => {
            text += `${String.fromCharCode(65 + index)}: ${option}. `;
          });
        }
      }
      
      // Pour les adultes, lecture plus directe
      if (this._currentMode === 'adults' && question.type === 'code') {
        text = `Question de programmation : ${text}`;
      }
      
      return text;
    }
    
    _ApplyVoiceSettings(utterance) {
      const settings = this._audioSettings[this._currentMode];
      
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;
      utterance.lang = settings.lang;
      
      if (this._selectedVoice) {
        utterance.voice = this._selectedVoice;
      }
    }
    
    _CreateAudioControls() {
      // Créer le panneau de contrôles audio
      this._uiControls = document.createElement('div');
      this._uiControls.id = 'audio-controls';
      this._uiControls.className = 'audio-controls-panel';
      this._uiControls.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 15px;
        padding: 15px;
        display: flex;
        gap: 10px;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-family: Arial, sans-serif;
        color: white;
      `;
      
      // Bouton lecture/pause
      const playPauseBtn = document.createElement('button');
      playPauseBtn.id = 'audio-play-pause';
      playPauseBtn.innerHTML = '🔊';
      playPauseBtn.title = 'Lire/Pause';
      playPauseBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 5px;
        border-radius: 5px;
        transition: background 0.3s;
      `;
      playPauseBtn.addEventListener('click', () => this._ToggleReading());
      playPauseBtn.addEventListener('mouseover', () => playPauseBtn.style.background = 'rgba(255,255,255,0.2)');
      playPauseBtn.addEventListener('mouseout', () => playPauseBtn.style.background = 'none');
      
      // Bouton stop
      const stopBtn = document.createElement('button');
      stopBtn.id = 'audio-stop';
      stopBtn.innerHTML = '⏹️';
      stopBtn.title = 'Arrêter';
      stopBtn.style.cssText = playPauseBtn.style.cssText;
      stopBtn.addEventListener('click', () => this._StopReading());
      stopBtn.addEventListener('mouseover', () => stopBtn.style.background = 'rgba(255,255,255,0.2)');
      stopBtn.addEventListener('mouseout', () => stopBtn.style.background = 'none');
      
      // Contrôle de vitesse
      const speedLabel = document.createElement('span');
      speedLabel.textContent = 'Vitesse:';
      speedLabel.style.fontSize = '12px';
      
      const speedSlider = document.createElement('input');
      speedSlider.type = 'range';
      speedSlider.id = 'audio-speed';
      speedSlider.min = '0.5';
      speedSlider.max = '2';
      speedSlider.step = '0.1';
      speedSlider.value = this._audioSettings[this._currentMode].rate;
      speedSlider.style.cssText = `
        width: 80px;
        height: 20px;
      `;
      speedSlider.addEventListener('input', (e) => this._ChangeSpeed(parseFloat(e.target.value)));
      
      // Bouton on/off
      const toggleBtn = document.createElement('button');
      toggleBtn.id = 'audio-toggle';
      toggleBtn.innerHTML = this._isEnabled ? '🔊' : '🔇';
      toggleBtn.title = 'Activer/Désactiver l\'audio';
      toggleBtn.style.cssText = playPauseBtn.style.cssText;
      toggleBtn.addEventListener('click', () => this._ToggleAudio());
      
      // Assemblage
      this._uiControls.appendChild(playPauseBtn);
      this._uiControls.appendChild(stopBtn);
      this._uiControls.appendChild(speedLabel);
      this._uiControls.appendChild(speedSlider);
      this._uiControls.appendChild(toggleBtn);
      
      document.body.appendChild(this._uiControls);
      
      this._UpdateAudioControlsForMode();
    }
    
    _UpdateAudioControlsForMode() {
      if (!this._uiControls) return;
      
      const speedSlider = document.getElementById('audio-speed');
      if (speedSlider) {
        speedSlider.value = this._audioSettings[this._currentMode].rate;
      }
      
      // Adapter l'apparence pour le mode enfant
      if (this._currentMode === 'children') {
        this._uiControls.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        this._uiControls.style.borderRadius = '20px';
        this._uiControls.style.padding = '20px';
      } else {
        this._uiControls.style.background = 'rgba(0, 0, 0, 0.8)';
        this._uiControls.style.borderRadius = '15px';
        this._uiControls.style.padding = '15px';
      }
    }
    
    _UpdateControlsState() {
      const playPauseBtn = document.getElementById('audio-play-pause');
      if (playPauseBtn) {
        playPauseBtn.innerHTML = this._isReading ? '⏸️' : '🔊';
        playPauseBtn.title = this._isReading ? 'Pause' : 'Lire la question';
      }
    }
    
    // === CONTRÔLES AUDIO ===
    _ToggleReading() {
      if (!this._speechSynthesis) return;
      
      if (this._isReading) {
        this._speechSynthesis.pause();
      } else if (this._speechSynthesis.paused) {
        this._speechSynthesis.resume();
      } else {
        // Relire la dernière question
        this._parent.Broadcast({
          topic: 'audio.request_repeat'
        });
      }
    }
    
    _StopReading() {
      if (this._speechSynthesis) {
        this._speechSynthesis.cancel();
        this._isReading = false;
        this._UpdateControlsState();
      }
    }
    
    _ChangeSpeed(newRate) {
      this._audioSettings[this._currentMode].rate = newRate;
      
      // Si une lecture est en cours, l'arrêter et la relancer avec la nouvelle vitesse
      if (this._isReading) {
        this._StopReading();
        setTimeout(() => {
          this._parent.Broadcast({
            topic: 'audio.request_repeat'
          });
        }, 100);
      }
    }
    
    _ToggleAudio() {
      this._isEnabled = !this._isEnabled;
      
      const toggleBtn = document.getElementById('audio-toggle');
      if (toggleBtn) {
        toggleBtn.innerHTML = this._isEnabled ? '🔊' : '🔇';
      }
      
      if (!this._isEnabled) {
        this._StopReading();
      }
      
      // Masquer/afficher les autres contrôles
      const controls = ['audio-play-pause', 'audio-stop', 'audio-speed'];
      controls.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.style.opacity = this._isEnabled ? '1' : '0.3';
          element.disabled = !this._isEnabled;
        }
      });
    }
    
    // === API PUBLIQUE ===
    readText(text) {
      if (!this._isEnabled || !this._speechSynthesis) return;
      
      this._StopReading();
      
      const utterance = new SpeechSynthesisUtterance(text);
      this._ApplyVoiceSettings(utterance);
      this._speechSynthesis.speak(utterance);
    }
    
    readQuestion(question) {
      this._ReadQuestion(question);
    }
    
    stop() {
      this._StopReading();
    }
    
    setEnabled(enabled) {
      this._isEnabled = enabled;
      this._ToggleAudio();
    }
    
    isReading() {
      return this._isReading;
    }
    
    // === MÉTHODES DU COMPOSANT ===
    InitComponent() {
      // Déjà initialisé
    }
    
    Update(timeElapsed) {
      // Vérifier si la synthèse vocale est toujours active
      if (this._speechSynthesis && this._isReading && !this._speechSynthesis.speaking) {
        this._isReading = false;
        this._UpdateControlsState();
      }
    }
    
    Destroy() {
      this._StopReading();
      if (this._uiControls) {
        document.body.removeChild(this._uiControls);
      }
    }
  }
  
  return {
    AudioQuestionReader: AudioQuestionReader
  };
})();

export default audio_question_reader;