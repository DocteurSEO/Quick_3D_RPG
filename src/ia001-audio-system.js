// Système d'audio pour IA001
// Gère les sons de marche, combat et mort

import { entity } from './entity.js';
import { spatial_audio_system } from './spatial-audio-system.js';

export const ia001_audio_system = (() => {

  class IA001AudioSystem extends entity.Component {
    constructor(params) {
      super();
      this._params = params || {};
      this._spatialAudio = null;
      this._audioConfig = null;
      this._currentWalkSound = null;
      this._currentFightSound = null;
      this._isWalking = false;
      this._isFighting = false;
      this._isDying = false;
      this._lastHealth = 150; // IA001 health par défaut
      this._walkSoundInterval = null;
      
      // Ajouter des raccourcis clavier pour tester les sons
      this._SetupTestControls();
      
      this._Init();
    }

    async _Init() {
      try {
        // Créer le système d'audio spatial
        this._spatialAudio = new spatial_audio_system.SpatialAudioSystem();
        
        // Attendre une interaction utilisateur pour débloquer l'audio
        await this._WaitForUserInteraction();
        
        // Attendre que le contexte audio soit prêt
        if (this._spatialAudio._audioContext && this._spatialAudio._audioContext.state === 'suspended') {
          await this._spatialAudio._audioContext.resume();
          console.log('🔊 Contexte audio repris');
        }
        
        // Charger la configuration audio
        await this._LoadAudioConfig();
        
        console.log('🔊 Système audio IA001 initialisé avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du système audio IA001:', error);
      }
    }

    async _WaitForUserInteraction() {
      return new Promise((resolve) => {
        const handleInteraction = () => {
          console.log('👆 Interaction utilisateur détectée - Audio débloqué');
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('keydown', handleInteraction);
          resolve();
        };
        
        // Si l'audio est déjà autorisé, pas besoin d'attendre
        if (this._spatialAudio._audioContext && this._spatialAudio._audioContext.state !== 'suspended') {
          resolve();
          return;
        }
        
        console.log('🔇 En attente d\'une interaction utilisateur pour débloquer l\'audio...');
        document.addEventListener('click', handleInteraction);
        document.addEventListener('keydown', handleInteraction);
      });
    }

    async _LoadAudioConfig() {
      try {
        const response = await fetch('./resources/ia001/audios/audio.json');
        this._audioConfig = await response.json();
        
        // Précharger tous les sons IA001
        if (this._spatialAudio) {
          await this._PreloadSounds();
        }
        
        console.log('✅ Configuration audio IA001 chargée:', this._audioConfig);
      } catch (error) {
        console.error('❌ Erreur lors du chargement de la config audio IA001:', error);
      }
    }

    async _PreloadSounds() {
      if (!this._audioConfig || !this._spatialAudio) return;
      
      try {
        // Charger le son de marche
        if (this._audioConfig.walk) {
          await this._spatialAudio.LoadAudio('ia001_walk', './resources/ia001/audios/walk.mp3');
        }
        
        // Charger le son de combat
        if (this._audioConfig.fight) {
          await this._spatialAudio.LoadAudio('ia001_fight', './resources/ia001/audios/fight.mp3');
        }
        
        // Charger le son de mort
        if (this._audioConfig.die) {
          await this._spatialAudio.LoadAudio('ia001_die', './resources/ia001/audios/die.mp3');
        }
        
        console.log('✅ Tous les sons IA001 préchargés');
      } catch (error) {
        console.error('❌ Erreur lors du préchargement des sons IA001:', error);
      }
    }

    // Démarrer le son de marche
    StartWalkSound() {
      if (!this._spatialAudio || this._isWalking || this._isDying) {
        return;
      }
      
      this._isWalking = true;
      this._PlayWalkSoundLoop();
    }

    // Arrêter le son de marche
    StopWalkSound() {
      this._isWalking = false;
      if (this._walkSoundInterval) {
        clearInterval(this._walkSoundInterval);
        this._walkSoundInterval = null;
      }
      if (this._currentWalkSound) {
        this._currentWalkSound.stop();
        this._currentWalkSound = null;
      }
    }

    // Jouer le son de marche en boucle
    _PlayWalkSoundLoop() {
      const position = this._GetEntityPosition();
      
      if (position) {
        this._spatialAudio.PlaySpatialSound(
          'ia001_walk', 
          position.x, 
          position.y, 
          position.z,
          { 
            volume: 1.0,
            loop: true
          }
        );
      }
    }

     _SetupTestControls() {
       document.addEventListener('keydown', (event) => {
         if (!this._spatialAudio || !this._audioConfig) return;
         
         switch(event.key) {
           case 'F': // Tester le son de combat
           case 'f':
             console.log('🎮 Test manuel: Son de combat');
             if (!this._isFighting) {
               this.StartFightSound();
             } else {
               this.StopFightSound();
             }
             break;
             
           case 'D': // Tester le son de mort
           case 'd':
             console.log('🎮 Test manuel: Son de mort');
             this.PlayDeathSound();
             break;
             
           case 'W': // Tester le son de marche
           case 'w':
             console.log('🎮 Test manuel: Son de marche');
             if (!this._isWalking) {
               this.StartWalkSound();
             } else {
               this.StopWalkSound();
             }
             break;
             
           case 'S': // Arrêter tous les sons
           case 's':
             console.log('🎮 Test manuel: Arrêt de tous les sons');
             this._StopAllSounds();
             break;
         }
       });
       
       console.log('🎮 Contrôles de test audio IA001 activés:');
       console.log('  F = Combat on/off');
       console.log('  D = Son de mort');
       console.log('  W = Marche on/off');
       console.log('  S = Arrêter tous les sons');
    }

    // Démarrer le son de combat
    StartFightSound() {
      if (!this._spatialAudio || this._isFighting || this._isDying) {
        return;
      }
      
      this._isFighting = true;
      
      const position = this._GetEntityPosition();
      
      if (position) {
        this._currentFightSound = this._spatialAudio.PlaySpatialSound(
          'ia001_fight', 
          position.x, 
          position.y, 
          position.z,
          { 
            volume: 1.0,
            loop: true
          }
        );
      }
    }

    // Arrêter le son de combat
    StopFightSound() {
      this._isFighting = false;
      if (this._currentFightSound) {
        this._currentFightSound.stop();
        this._currentFightSound = null;
        console.log('🔇 Son de combat IA001 arrêté');
      }
    }

    // Jouer le son de mort
    PlayDeathSound() {
      console.log('💀 PlayDeathSound appelé:', {
        spatialAudio: !!this._spatialAudio,
        isDying: this._isDying
      });
      
      if (!this._spatialAudio || this._isDying) {
        console.log('🚫 PlayDeathSound bloqué');
        return;
      }
      
      this._isDying = true;
      this._StopAllSounds(); // Arrêter tous les autres sons
      
      const position = this._GetEntityPosition();
      console.log('📍 Position IA001 pour mort:', position);
      
      if (position) {
        console.log('🔊 Tentative de lecture du son de mort');
        const deathSound = this._spatialAudio.PlaySpatialSound(
          'ia001_die', 
          position.x, 
          position.y, 
          position.z,
          { 
            volume: 1.0,
            loop: false
          }
        );
        console.log('💀 Son de mort IA001 joué:', !!deathSound);
      } else {
        console.log('❌ Impossible de jouer le son de mort - pas de position');
      }
    }

    // Vérifier la santé et jouer le son de mort si nécessaire
    CheckHealthForDeathSound(currentHealth) {
      // Jouer le son de mort quand la santé passe sous 20 points
      if (currentHealth < 20 && this._lastHealth >= 20 && !this._isDying) {
        console.log('⚠️ IA001 santé critique, son de mort déclenché');
        this.PlayDeathSound();
      }
      this._lastHealth = currentHealth;
    }

    // Arrêter tous les sons
    _StopAllSounds() {
      this.StopWalkSound();
      this.StopFightSound();
    }

    // Obtenir la position de l'entité
    _GetEntityPosition() {
      const npcController = this._parent.GetComponent('NPCController');
      if (npcController && npcController._target) {
        return npcController._target.position;
      }
      return null;
    }

    // Mettre à jour l'état audio selon l'activité
    UpdateAudioState(isWalking, isFighting, currentHealth) {
      if (!this._spatialAudio || !this._audioConfig) {
        return;
      }

      // SONS DÉSACTIVÉS - Tous les sons de l'IA001 sont maintenant silencieux
      // Son de marche désactivé
      // if (!this._isWalking) {
      //   this.StartWalkSound();
      // }

      // Son de combat désactivé
      // if (isFighting && !this._isFighting) {
      //   this.StartFightSound();
      // } else if (!isFighting && this._isFighting) {
      //   this.StopFightSound();
      // }

      // Son de mort désactivé
      // if (currentHealth < 20 && !this._isDying && this._lastHealth >= 20) {
      //   this.PlayDeathSound();
      //   this._isDying = true;
      // }

      // Arrêter tous les sons existants
      this._StopAllSounds();

      this._isFighting = isFighting;
      this._lastHealth = currentHealth;
    }

    // Nettoyage
    Destroy() {
      this._StopAllSounds();
      super.Destroy();
    }
  }

  return {
    IA001AudioSystem: IA001AudioSystem,
  };

})();