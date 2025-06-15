import {entity} from '../entity.js';

export const audio_system = (() => {

  class AudioSystem {
    constructor(params) {
      this._params = params;
      this._enabled = true;
      this._speechSynthesis = window.speechSynthesis;
    }

    init() {
      console.log('🔊 AudioSystem initialized');
    }

    _PlayUISound(type) {
      if (!this._enabled) return;
      
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        const frequencies = {
          'select': 800,
          'confirm': 1200,
          'error': 400,
          'correct': 1000,
          'incorrect': 300,
          'levelup': 1500,
          'upgrade': 1100
        };
        
        oscillator.frequency.setValueAtTime(frequencies[type] || 600, context.currentTime);
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.1, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.1);
      } catch (error) {
        console.warn('Audio playback failed:', error);
      }
    }

    _PlayCombatStartSound() {
      if (!this._enabled) return;
      
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.setValueAtTime(440, context.currentTime);
        oscillator.frequency.setValueAtTime(660, context.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(880, context.currentTime + 0.4);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.6);
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.6);
      } catch (error) {
        console.warn('Combat start sound failed:', error);
      }
    }

    _PlayCameraChangeSound() {
      if (!this._enabled) return;
      
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.setValueAtTime(500, context.currentTime);
        oscillator.frequency.setValueAtTime(750, context.currentTime + 0.1);
        oscillator.type = 'triangle';
        
        gainNode.gain.setValueAtTime(0.05, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.2);
      } catch (error) {
        console.warn('Camera change sound failed:', error);
      }
    }

    _PlayDamageSound() {
      if (!this._enabled) return;
      
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.setValueAtTime(200, context.currentTime);
        oscillator.frequency.setValueAtTime(100, context.currentTime + 0.1);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.15, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(context.currentTime + 0.3);
      } catch (error) {
        console.warn('Damage sound failed:', error);
      }
    }

    _PlayVictorySound() {
      if (!this._enabled) return;
      
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        
        // Melody notes for victory
        const notes = [523, 659, 784, 1047]; // C, E, G, C
        const duration = 0.2;
        
        notes.forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          
          const startTime = context.currentTime + (index * duration);
          
          oscillator.frequency.setValueAtTime(frequency, startTime);
          oscillator.type = 'square';
          
          gainNode.gain.setValueAtTime(0.1, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        });
      } catch (error) {
        console.warn('Victory sound failed:', error);
      }
    }

    _PlayDefeatSound() {
      if (!this._enabled) return;
      
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        
        // Descending notes for defeat
        const notes = [330, 294, 262, 220]; // E, D, C, A
        const duration = 0.3;
        
        notes.forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          
          const startTime = context.currentTime + (index * duration);
          
          oscillator.frequency.setValueAtTime(frequency, startTime);
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.1, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        });
      } catch (error) {
        console.warn('Defeat sound failed:', error);
      }
    }

    _PlayHealSound() {
      if (!this._enabled) return;
      
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        
        // Ascending healing melody
        const notes = [440, 554, 659, 880]; // A, C#, E, A
        const duration = 0.15;
        
        notes.forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          
          const startTime = context.currentTime + (index * duration);
          
          oscillator.frequency.setValueAtTime(frequency, startTime);
          oscillator.type = 'triangle';
          
          gainNode.gain.setValueAtTime(0.08, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 1.5);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration * 1.5);
        });
      } catch (error) {
        console.warn('Heal sound failed:', error);
      }
    }

    _PlayDynamicSound(baseFreq = 440, duration = 0.2, type = 'sine') {
      if (!this._enabled) return;
      
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.setValueAtTime(baseFreq, context.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
      } catch (error) {
        console.warn('Dynamic sound failed:', error);
      }
    }

    _PlayUpgradeSound() {
      if (!this._enabled) return;
      
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        
        // Power-up sound sequence
        const notes = [440, 523, 659, 784, 1047]; // A, C, E, G, C
        const duration = 0.1;
        
        notes.forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gainNode = context.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(context.destination);
          
          const startTime = context.currentTime + (index * duration);
          
          oscillator.frequency.setValueAtTime(frequency, startTime);
          oscillator.type = 'square';
          
          gainNode.gain.setValueAtTime(0.12, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 2);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration * 2);
        });
      } catch (error) {
        console.warn('Upgrade sound failed:', error);
      }
    }

    _speakQuestion(text) {
      if (!this._speechSynthesis || !text) return;
      
      try {
        this._speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.7;
        
        this._speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn('Speech synthesis failed:', error);
      }
    }

    _speakQuestionForChildren(quiz) {
      if (!this._speechSynthesis || !quiz) return;
      
      try {
        this._speechSynthesis.cancel();
        
        let textToRead = `Voici ta question : ${quiz.question}. `;
        textToRead += 'Les réponses possibles sont : ';
        
        quiz.options.forEach((option, index) => {
          const letter = String.fromCharCode(65 + index);
          textToRead += `${letter}: ${option}. `;
        });
        
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.rate = 0.7;
        utterance.pitch = 1.3;
        utterance.volume = 0.8;
        
        this._speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn('Children speech synthesis failed:', error);
      }
    }

    _showAudioAlert(message) {
      console.log('🔊 Audio Alert:', message);
      
      // Visual feedback for audio events
      const alert = document.createElement('div');
      alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        animation: fadeInOut 2s ease-in-out;
      `;
      alert.textContent = `🔊 ${message}`;
      
      if (!document.querySelector('#audioAlertStyles')) {
        const style = document.createElement('style');
        style.id = 'audioAlertStyles';
        style.textContent = `
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(100%); }
            20% { opacity: 1; transform: translateX(0); }
            80% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(100%); }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(alert);
      setTimeout(() => alert.remove(), 2000);
    }

    // Control methods
    enable() {
      this._enabled = true;
    }

    disable() {
      this._enabled = false;
      if (this._speechSynthesis) {
        this._speechSynthesis.cancel();
      }
    }

    isEnabled() {
      return this._enabled;
    }
  }

  return {
    AudioSystem: AudioSystem,
  };

})();