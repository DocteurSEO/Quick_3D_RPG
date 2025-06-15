// Remplacement de quiz-database-children.js pour les enfants
// Garde la même interface mais avec des questions d'enfants

export const quiz_database = (() => {
  
  // Système de niveau dynamique
  let currentLevel = 1;
  let loadedQuestions = [];
  let questionsLoaded = false;
  
  // Questions par défaut (fallback) si le chargement échoue
  const defaultChildrenQuestions = [
    // Mathématiques simples
    {
      question: "Combien font 1 + 1 ?",
      options: ["1", "2", "3", "4"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 2 + 2 ?",
      options: ["3", "4", "5", "6"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 3 + 2 ?",
      options: ["4", "5", "6", "7"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 5 - 2 ?",
      options: ["2", "3", "4", "5"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 4 + 1 ?",
      options: ["4", "5", "6", "7"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 6 - 3 ?",
      options: ["2", "3", "4", "5"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 2 × 3 ?",
      options: ["5", "6", "7", "8"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien font 8 ÷ 2 ?",
      options: ["3", "4", "5", "6"],
      correct: 1,
      category: "math"
    },
    
    // Culture générale pour enfants
    {
      question: "Quelle couleur fait rouge + jaune ?",
      options: ["Vert", "Orange", "Violet", "Bleu"],
      correct: 1,
      category: "general"
    },
    {
      question: "Combien de pattes a un chat ?",
      options: ["2", "3", "4", "5"],
      correct: 2,
      category: "general"
    },
    {
      question: "Quel animal dit 'miaou' ?",
      options: ["Chien", "Chat", "Vache", "Coq"],
      correct: 1,
      category: "general"
    },
    {
      question: "De quelle couleur est le soleil ?",
      options: ["Bleu", "Vert", "Jaune", "Rouge"],
      correct: 2,
      category: "general"
    },
    {
      question: "Combien y a-t-il de jours dans une semaine ?",
      options: ["5", "6", "7", "8"],
      correct: 2,
      category: "general"
    },
    {
      question: "Quel animal vit dans l'eau ?",
      options: ["Chat", "Chien", "Poisson", "Oiseau"],
      correct: 2,
      category: "general"
    },
    {
      question: "Que mange un lapin ?",
      options: ["Viande", "Carottes", "Poisson", "Pain"],
      correct: 1,
      category: "general"
    },
    {
      question: "Combien de roues a une voiture ?",
      options: ["2", "3", "4", "5"],
      correct: 2,
      category: "general"
    },
    
    // Questions "geek" adaptées aux enfants (pour le robot)
    {
      question: "Qu'est-ce qu'un ordinateur ?",
      options: ["Un animal", "Une machine", "Un fruit", "Un jeu"],
      correct: 1,
      category: "geek"
    },
    {
      question: "À quoi sert une souris d'ordinateur ?",
      options: ["Manger", "Cliquer", "Dormir", "Courir"],
      correct: 1,
      category: "geek"
    },
    {
      question: "Qu'est-ce qu'Internet ?",
      options: ["Un magasin", "Un réseau", "Un animal", "Un livre"],
      correct: 1,
      category: "geek"
    },
    {
      question: "Que fait un clavier ?",
      options: ["Écrire", "Courir", "Manger", "Dormir"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Qu'est-ce qu'un écran ?",
      options: ["Pour voir", "Pour manger", "Pour dormir", "Pour courir"],
      correct: 0,
      category: "geek"
    }
  ];
  
  // Fonction pour charger les questions du niveau actuel
  const loadQuestionsForLevel = async (level) => {
    try {
      console.log(`🔄 Chargement des questions niveau ${level}...`);
      
      // Import dynamique du fichier du niveau
      const moduleUrl = `/questions/children/niveau${level}/questions.js`;
      const module = await import(moduleUrl);
      
      // Le module peut exporter soit children_niveau{X}_questions soit default
      const questions = module[`children_niveau${level}_questions`] || module.default;
      
      if (!questions || !Array.isArray(questions)) {
        throw new Error(`Questions invalides pour le niveau ${level}`);
      }
      
      loadedQuestions = questions;
      questionsLoaded = true;
      console.log(`✅ ${questions.length} questions chargées pour le niveau ${level}`);
      
      return questions;
    } catch (error) {
      console.warn(`⚠️ Erreur lors du chargement niveau ${level}:`, error);
      console.log('🔄 Utilisation des questions par défaut...');
      
      // Fallback sur les questions par défaut
      loadedQuestions = defaultChildrenQuestions;
      questionsLoaded = true;
      return defaultChildrenQuestions;
    }
  };
  
  // Fonction pour obtenir les questions (charge si nécessaire)
  const getQuestions = () => {
    if (questionsLoaded) {
      return loadedQuestions;
    } else {
      // Retour synchrone des questions par défaut si pas encore chargé
      console.log('⚠️ Questions pas encore chargées, utilisation du cache par défaut');
      return defaultChildrenQuestions;
    }
  };
  
  // Interface compatible avec l'ancien système
  const getAllQuestions = () => {
    console.log('📚 getAllQuestions() appelé');
    return getQuestions();
  };
  
  const getQuestionsByCategory = (category) => {
    console.log(`📂 getQuestionsByCategory(${category}) appelé`);
    
    // Bloquer complètement les questions de code
    if (category === 'code') {
      console.log('🚫 Questions de code bloquées pour les enfants');
      return [];
    }
    
    const questions = getQuestions();
    const filtered = questions.filter(q => q.category === category);
    console.log(`✅ ${filtered.length} questions trouvées pour catégorie ${category}`);
    return filtered;
  };
  
  const getRandomQuestion = (excludeQuestions = []) => {
    console.log('🎲 getRandomQuestion() appelé');
    const questions = getQuestions();
    const available = questions.filter(q => !excludeQuestions.includes(q));
    if (available.length === 0) return questions[0];
    return available[Math.floor(Math.random() * available.length)];
  };
  
  const getRandomQuestionByCategory = (category, excludeQuestions = []) => {
    console.log(`🎯 getRandomQuestionByCategory(${category}) appelé`);
    
    if (category === 'code') {
      console.log('🚫 Code questions blocked for children');
      return null;
    }
    
    const categoryQuestions = getQuestionsByCategory(category);
    const available = categoryQuestions.filter(q => !excludeQuestions.includes(q));
    if (available.length === 0) return categoryQuestions[0] || null;
    return available[Math.floor(Math.random() * available.length)];
  };
  
  // Interface publique avec nouvelles fonctions de niveau
  return {
    getAllQuestions,
    getQuestionsByCategory,
    getRandomQuestion,
    getRandomQuestionByCategory,
    
    // NOUVELLES FONCTIONS POUR LE SYSTÈME DE NIVEAU
    loadQuestionsForLevel,
    getCurrentLevel: () => currentLevel,
    setCurrentLevel: (level) => {
      console.log(`🎯 Niveau changé de ${currentLevel} à ${level}`);
      currentLevel = level;
      questionsLoaded = false; // Force le rechargement
    },
    
    // Catégories pour enfants (pas de code)
    categories: {
      MATH: 'math',
      GENERAL: 'general',
      GEEK: 'geek',
      NATURE: 'nature'  // Nouvelle catégorie
    },
    
    // Statistiques
    getStats: () => {
      const questions = getQuestions();
      const stats = {};
      questions.forEach(q => {
        stats[q.category] = (stats[q.category] || 0) + 1;
      });
      return {
        total: questions.length,
        byCategory: stats,
        currentLevel: currentLevel,
        questionsLoaded: questionsLoaded
      };
    }
  };
})();

// Export par défaut pour compatibilité
export default quiz_database;