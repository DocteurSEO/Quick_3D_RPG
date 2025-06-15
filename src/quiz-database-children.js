// Remplacement de quiz-database.js pour les enfants
// Garde la même interface mais avec des questions d'enfants

export const quiz_database = (() => {
  
  // Questions pour enfants - remplace complètement l'ancien système
  const childrenQuestions = [
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
  
  // Interface compatible avec l'ancien système
  const getAllQuestions = () => {
    console.log('📚 getAllQuestions() appelé - retourne questions enfants');
    return childrenQuestions;
  };
  
  const getQuestionsByCategory = (category) => {
    console.log(`📂 getQuestionsByCategory(${category}) appelé`);
    
    // Bloquer complètement les questions de code
    if (category === 'code') {
      console.log('🚫 Questions de code bloquées pour les enfants');
      return [];
    }
    
    const filtered = childrenQuestions.filter(q => q.category === category);
    console.log(`✅ ${filtered.length} questions trouvées pour catégorie ${category}`);
    return filtered;
  };
  
  const getRandomQuestion = (excludeQuestions = []) => {
    console.log('🎲 getRandomQuestion() appelé');
    const available = childrenQuestions.filter(q => !excludeQuestions.includes(q));
    if (available.length === 0) return childrenQuestions[0];
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
  
  // Interface publique identique à l'ancien système
  return {
    getAllQuestions,
    getQuestionsByCategory,
    getRandomQuestion,
    getRandomQuestionByCategory,
    
    // Catégories pour enfants (pas de code)
    categories: {
      MATH: 'math',
      GENERAL: 'general',
      GEEK: 'geek'  // Pas de CODE
    },
    
    // Statistiques
    getStats: () => {
      const stats = {};
      childrenQuestions.forEach(q => {
        stats[q.category] = (stats[q.category] || 0) + 1;
      });
      return {
        total: childrenQuestions.length,
        byCategory: stats
      };
    }
  };
})();

// Export par défaut pour compatibilité
export default quiz_database;