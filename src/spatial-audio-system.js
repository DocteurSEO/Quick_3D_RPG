// Système d'audio spatial utilisant la Web Audio API
// Supporte l'audio 3D et les effets spatiaux

import { entity } from './entity.js';

export const spatial_audio_system = (() => {

  class SpatialAudioSystem extends entity.Component {
    constructor(params) {
      super();
      this._params = params || {};
      this._audioContext = null;
      this._listener = null;
      this._audioSources = new Map();
      this._enabled = true;
      this._masterGain = null;
      this._loadedAudioBuffers = new Map();
      
      // Configuration par défaut pour l'audio spatial
      this._defaultConfig = {
        panningModel: 'HRTF', // ou 'equalpower'
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 10000,
        rolloffFactor: 1,
        coneInnerAngle: 360,
        coneOuterAngle: 360,
        coneOuterGain: 0
      };
      
      this._Init();
    }

    _Init() {
      try {
        // Créer le contexte audio
        this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Configurer le listener (position de l'auditeur)
        this._listener = this._audioContext.listener;
        this._SetupListener();
        
        // Créer le gain principal
        this._masterGain = this._audioContext.createGain();
        this._masterGain.connect(this._audioContext.destination);
        this._masterGain.gain.setValueAtTime(0.8, this._audioContext.currentTime);
        
        console.log('🔊 Système d\'audio spatial initialisé');
        
        // Précharger les sons importants
        this._PreloadAudio();
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de l\'audio spatial:', error);
        this._enabled = false;
      }
    }

    _SetupListener() {
      if (!this._listener) return;
      
      // Position par défaut du listener (centre de la scène)
      this._listener.positionX.setValueAtTime(0, this._audioContext.currentTime);
      this._listener.positionY.setValueAtTime(0, this._audioContext.currentTime);
      this._listener.positionZ.setValueAtTime(0, this._audioContext.currentTime);
      
      // Orientation par défaut (regardant vers l'avant)
      this._listener.forwardX.setValueAtTime(0, this._audioContext.currentTime);
      this._listener.forwardY.setValueAtTime(0, this._audioContext.currentTime);
      this._listener.forwardZ.setValueAtTime(-1, this._audioContext.currentTime);
      
      // Orientation "vers le haut"
      this._listener.upX.setValueAtTime(0, this._audioContext.currentTime);
      this._listener.upY.setValueAtTime(1, this._audioContext.currentTime);
      this._listener.upZ.setValueAtTime(0, this._audioContext.currentTime);
    }

    async _PreloadAudio() {
      const audioFiles = [
        { name: 'victory', path: '/resources/audios/victoire/01.mp3' }
      ];
      
      for (const audio of audioFiles) {
        try {
          await this._LoadAudioFile(audio.name, audio.path);
        } catch (error) {
          console.warn(`⚠️ Impossible de charger ${audio.name}:`, error);
        }
      }
    }

    async _LoadAudioFile(name, path) {
      if (!this._enabled || this._loadedAudioBuffers.has(name)) return;
      
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this._audioContext.decodeAudioData(arrayBuffer);
        
        this._loadedAudioBuffers.set(name, audioBuffer);
        console.log(`✅ Audio chargé: ${name}`);
        
      } catch (error) {
        console.error(`❌ Erreur lors du chargement de ${name}:`, error);
        throw error;
      }
    }

    // Mettre à jour la position du listener (joueur)
    UpdateListenerPosition(x, y, z) {
      if (!this._enabled || !this._listener) return;
      
      const currentTime = this._audioContext.currentTime;
      this._listener.positionX.setValueAtTime(x, currentTime);
      this._listener.positionY.setValueAtTime(y, currentTime);
      this._listener.positionZ.setValueAtTime(z, currentTime);
    }

    // Mettre à jour l'orientation du listener
    UpdateListenerOrientation(forwardX, forwardY, forwardZ, upX = 0, upY = 1, upZ = 0) {
      if (!this._enabled || !this._listener) return;
      
      const currentTime = this._audioContext.currentTime;
      this._listener.forwardX.setValueAtTime(forwardX, currentTime);
      this._listener.forwardY.setValueAtTime(forwardY, currentTime);
      this._listener.forwardZ.setValueAtTime(forwardZ, currentTime);
      this._listener.upX.setValueAtTime(upX, currentTime);
      this._listener.upY.setValueAtTime(upY, currentTime);
      this._listener.upZ.setValueAtTime(upZ, currentTime);
    }

    // Jouer un son spatial à une position donnée
    PlaySpatialSound(audioName, x = 0, y = 0, z = 0, config = {}) {
      if (!this._enabled || !this._loadedAudioBuffers.has(audioName)) {
        console.warn(`⚠️ Audio non disponible: ${audioName}`);
        return null;
      }
      
      try {
        const audioBuffer = this._loadedAudioBuffers.get(audioName);
        const source = this._audioContext.createBufferSource();
        const panner = this._audioContext.createPanner();
        const gainNode = this._audioContext.createGain();
        
        // Configuration du source
        source.buffer = audioBuffer;
        
        // Configuration du panner (audio spatial)
        const finalConfig = { ...this._defaultConfig, ...config };
        panner.panningModel = finalConfig.panningModel;
        panner.distanceModel = finalConfig.distanceModel;
        panner.refDistance = finalConfig.refDistance;
        panner.maxDistance = finalConfig.maxDistance;
        panner.rolloffFactor = finalConfig.rolloffFactor;
        panner.coneInnerAngle = finalConfig.coneInnerAngle;
        panner.coneOuterAngle = finalConfig.coneOuterAngle;
        panner.coneOuterGain = finalConfig.coneOuterGain;
        
        // Position du son
        const currentTime = this._audioContext.currentTime;
        panner.positionX.setValueAtTime(x, currentTime);
        panner.positionY.setValueAtTime(y, currentTime);
        panner.positionZ.setValueAtTime(z, currentTime);
        
        // Volume
        gainNode.gain.setValueAtTime(config.volume || 1.0, currentTime);
        
        // Connexions
        source.connect(panner);
        panner.connect(gainNode);
        gainNode.connect(this._masterGain);
        
        // Démarrer la lecture
        source.start(currentTime);
        
        // Nettoyer après la lecture
        source.onended = () => {
          source.disconnect();
          panner.disconnect();
          gainNode.disconnect();
        };
        
        // Retourner les contrôles pour manipulation ultérieure
        return {
          source,
          panner,
          gainNode,
          stop: () => source.stop(),
          updatePosition: (newX, newY, newZ) => {
            const time = this._audioContext.currentTime;
            panner.positionX.setValueAtTime(newX, time);
            panner.positionY.setValueAtTime(newY, time);
            panner.positionZ.setValueAtTime(newZ, time);
          },
          updateVolume: (volume) => {
            gainNode.gain.setValueAtTime(volume, this._audioContext.currentTime);
          }
        };
        
      } catch (error) {
        console.error(`❌ Erreur lors de la lecture de ${audioName}:`, error);
        return null;
      }
    }

    // Jouer le son de victoire avec effet spatial
    PlayVictorySound(x = 0, y = 2, z = 0) {
      return this.PlaySpatialSound('victory', x, y, z, {
        volume: 0.8,
        refDistance: 2,
        rolloffFactor: 0.5 // Son moins atténué par la distance
      });
    }

    // Jouer un son simple (non spatial)
    PlaySimpleSound(audioName, volume = 1.0) {
      if (!this._enabled || !this._loadedAudioBuffers.has(audioName)) {
        console.warn(`⚠️ Audio non disponible: ${audioName}`);
        return null;
      }
      
      try {
        const audioBuffer = this._loadedAudioBuffers.get(audioName);
        const source = this._audioContext.createBufferSource();
        const gainNode = this._audioContext.createGain();
        
        source.buffer = audioBuffer;
        gainNode.gain.setValueAtTime(volume, this._audioContext.currentTime);
        
        source.connect(gainNode);
        gainNode.connect(this._masterGain);
        
        source.start();
        
        source.onended = () => {
          source.disconnect();
          gainNode.disconnect();
        };
        
        return {
          source,
          gainNode,
          stop: () => source.stop(),
          updateVolume: (newVolume) => {
            gainNode.gain.setValueAtTime(newVolume, this._audioContext.currentTime);
          }
        };
        
      } catch (error) {
        console.error(`❌ Erreur lors de la lecture de ${audioName}:`, error);
        return null;
      }
    }

    // Charger un nouveau fichier audio
    async LoadAudio(name, path) {
      return await this._LoadAudioFile(name, path);
    }

    // Activer/désactiver l'audio
    SetEnabled(enabled) {
      this._enabled = enabled;
      if (this._masterGain) {
        this._masterGain.gain.setValueAtTime(
          enabled ? 0.8 : 0, 
          this._audioContext.currentTime
        );
      }
    }

    // Régler le volume principal
    SetMasterVolume(volume) {
      if (this._masterGain) {
        this._masterGain.gain.setValueAtTime(
          Math.max(0, Math.min(1, volume)), 
          this._audioContext.currentTime
        );
      }
    }

    // Nettoyer les ressources
    Cleanup() {
      if (this._audioContext) {
        this._audioContext.close();
      }
      this._audioSources.clear();
      this._loadedAudioBuffers.clear();
    }
  }

  return {
    SpatialAudioSystem
  };
})();