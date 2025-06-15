// Questions pour enfants - Chargement direct sans import dynamique
// Remplace le système de chargement complexe par des questions directement disponibles

export const children_questions_direct = (() => {
  
  // Base de données complète des questions pour enfants
  const childrenQuestions = [
    // Niveau 1 - Très facile (6-8 ans)
    {
      question: "Combien font 1 + 1 ?",
      options: ["1", "2", "3", "4"],
      correct: 1,
      category: "math",
      difficulty: "very_easy",
      level: 1,
      points: 10
    },
    {
      question: "Combien font 2 + 1 ?",
      options: ["2", "3", "4", "5"],
      correct: 1,
      category: "math",
      difficulty: "very_easy",
      level: 1,
      points: 10
    },
    {
      question: "Combien font 3 - 1 ?",
      options: ["1", "2", "3", "4"],
      correct: 1,
      category: "math",
      difficulty: "very_easy",
      level: 1,
      points: 10
    },
    {
      question: "Quelle couleur obtient-on en mélangeant rouge et jaune ?",
      options: ["Vert", "Orange", "Violet", "Bleu"],
      correct: 1,
      category: "general",
      difficulty: "very_easy",
      level: 1,
      points: 15
    },
    {
      question: "Combien de pattes a un chat ?",
      options: ["2", "3", "4", "5"],
      correct: 2,
      category: "general",
      difficulty: "very_easy",
      level: 1,
      points: 15
    },
    {
      question: "Quel animal dit 'miaou' ?",
      options: ["Le chien", "Le chat", "La vache", "Le coq"],
      correct: 1,
      category: "nature",
      difficulty: "very_easy",
      level: 1,
      points: 12
    },
    {
      question: "De quelle couleur est le soleil ?",
      options: ["Bleu", "Vert", "Jaune", "Rouge"],
      correct: 2,
      category: "nature",
      difficulty: "very_easy",
      level: 1,
      points: 12
    },
    
    // Niveau 2-5 - Facile
    {
      question: "Combien font 5 + 3 ?",
      options: ["6", "7", "8", "9"],
      correct: 2,
      category: "math",
      difficulty: "easy",
      level: 3,
      points: 15
    },
    {
      question: "Combien font 10 - 4 ?",
      options: ["5", "6", "7", "8"],
      correct: 1,
      category: "math",
      difficulty: "easy",
      level: 3,
      points: 15
    },
    {
      question: "Quelle est la capitale de la France ?",
      options: ["Lyon", "Marseille", "Paris", "Lille"],
      correct: 2,
      category: "general",
      difficulty: "easy",
      level: 3,
      points: 20
    },
    {
      question: "Combien y a-t-il de jours dans une semaine ?",
      options: ["6", "7", "8", "9"],
      correct: 1,
      category: "general",
      difficulty: "easy",
      level: 3,
      points: 20
    },
    {
      question: "Quel animal est connu pour être le roi de la jungle ?",
      options: ["L'éléphant", "Le lion", "Le tigre", "L'ours"],
      correct: 1,
      category: "nature",
      difficulty: "easy",
      level: 3,
      points: 18
    },
    {
      question: "Que produisent les abeilles ?",
      options: ["Du lait", "Du miel", "De l'huile", "Du sucre"],
      correct: 1,
      category: "nature",
      difficulty: "easy",
      level: 3,
      points: 18
    },
    
    // Niveau 6-10 - Moyen
    {
      question: "Combien font 12 × 3 ?",
      options: ["33", "34", "35", "36"],
      correct: 3,
      category: "math",
      difficulty: "medium",
      level: 7,
      points: 25
    },
    {
      question: "Combien font 48 ÷ 6 ?",
      options: ["6", "7", "8", "9"],
      correct: 2,
      category: "math",
      difficulty: "medium",
      level: 7,
      points: 25
    },
    {
      question: "Dans quel pays se trouve la Tour Eiffel ?",
      options: ["Italie", "Espagne", "France", "Allemagne"],
      correct: 2,
      category: "general",
      difficulty: "medium",
      level: 7,
      points: 30
    },
    {
      question: "Combien de continents y a-t-il sur Terre ?",
      options: ["5", "6", "7", "8"],
      correct: 2,
      category: "general",
      difficulty: "medium",
      level: 7,
      points: 30
    },
    {
      question: "Quel est l'animal terrestre le plus rapide ?",
      options: ["Le lion", "Le guépard", "Le cheval", "Le lévrier"],
      correct: 1,
      category: "nature",
      difficulty: "medium",
      level: 7,
      points: 28
    },
    {
      question: "Combien de chambres a le cœur humain ?",
      options: ["2", "3", "4", "5"],
      correct: 2,
      category: "nature",
      difficulty: "medium",
      level: 7,
      points: 28
    },
    
    // Questions supplémentaires pour éviter la répétition
    {
      question: "Combien font 6 + 7 ?",
      options: ["11", "12", "13", "14"],
      correct: 2,
      category: "math",
      difficulty: "easy",
      level: 2,
      points: 15
    },
    {
      question: "Combien font 15 - 9 ?",
      options: ["5", "6", "7", "8"],
      correct: 1,
      category: "math",
      difficulty: "easy",
      level: 2,
      points: 15
    },
    {
      question: "Combien de minutes y a-t-il dans une heure ?",
      options: ["50", "60", "70", "80"],
      correct: 1,
      category: "general",
      difficulty: "easy",
      level: 4,
      points: 20
    },
    {
      question: "Quelle saison vient après l'hiver ?",
      options: ["L'automne", "L'été", "Le printemps", "L'hiver"],
      correct: 2,
      category: "nature",
      difficulty: "easy",
      level: 4,
      points: 18
    }
  ];
  
  // Fonction pour obtenir une question aléatoire adaptée au niveau
  const getRandomQuestionForLevel = (playerLevel = 1, usedQuestions = []) => {
    console.log(`🎯 Récupération question enfant pour niveau ${playerLevel}`);
    
    // Déterminer la difficulté selon le niveau
    let targetDifficulty = 'very_easy';
    if (playerLevel >= 8) targetDifficulty = 'medium';
    else if (playerLevel >= 3) targetDifficulty = 'easy';
    
    // Filtrer les questions appropriées
    let availableQuestions = childrenQuestions.filter(q => {
      return q.difficulty === targetDifficulty && !usedQuestions.includes(q);
    });
    
    // Si pas assez de questions de la difficulté exacte, prendre toutes les questions
    if (availableQuestions.length === 0) {
      availableQuestions = childrenQuestions.filter(q => !usedQuestions.includes(q));
    }
    
    // Si toutes les questions ont été utilisées, réinitialiser
    if (availableQuestions.length === 0) {
      availableQuestions = childrenQuestions;
    }
    
    // Sélectionner une question au hasard
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const selectedQuestion = availableQuestions[randomIndex];
    
    console.log(`✅ Question sélectionnée:`, selectedQuestion);
    return selectedQuestion;
  };
  
  // Fonction pour obtenir toutes les questions d'enfants
  const getAllChildrenQuestions = () => {
    return [...childrenQuestions];
  };
  
  // Fonction pour obtenir des questions par catégorie
  const getQuestionsByCategory = (category) => {
    return childrenQuestions.filter(q => q.category === category);
  };
  
  // Fonction pour obtenir des questions par niveau
  const getQuestionsByLevel = (level) => {
    return childrenQuestions.filter(q => q.level <= level);
  };
  
  return {
    getRandomQuestionForLevel,
    getAllChildrenQuestions,
    getQuestionsByCategory,
    getQuestionsByLevel,
    childrenQuestions
  };
})();

export default children_questions_direct;