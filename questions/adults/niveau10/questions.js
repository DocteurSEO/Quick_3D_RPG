// Questions pour adultes - Niveau 10 (Difficile avec Code)
// Catégories : math, general, geek, code

export const adults_niveau10_questions = [
  // Mathématiques avancées
  {
    question: "Quelle est la dérivée de x³ + 2x² - 5x + 1 ?",
    options: ["3x² + 4x - 5", "x⁴ + 2x³ - 5x²", "3x² + 2x - 5", "3x³ + 4x² - 5x"],
    correct: 0,
    category: "math",
    difficulty: "hard",
    points: 40
  },
  {
    question: "Combien vaut lim(x→0) (sin(x)/x) ?",
    options: ["0", "1", "∞", "Indéterminé"],
    correct: 1,
    category: "math",
    difficulty: "hard",
    points: 40
  },
  
  // Culture générale avancée
  {
    question: "Qui a développé la théorie de la relativité générale ?",
    options: ["Newton", "Einstein", "Hawking", "Feynman"],
    correct: 1,
    category: "general",
    difficulty: "hard",
    points: 35
  },
  {
    question: "Quel élément chimique a pour symbole Au ?",
    options: ["Argent", "Aluminium", "Or", "Arsenic"],
    correct: 2,
    category: "general",
    difficulty: "hard",
    points: 35
  },
  
  // Questions techniques avancées
  {
    question: "Quelle est la complexité temporelle de l'algorithme de tri rapide (quicksort) dans le pire cas ?",
    options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
    correct: 2,
    category: "geek",
    difficulty: "hard",
    points: 45
  },
  {
    question: "Que signifie SOLID en programmation orientée objet ?",
    options: ["Un framework", "Des principes de conception", "Un langage", "Une base de données"],
    correct: 1,
    category: "geek",
    difficulty: "hard",
    points: 45
  },
  
  // Questions de code
  {
    question: "Écrivez une fonction JavaScript qui retourne la factorielle d'un nombre n",
    type: "code",
    correctAnswer: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
    alternativeAnswers: [
      `function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }`,
      `const factorial = n => n <= 1 ? 1 : n * factorial(n - 1);`,
      `function factorial(n) {
  let result = 1;
  for(let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}`
    ],
    category: "code",
    difficulty: "hard",
    points: 60,
    timeLimit: 300000, // 5 minutes
    hints: [
      "Pensez à la récursion ou à une boucle",
      "N'oubliez pas le cas de base (n <= 1)",
      "La factorielle de 0 et 1 est 1"
    ]
  },
  {
    question: "Écrivez une fonction qui inverse une chaîne de caractères sans utiliser reverse()",
    type: "code",
    correctAnswer: `function reverseString(str) {
  let reversed = '';
  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}`,
    alternativeAnswers: [
      `function reverseString(str) { return str.split('').reverse().join(''); }`,
      `const reverseString = str => str.split('').reduce((rev, char) => char + rev, '');`,
      `function reverseString(str) {
  if (str === '') return '';
  return reverseString(str.substr(1)) + str.charAt(0);
}`
    ],
    category: "code",
    difficulty: "hard",
    points: 50,
    timeLimit: 240000, // 4 minutes
    hints: [
      "Parcourez la chaîne de la fin vers le début",
      "Construisez une nouvelle chaîne caractère par caractère",
      "Vous pouvez aussi utiliser la récursion"
    ]
  }
];

export default adults_niveau10_questions;