// Gestionnaire avancé de questions avec support des modes enfant/adulte
// Évite la régression du système existant en ajoutant de nouvelles fonctionnalités

import { game_modes_config } from './game-modes-config.js';

export const advanced_question_manager = (() => {
  
  const { GameModesConfig } = game_modes_config;
  
  class AdvancedQuestionManager {
    constructor() {
      this._questionCache = new Map();
      this._loadedLevels = new Set();
      this._currentMode = GameModesConfig.currentMode;
      this._usedQuestions = new Set();
      this._playerLevel = 1;
      this._currentSessionQuestions = [];
    }
    
    // === GESTION DES MODES ===
    setMode(mode) {
      if (GameModesConfig.utils.setMode(mode)) {
        this._currentMode = mode;
        this._clearCache();
        return true;
      }
      return false;
    }
    
    getCurrentMode() {
      return this._currentMode;
    }
    
    getModeConfig() {
      return GameModesConfig.utils.getCurrentModeConfig();
    }
    
    // === CHARGEMENT DYNAMIQUE DES QUESTIONS ===
    async loadQuestionsForLevel(level, mode = null) {
      const targetMode = mode || this._currentMode;
      const cacheKey = `${targetMode}-${level}`;
      
      // Vérifier le cache
      if (this._questionCache.has(cacheKey)) {
        return this._questionCache.get(cacheKey);
      }
      
      try {
        // Charger dynamiquement les questions du niveau
        const questionsModule = await import(`../questions/${targetMode}/niveau${level}/questions.js`);
        const questions = questionsModule.default;
        
        // Mettre en cache
        this._questionCache.set(cacheKey, questions);
        this._loadedLevels.add(cacheKey);
        
        return questions;
      } catch (error) {
        console.warn(`Questions non trouvées pour ${targetMode} niveau ${level}:`, error);
        return [];
      }
    }
    
    // === SÉLECTION INTELLIGENTE DES QUESTIONS ===
    async getQuestionForLevel(level, mode = null) {
      const targetMode = mode || this._currentMode;
      const questions = await this.loadQuestionsForLevel(level, targetMode);
      
      if (!questions || questions.length === 0) {
        return null;
      }
      
      // Filtrer les questions selon la configuration du mode
      const availableQuestions = this._filterQuestionsByMode(questions, targetMode);
      
      // Éviter les questions déjà utilisées
      const unusedQuestions = availableQuestions.filter(q => 
        !this._usedQuestions.has(this._getQuestionId(q))
      );
      
      // Si toutes les questions ont été utilisées, réinitialiser
      if (unusedQuestions.length === 0) {
        this._usedQuestions.clear();
        return this._selectRandomQuestion(availableQuestions);
      }
      
      return this._selectRandomQuestion(unusedQuestions);
    }
    
    // === SÉLECTION PAR CATÉGORIE ===
    async getQuestionByCategory(level, category, mode = null) {
      const questions = await this.loadQuestionsForLevel(level, mode);
      const categoryQuestions = questions.filter(q => q.category === category);
      
      if (categoryQuestions.length === 0) {
        return null;
      }
      
      return this._selectRandomQuestion(categoryQuestions);
    }
    
    // === VALIDATION DES QUESTIONS CODE ===
    validateCodeQuestion(question) {
      if (question.type !== 'code') {
        return { valid: false, error: 'Not a code question' };
      }
      
      // Vérifier si le code est autorisé dans le mode actuel
      if (!GameModesConfig.utils.isCodeAllowed(this._currentMode)) {
        return { valid: false, error: 'Code questions not allowed in current mode' };
      }
      
      // Vérifications de base
      if (!question.correctAnswer) {
        return { valid: false, error: 'No correct answer provided' };
      }
      
      if (!question.timeLimit || question.timeLimit < 30000) {
        return { valid: false, error: 'Time limit too short for code questions' };
      }
      
      return { valid: true };
    }
    
    // === SYSTÈME DE PROGRESSION ===
    setPlayerLevel(level) {
      this._playerLevel = level;
    }
    
    getPlayerLevel() {
      return this._playerLevel;
    }
    
    getDifficultyForCurrentLevel() {
      return GameModesConfig.utils.getDifficultyForLevel(this._playerLevel, this._currentMode);
    }
    
    getTimeLimitForCurrentLevel() {
      const difficulty = this.getDifficultyForCurrentLevel();
      return GameModesConfig.utils.getTimeLimit(difficulty, this._currentMode);
    }
    
    // === STATISTIQUES ET MÉTRIQUES ===
    getSessionStats() {
      return {
        mode: this._currentMode,
        playerLevel: this._playerLevel,
        questionsAnswered: this._currentSessionQuestions.length,
        cacheSize: this._questionCache.size,
        loadedLevels: Array.from(this._loadedLevels),
        usedQuestions: this._usedQuestions.size
      };
    }
    
    // === RÉCOMPENSES ET ENCOURAGEMENTS ===
    getRewardForCorrectAnswer(question) {
      const modeConfig = GameModesConfig.modeSettings[this._currentMode];
      const basePoints = question.points || 10;
      const multiplier = GameModesConfig.rewards[this._currentMode].xpMultiplier;
      
      return {
        points: Math.floor(basePoints * multiplier),
        message: GameModesConfig.utils.getEncouragementMessage(this._currentMode),
        badge: GameModesConfig.utils.getBadgeForLevel(this._playerLevel, this._currentMode)
      };
    }
    
    // === COMPATIBILITÉ AVEC L'ANCIEN SYSTÈME ===
    // Méthodes pour maintenir la compatibilité avec quiz-database.js
    getAllQuestions() {
      console.warn('getAllQuestions() is deprecated. Use getQuestionForLevel() instead.');
      return this._getLegacyQuestions();
    }
    
    getRandomQuestion(excludeQuestions = []) {
      console.warn('getRandomQuestion() is deprecated. Use getQuestionForLevel() instead.');
      return this._getLegacyRandomQuestion(excludeQuestions);
    }
    
    // === MÉTHODES PRIVÉES ===
    _filterQuestionsByMode(questions, mode) {
      const modeConfig = GameModesConfig.modeSettings[mode];
      
      // Filtrer par catégories autorisées
      return questions.filter(q => {
        if (!modeConfig.categories.includes(q.category)) {
          return false;
        }
        
        // Exclure les questions de code si non autorisées
        if (q.type === 'code' && !modeConfig.hasCodeQuestions) {
          return false;
        }
        
        return true;
      });
    }
    
    _selectRandomQuestion(questions) {
      if (!questions || questions.length === 0) {
        return null;
      }
      
      const randomIndex = Math.floor(Math.random() * questions.length);
      const selectedQuestion = questions[randomIndex];
      
      // Marquer comme utilisée
      this._usedQuestions.add(this._getQuestionId(selectedQuestion));
      this._currentSessionQuestions.push(selectedQuestion);
      
      return selectedQuestion;
    }
    
    _getQuestionId(question) {
      return `${question.category}-${question.question.substring(0, 50)}`;
    }
    
    _clearCache() {
      this._questionCache.clear();
      this._loadedLevels.clear();
      this._usedQuestions.clear();
    }
    
    _getLegacyQuestions() {
      // Retourner un format compatible avec l'ancien système
      return [];
    }
    
    _getLegacyRandomQuestion(excludeQuestions) {
      // Logique de compatibilité
      return null;
    }
  }
  
  // Instance singleton
  const questionManager = new AdvancedQuestionManager();
  
  // === API PUBLIQUE ===
  return {
    // Instance principale
    manager: questionManager,
    
    // Méthodes de commodité
    setMode: (mode) => questionManager.setMode(mode),
    getCurrentMode: () => questionManager.getCurrentMode(),
    getQuestionForLevel: (level, mode) => questionManager.getQuestionForLevel(level, mode),
    getQuestionByCategory: (level, category, mode) => questionManager.getQuestionByCategory(level, category, mode),
    setPlayerLevel: (level) => questionManager.setPlayerLevel(level),
    getSessionStats: () => questionManager.getSessionStats(),
    
    // Constantes
    MODES: GameModesConfig.modes,
    
    // Utilitaires
    utils: {
      isCodeAllowed: (mode) => GameModesConfig.utils.isCodeAllowed(mode),
      getDifficultyForLevel: (level, mode) => GameModesConfig.utils.getDifficultyForLevel(level, mode),
      getTimeLimit: (difficulty, mode) => GameModesConfig.utils.getTimeLimit(difficulty, mode),
      getEncouragementMessage: (mode) => GameModesConfig.utils.getEncouragementMessage(mode)
    }
  };
})();

// Export par défaut
export default advanced_question_manager;