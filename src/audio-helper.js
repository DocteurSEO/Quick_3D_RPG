// Helper audio simple pour lire les questions sans dépendances complexes
// Utilise directement la Web Speech API

export const audio_helper = (() => {
  
  let speechSynthesis = null;
  let currentUtterance = null;
  let isEnabled = true;
  let currentMode = 'children';
  
  // Initialiser la synthèse vocale
  const init = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis = window.speechSynthesis;
      console.log('🔊 Audio helper initialisé');
      return true;
    } else {
      console.warn('⚠️ Synthèse vocale non supportée');
      isEnabled = false;
      return false;
    }
  };
  
  // Lire une question à voix haute
  const readQuestion = (question, mode = 'children') => {
    if (!isEnabled || !speechSynthesis || !question) {
      console.log('🔇 Audio désactivé ou non disponible');
      return;
    }
    
    console.log('🔊 Lecture de la question:', question.question);
    
    // Arrêter toute lecture en cours
    speechSynthesis.cancel();
    
    // Préparer le texte
    let textToRead = question.question;
    
    if (mode === 'children') {
      textToRead = `Voici ta question : ${question.question}`;
      
      // Ajouter les options pour les enfants
      if (question.options && Array.isArray(question.options)) {
        textToRead += `. Les réponses possibles sont : `;
        question.options.forEach((option, index) => {
          const letter = String.fromCharCode(65 + index); // A, B, C, D
          textToRead += `${letter}: ${option}. `;
        });
      }
    }
    
    // Créer l'utterance
    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    
    // Paramètres selon le mode
    if (mode === 'children') {
      currentUtterance.rate = 0.8;  // Plus lent pour les enfants
      currentUtterance.pitch = 1.2; // Voix plus aiguë
      currentUtterance.volume = 0.9; // Volume élevé
    } else {
      currentUtterance.rate = 1.0;
      currentUtterance.pitch = 1.0;
      currentUtterance.volume = 0.8;
    }
    
    currentUtterance.lang = 'fr-FR';
    
    // Événements
    currentUtterance.onstart = () => {
      console.log('🎤 Démarrage de la lecture');
    };
    
    currentUtterance.onend = () => {
      console.log('✅ Fin de la lecture');
    };
    
    currentUtterance.onerror = (event) => {
      console.error('❌ Erreur audio:', event);
    };
    
    // Démarrer la lecture
    speechSynthesis.speak(currentUtterance);
  };
  
  // Arrêter la lecture
  const stop = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      console.log('⏹️ Lecture arrêtée');
    }
  };
  
  // Activer/désactiver l'audio
  const setEnabled = (enabled) => {
    isEnabled = enabled;
    if (!enabled) {
      stop();
    }
    console.log(`🔊 Audio ${enabled ? 'activé' : 'désactivé'}`);
  };
  
  // Changer le mode
  const setMode = (mode) => {
    currentMode = mode;
    console.log(`🎯 Mode audio changé vers: ${mode}`);
  };
  
  // Vérifier si l'audio est en cours
  const isReading = () => {
    return speechSynthesis && speechSynthesis.speaking;
  };
  
  return {
    init,
    readQuestion,
    stop,
    setEnabled,
    setMode,
    isReading
  };
})();

// Auto-initialisation
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    audio_helper.init();
  });
}

export default audio_helper;