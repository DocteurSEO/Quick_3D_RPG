// Démonstration du système d'audio spatial
// Ce fichier peut être utilisé pour tester l'audio spatial indépendamment

import { spatial_audio_system } from './spatial-audio-system.js';

export const spatial_audio_demo = (() => {

  class SpatialAudioDemo {
    constructor() {
      this._spatialAudio = null;
      this._isPlaying = false;
      this._currentSound = null;
      this._animationId = null;
      this._angle = 0;
    }

    async init() {
      try {
        this._spatialAudio = new spatial_audio_system.SpatialAudioSystem();
        console.log('🎵 Démo audio spatial initialisée');
        this._createDemoUI();
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de la démo:', error);
      }
    }

    _createDemoUI() {
      // Créer l'interface de démonstration
      const demoContainer = document.createElement('div');
      demoContainer.id = 'spatial-audio-demo';
      demoContainer.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        z-index: 10000;
        min-width: 300px;
      `;

      demoContainer.innerHTML = `
        <h3>🎵 Démo Audio Spatial</h3>
        <p>Utilisez des écouteurs pour une meilleure expérience</p>
        
        <div style="margin: 10px 0;">
          <button id="play-victory" style="margin: 5px; padding: 10px; background: #4ade80; border: none; border-radius: 5px; color: white; cursor: pointer;">
            🏆 Jouer Victoire
          </button>
          <button id="play-circular" style="margin: 5px; padding: 10px; background: #3b82f6; border: none; border-radius: 5px; color: white; cursor: pointer;">
            🔄 Son Circulaire
          </button>
          <button id="stop-all" style="margin: 5px; padding: 10px; background: #ef4444; border: none; border-radius: 5px; color: white; cursor: pointer;">
            ⏹️ Arrêter
          </button>
        </div>
        
        <div style="margin: 10px 0;">
          <label>Volume Principal:</label>
          <input type="range" id="master-volume" min="0" max="100" value="80" style="width: 100%; margin: 5px 0;">
        </div>
        
        <div style="margin: 10px 0;">
          <label>Position X:</label>
          <input type="range" id="pos-x" min="-10" max="10" value="0" style="width: 100%; margin: 5px 0;">
          <label>Position Z:</label>
          <input type="range" id="pos-z" min="-10" max="10" value="0" style="width: 100%; margin: 5px 0;">
        </div>
        
        <div style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
          <p>• Le son de victoire utilise le fichier MP3</p>
          <p>• Le son circulaire fait tourner un son autour de vous</p>
          <p>• Ajustez la position pour tester l'effet spatial</p>
        </div>
        
        <button id="close-demo" style="position: absolute; top: 5px; right: 10px; background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
      `;

      document.body.appendChild(demoContainer);

      // Ajouter les événements
      this._setupDemoEvents(demoContainer);
    }

    _setupDemoEvents(container) {
      // Bouton jouer victoire
      container.querySelector('#play-victory').addEventListener('click', () => {
        this._playVictorySound();
      });

      // Bouton son circulaire
      container.querySelector('#play-circular').addEventListener('click', () => {
        this._toggleCircularSound();
      });

      // Bouton arrêter
      container.querySelector('#stop-all').addEventListener('click', () => {
        this._stopAllSounds();
      });

      // Volume principal
      container.querySelector('#master-volume').addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        this._spatialAudio.SetMasterVolume(volume);
      });

      // Position X
      container.querySelector('#pos-x').addEventListener('input', (e) => {
        this._updateSoundPosition();
      });

      // Position Z
      container.querySelector('#pos-z').addEventListener('input', (e) => {
        this._updateSoundPosition();
      });

      // Fermer la démo
      container.querySelector('#close-demo').addEventListener('click', () => {
        this._closeDemoUI();
      });
    }

    _playVictorySound() {
      const x = document.querySelector('#pos-x').value;
      const z = document.querySelector('#pos-z').value;
      
      console.log(`🏆 Jouer son de victoire à position (${x}, 2, ${z})`);
      this._spatialAudio.PlayVictorySound(parseFloat(x), 2, parseFloat(z));
    }

    _toggleCircularSound() {
      if (this._isPlaying) {
        this._stopCircularSound();
      } else {
        this._startCircularSound();
      }
    }

    _startCircularSound() {
      // Créer un son synthétique qui tourne autour du joueur
      this._isPlaying = true;
      this._angle = 0;
      
      const button = document.querySelector('#play-circular');
      button.textContent = '⏸️ Arrêter Circulaire';
      button.style.background = '#f59e0b';
      
      this._animateCircularSound();
    }

    _animateCircularSound() {
      if (!this._isPlaying) return;
      
      // Calculer la position circulaire
      const radius = 5;
      const x = Math.cos(this._angle) * radius;
      const z = Math.sin(this._angle) * radius;
      
      // Jouer un son court à cette position
      this._playToneAt(x, 2, z, 440, 0.1); // Note La (440 Hz) pendant 0.1 seconde
      
      // Incrémenter l'angle
      this._angle += 0.2;
      if (this._angle > Math.PI * 2) {
        this._angle = 0;
      }
      
      // Programmer la prochaine note
      this._animationId = setTimeout(() => {
        this._animateCircularSound();
      }, 150);
    }

    _playToneAt(x, y, z, frequency, duration) {
      // Créer un son synthétique à une position donnée
      if (!this._spatialAudio._audioContext) return;
      
      try {
        const context = this._spatialAudio._audioContext;
        const oscillator = context.createOscillator();
        const panner = context.createPanner();
        const gainNode = context.createGain();
        
        // Configuration du panner
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        
        // Position
        panner.positionX.setValueAtTime(x, context.currentTime);
        panner.positionY.setValueAtTime(y, context.currentTime);
        panner.positionZ.setValueAtTime(z, context.currentTime);
        
        // Configuration de l'oscillateur
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        oscillator.type = 'sine';
        
        // Volume avec fade
        gainNode.gain.setValueAtTime(0, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, context.currentTime + duration);
        
        // Connexions
        oscillator.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(this._spatialAudio._masterGain);
        
        // Jouer
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + duration);
        
        // Nettoyer
        oscillator.onended = () => {
          oscillator.disconnect();
          panner.disconnect();
          gainNode.disconnect();
        };
        
      } catch (error) {
        console.warn('Erreur lors de la création du son:', error);
      }
    }

    _stopCircularSound() {
      this._isPlaying = false;
      
      if (this._animationId) {
        clearTimeout(this._animationId);
        this._animationId = null;
      }
      
      const button = document.querySelector('#play-circular');
      if (button) {
        button.textContent = '🔄 Son Circulaire';
        button.style.background = '#3b82f6';
      }
    }

    _updateSoundPosition() {
      // Cette méthode pourrait être utilisée pour mettre à jour la position d'un son en cours
      // Pour l'instant, elle ne fait rien car les sons sont courts
    }

    _stopAllSounds() {
      this._stopCircularSound();
      
      // Arrêter tous les sons en cours
      if (this._spatialAudio._audioContext) {
        // Note: Il n'y a pas de méthode directe pour arrêter tous les sons,
        // mais les sons de victoire sont généralement courts
      }
    }

    _closeDemoUI() {
      this._stopAllSounds();
      
      const demoContainer = document.getElementById('spatial-audio-demo');
      if (demoContainer) {
        demoContainer.remove();
      }
    }

    // Méthode publique pour démarrer la démo
    static async StartDemo() {
      const demo = new SpatialAudioDemo();
      await demo.init();
      return demo;
    }
  }

  return {
    SpatialAudioDemo
  };
})();

// Fonction globale pour démarrer facilement la démo depuis la console
window.startSpatialAudioDemo = () => {
  spatial_audio_demo.SpatialAudioDemo.StartDemo();
};

console.log('🎵 Démo audio spatial chargée. Tapez startSpatialAudioDemo() dans la console pour commencer.');