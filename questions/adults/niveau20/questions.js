// Questions pour adultes - Niveau 20 (Maître/Expert avec Code Avancé)
// Catégories : algorithmes, architecture, code complexe

export const adults_niveau20_questions = [
  // Algorithmes et structures de données
  {
    question: "Quelle structure de données est la plus efficace pour implémenter une file de priorité ?",
    options: ["Array", "Linked List", "Binary Heap", "Hash Table"],
    correct: 2,
    category: "algorithms",
    difficulty: "master",
    points: 60
  },
  {
    question: "Quelle est la complexité spatiale de l'algorithme de tri fusion (merge sort) ?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    correct: 2,
    category: "algorithms",
    difficulty: "master",
    points: 60
  },
  
  // Architecture et design patterns
  {
    question: "Quel design pattern est utilisé pour garantir qu'une classe n'a qu'une seule instance ?",
    options: ["Factory", "Observer", "Singleton", "Strategy"],
    correct: 2,
    category: "geek",
    difficulty: "master",
    points: 55
  },
  {
    question: "Que signifie le principe DRY en développement logiciel ?",
    options: ["Don't Repeat Yourself", "Do Repeat Yearly", "Data Retrieval Yield", "Dynamic Resource Yielding"],
    correct: 0,
    category: "geek",
    difficulty: "master",
    points: 55
  },
  
  // Questions de code avancées
  {
    question: "Implémentez une fonction qui trouve le plus long palindrome dans une chaîne",
    type: "code",
    correctAnswer: `function longestPalindrome(s) {
  if (!s || s.length < 2) return s;
  
  let start = 0, maxLen = 1;
  
  for (let i = 0; i < s.length; i++) {
    // Check for odd length palindromes
    let len1 = expandAroundCenter(s, i, i);
    // Check for even length palindromes
    let len2 = expandAroundCenter(s, i, i + 1);
    let len = Math.max(len1, len2);
    
    if (len > maxLen) {
      maxLen = len;
      start = i - Math.floor((len - 1) / 2);
    }
  }
  
  return s.substr(start, maxLen);
}

function expandAroundCenter(s, left, right) {
  while (left >= 0 && right < s.length && s[left] === s[right]) {
    left--;
    right++;
  }
  return right - left - 1;
}`,
    category: "code",
    difficulty: "master",
    points: 100,
    timeLimit: 600000, // 10 minutes
    hints: [
      "Utilisez l'approche 'expand around center'",
      "Considérez les palindromes de longueur paire et impaire",
      "Optimisez avec l'algorithme de Manacher si possible"
    ]
  },
  {
    question: "Implémentez un algorithme de recherche binaire récursif",
    type: "code",
    correctAnswer: `function binarySearch(arr, target, left = 0, right = arr.length - 1) {
  if (left > right) return -1;
  
  const mid = Math.floor((left + right) / 2);
  
  if (arr[mid] === target) {
    return mid;
  }
  
  if (arr[mid] > target) {
    return binarySearch(arr, target, left, mid - 1);
  } else {
    return binarySearch(arr, target, mid + 1, right);
  }
}`,
    alternativeAnswers: [
      `function binarySearch(arr, target) {
  function search(left, right) {
    if (left > right) return -1;
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    return arr[mid] > target ? 
      search(left, mid - 1) : 
      search(mid + 1, right);
  }
  return search(0, arr.length - 1);
}`
    ],
    category: "code",
    difficulty: "master",
    points: 80,
    timeLimit: 480000, // 8 minutes
    hints: [
      "Divisez l'espace de recherche en deux à chaque étape",
      "Vérifiez les conditions de base pour la récursion",
      "Le tableau doit être trié"
    ]
  },
  {
    question: "Implémentez une classe LRU Cache (Least Recently Used)",
    type: "code",
    correctAnswer: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  
  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return -1;
  }
  
  put(key, value) {
    if (this.cache.has(key)) {
      // Update existing key
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}`,
    category: "code",
    difficulty: "master",
    points: 120,
    timeLimit: 600000, // 10 minutes
    hints: [
      "Utilisez une Map pour maintenir l'ordre d'insertion",
      "get() doit mettre à jour l'ordre d'utilisation",
      "put() doit gérer la capacité maximale"
    ]
  }
];

export default adults_niveau20_questions;