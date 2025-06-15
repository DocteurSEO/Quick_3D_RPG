// Remplace dynamiquement quiz-database par quiz-database-children
// S'exécute avant que combat-system.js soit chargé

export const quiz_database_replacer = (() => {
  
  const replaceQuizDatabase = () => {
    console.log('🔧 Remplacement de quiz-database par quiz-database-children');
    
    // Stratégie 1: Intercepter les imports via module loader
    if (window.System) {
      // SystemJS interception
      const originalResolve = window.System.resolve;
      window.System.resolve = function(id, parent) {
        if (id === './quiz-database.js' || id.endsWith('/quiz-database.js')) {
          console.log('🔄 Redirection: quiz-database.js -> quiz-database-children.js');
          return originalResolve.call(this, './quiz-database-children.js', parent);
        }
        return originalResolve.call(this, id, parent);
      };
    }
    
    // Stratégie 2: Remplacer dans le cache des modules
    if (window.moduleCache) {
      const childrenDB = import('./quiz-database-children.js');
      window.moduleCache['./quiz-database.js'] = childrenDB;
      window.moduleCache['/src/quiz-database.js'] = childrenDB;
    }
    
    // Stratégie 3: Override global
    import('./quiz-database-children.js').then(childrenModule => {
      console.log('✅ quiz-database-children chargé');
      
      // Stocker la version enfants globalement
      window.childrenQuizDatabase = childrenModule.quiz_database;
      
      // Essayer de remplacer dans les instances existantes
      setTimeout(() => {
        if (window.combatSystemInstance) {
          console.log('🔄 Remplacement dans l\'instance de combat existante');
          window.combatSystemInstance._quizDatabase = childrenModule.quiz_database.getAllQuestions();
          console.log('✅ _quizDatabase remplacé avec', window.combatSystemInstance._quizDatabase.length, 'questions enfants');
        }
      }, 1000);
    });
  };
  
  const forceReplaceInCombatSystem = () => {
    console.log('💪 Remplacement forcé dans le système de combat');
    
    // Attendre que combat-system soit initialisé
    const checkInterval = setInterval(() => {
      if (window.combatSystemInstance && window.childrenQuizDatabase) {
        clearInterval(checkInterval);
        
        console.log('🎯 Système de combat trouvé, remplacement en cours...');
        
        const combatInstance = window.combatSystemInstance;
        const childrenDB = window.childrenQuizDatabase;
        
        // Remplacer _quizDatabase
        combatInstance._quizDatabase = childrenDB.getAllQuestions();
        console.log(`📚 _quizDatabase remplacé: ${combatInstance._quizDatabase.length} questions enfants`);
        
        // Sauvegarder les méthodes originales
        combatInstance._originalHandleCodeAction = combatInstance._HandleCodeAction;
        combatInstance._originalLoadRobotQuiz = combatInstance._LoadRobotQuiz;
        
        // Remplacer _HandleCodeAction pour bloquer le code
        combatInstance._HandleCodeAction = function() {
          console.log('🚫 Action CODE bloquée en mode enfant');
          this._AddCombatLog('❌ Cette action n\'est pas disponible pour les enfants!');
          this._PlayUISound('incorrect');
          this._isAnimating = false;
        };
        
        // Remplacer _LoadRobotQuiz pour utiliser questions enfants
        combatInstance._LoadRobotQuiz = function() {
          console.log('🤖 Chargement quiz robot (version enfants)');
          
          const geekQuestions = childrenDB.getQuestionsByCategory('geek');
          if (geekQuestions.length === 0) {
            console.warn('⚠️ Aucune question geek pour enfants!');
            return;
          }
          
          // Sélectionner une question aléatoire
          let robotQuiz;
          do {
            const randomIndex = Math.floor(Math.random() * geekQuestions.length);
            robotQuiz = geekQuestions[randomIndex];
          } while ((this._currentQuiz && robotQuiz === this._currentQuiz) || 
                   (this._robotQuiz && robotQuiz === this._robotQuiz));
          
          this._robotQuiz = robotQuiz;
          console.log(`🤖 Robot quiz chargé: ${robotQuiz.question}`);
        };
        
        // Forcer le rechargement d'une question si nécessaire
        if (combatInstance._currentQuiz) {
          console.log('🔄 Rechargement de la question actuelle avec version enfants');
          combatInstance._LoadRandomQuiz();
        }
        
        console.log('✅ Remplacement forcé terminé');
      }
    }, 100);
    
    // Timeout après 10 secondes
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('⏰ Timeout du remplacement forcé');
    }, 10000);
  };
  
  return {
    replaceQuizDatabase,
    forceReplaceInCombatSystem
  };
})();

// Exécuter immédiatement
quiz_database_replacer.replaceQuizDatabase();

// Exécuter le remplacement forcé après un délai
setTimeout(() => {
  quiz_database_replacer.forceReplaceInCombatSystem();
}, 500);

export default quiz_database_replacer;