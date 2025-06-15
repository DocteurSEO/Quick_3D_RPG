// Base de données des questions pour le système de combat
// Organisée par catégories : math, general, geek

export const quiz_database = (() => {
  
  const quizDatabase = [
    // Questions de mathématiques
    {
      question: "Combien fait 2 + 2 ?",
      options: ["3", "4", "5", "6"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien fait 5 × 3 ?",
      options: ["13", "15", "18", "20"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien fait 100 ÷ 4 ?",
      options: ["20", "25", "30", "35"],
      correct: 1,
      category: "math"
    },
    {
      question: "Quelle est la racine carrée de 64 ?",
      options: ["6", "7", "8", "9"],
      correct: 2,
      category: "math"
    },
    {
      question: "Combien fait 15 - 7 ?",
      options: ["6", "7", "8", "9"],
      correct: 2,
      category: "math"
    },
    {
      question: "Combien fait 3 × 7 ?",
      options: ["19", "20", "21", "22"],
      correct: 2,
      category: "math"
    },
    {
      question: "Combien fait 50 ÷ 5 ?",
      options: ["8", "9", "10", "11"],
      correct: 2,
      category: "math"
    },
    {
      question: "Combien fait 8 × 9 ?",
      options: ["71", "72", "73", "74"],
      correct: 1,
      category: "math"
    },
    {
      question: "Combien fait 144 ÷ 12 ?",
      options: ["11", "12", "13", "14"],
      correct: 1,
      category: "math"
    },
    {
      question: "Quelle est la racine carrée de 81 ?",
      options: ["8", "9", "10", "11"],
      correct: 1,
      category: "math"
    },
    
    // Questions de culture générale
    {
      question: "Quelle est la capitale de la France ?",
      options: ["Londres", "Berlin", "Paris", "Madrid"],
      correct: 2,
      category: "general"
    },
    {
      question: "Quelle planète est la plus proche du Soleil ?",
      options: ["Vénus", "Mercure", "Terre", "Mars"],
      correct: 1,
      category: "general"
    },
    {
      question: "Quel est le plus grand océan ?",
      options: ["Atlantique", "Indien", "Arctique", "Pacifique"],
      correct: 3,
      category: "general"
    },
    {
      question: "Quelle est la capitale de l'Italie ?",
      options: ["Milan", "Rome", "Naples", "Florence"],
      correct: 1,
      category: "general"
    },
    {
      question: "Combien y a-t-il de continents ?",
      options: ["5", "6", "7", "8"],
      correct: 2,
      category: "general"
    },
    {
      question: "Quelle est la plus haute montagne du monde ?",
      options: ["K2", "Mont Everest", "Mont Blanc", "Kilimanjaro"],
      correct: 1,
      category: "general"
    },
    
    // Questions geek/informatique
    {
      question: "Que signifie HTML ?",
      options: ["HyperText Markup Language", "Home Tool Markup Language", "Hyperlinks and Text Markup Language", "Hypermedia Text Markup Language"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel langage de programmation est principalement utilisé pour le développement web ?",
      options: ["Python", "JavaScript", "C++", "Java"],
      correct: 1,
      category: "geek"
    },
    {
      question: "Que signifie CPU ?",
      options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Unit", "Computer Processing Unit"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel est le créateur de Linux ?",
      options: ["Bill Gates", "Steve Jobs", "Linus Torvalds", "Mark Zuckerberg"],
      correct: 2,
      category: "geek"
    },
    {
      question: "Que signifie HTTP ?",
      options: ["HyperText Transfer Protocol", "Home Transfer Text Protocol", "HyperText Transport Protocol", "High Transfer Text Protocol"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel est le langage de programmation créé par Google ?",
      options: ["Python", "Go", "Rust", "Swift"],
      correct: 1,
      category: "geek"
    },
    {
      question: "Que signifie API ?",
      options: ["Application Programming Interface", "Advanced Programming Interface", "Application Program Integration", "Advanced Program Interface"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel est le système d'exploitation mobile de Google ?",
      options: ["iOS", "Windows Mobile", "Android", "BlackBerry"],
      correct: 2,
      category: "geek"
    },
    {
      question: "Que signifie SQL ?",
      options: ["Structured Query Language", "Simple Query Language", "Standard Query Language", "System Query Language"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel est le fondateur de Microsoft ?",
      options: ["Steve Jobs", "Bill Gates", "Larry Page", "Jeff Bezos"],
      correct: 1,
      category: "geek"
    },
    {
      question: "Que signifie RAM ?",
      options: ["Random Access Memory", "Read Access Memory", "Rapid Access Memory", "Real Access Memory"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel protocole est utilisé pour les emails sécurisés ?",
      options: ["HTTP", "FTP", "SMTP", "HTTPS"],
      correct: 3,
      category: "geek"
    },
    {
      question: "Que signifie CSS ?",
      options: ["Cascading Style Sheets", "Computer Style Sheets", "Creative Style Sheets", "Colorful Style Sheets"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel est le créateur de Facebook ?",
      options: ["Bill Gates", "Steve Jobs", "Mark Zuckerberg", "Larry Page"],
      correct: 2,
      category: "geek"
    },
    {
      question: "Que signifie URL ?",
      options: ["Uniform Resource Locator", "Universal Resource Locator", "Unique Resource Locator", "United Resource Locator"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel langage est utilisé pour styliser les pages web ?",
      options: ["HTML", "CSS", "JavaScript", "PHP"],
      correct: 1,
      category: "geek"
    },
    {
      question: "Que signifie GPU ?",
      options: ["Graphics Processing Unit", "General Processing Unit", "Game Processing Unit", "Global Processing Unit"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel est le système d'exploitation d'Apple ?",
      options: ["Windows", "Linux", "macOS", "Android"],
      correct: 2,
      category: "geek"
    },
    {
      question: "Que signifie DNS ?",
      options: ["Domain Name System", "Data Name System", "Digital Name System", "Dynamic Name System"],
      correct: 0,
      category: "geek"
    },
    {
      question: "Quel est le langage de programmation créé par Apple ?",
      options: ["Objective-C", "Swift", "Java", "C#"],
      correct: 1,
      category: "geek"
    },
    
    // Questions de code (questions ouvertes)
    {
      question: "Écrivez une fonction JavaScript nommée 'hello' qui retourne 'world'",
      type: "open",
      correctAnswer: "function hello() { return 'world'; }",
      category: "code",
      timeLimit: 60000, // 1 minute en millisecondes
      hints: ["Utilisez le mot-clé 'function'", "N'oubliez pas le 'return'", "La réponse doit être exactement 'world'"]
    }
  ];
  
  // Fonctions utilitaires pour filtrer les questions
  const getQuestionsByCategory = (category) => {
    return quizDatabase.filter(q => q.category === category);
  };
  
  const getRandomQuestion = (excludeQuestions = []) => {
    const availableQuestions = quizDatabase.filter(q => !excludeQuestions.includes(q));
    if (availableQuestions.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
  };
  
  const getRandomQuestionByCategory = (category, excludeQuestions = []) => {
    const categoryQuestions = getQuestionsByCategory(category);
    const availableQuestions = categoryQuestions.filter(q => !excludeQuestions.includes(q));
    if (availableQuestions.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    return availableQuestions[randomIndex];
  };
  
  // Interface publique
  return {
    getAllQuestions: () => quizDatabase,
    getQuestionsByCategory,
    getRandomQuestion,
    getRandomQuestionByCategory,
    
    // Catégories disponibles
    categories: {
      MATH: 'math',
      GENERAL: 'general',
      GEEK: 'geek',
      CODE: 'code'
    },
    
    // Statistiques
    getStats: () => {
      const stats = {};
      quizDatabase.forEach(q => {
        stats[q.category] = (stats[q.category] || 0) + 1;
      });
      return {
        total: quizDatabase.length,
        byCategory: stats
      };
    }
  };
})();

// Export par défaut pour compatibilité
export default quiz_database;