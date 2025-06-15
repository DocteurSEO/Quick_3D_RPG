import { PerformanceConfig, adjustPerformanceSettings } from './performance-config.js';

export class FPSMonitor {
  constructor() {
    this.fps = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fpsHistory = [];
    this.maxHistoryLength = 60; // Garder 60 échantillons
    this.updateInterval = 1000; // Mettre à jour chaque seconde
    this.lastUpdate = 0;
    
    // Éléments UI
    this.fpsDisplay = null;
    this.createFPSDisplay();
    
    // Auto-ajustement
    this.autoAdjustCounter = 0;
    this.autoAdjustInterval = 300; // Ajuster tous les 5 secondes (300 frames à 60fps)
  }
  
  createFPSDisplay() {
    if (!PerformanceConfig.monitoring.enabled) return;
    
    this.fpsDisplay = document.createElement('div');
    this.fpsDisplay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
      z-index: 1000;
      pointer-events: none;
    `;
    document.body.appendChild(this.fpsDisplay);
  }
  
  update() {
    const currentTime = performance.now();
    this.frameCount++;
    
    // Calculer le FPS
    if (currentTime - this.lastUpdate >= this.updateInterval) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastUpdate));
      this.frameCount = 0;
      this.lastUpdate = currentTime;
      
      // Ajouter à l'historique
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift();
      }
      
      // Mettre à jour l'affichage
      this.updateDisplay();
    }
    
    // Auto-ajustement des performances
    this.autoAdjustCounter++;
    if (this.autoAdjustCounter >= this.autoAdjustInterval) {
      this.autoAdjustPerformance();
      this.autoAdjustCounter = 0;
    }
  }
  
  updateDisplay() {
    if (!this.fpsDisplay) return;
    
    const avgFPS = this.getAverageFPS();
    const minFPS = this.getMinFPS();
    
    let color = '#00ff00'; // Vert
    if (this.fps < 45) color = '#ffff00'; // Jaune
    if (this.fps < 30) color = '#ff0000'; // Rouge
    
    this.fpsDisplay.innerHTML = `
      FPS: <span style="color: ${color}">${this.fps}</span><br>
      Avg: ${avgFPS}<br>
      Min: ${minFPS}
    `;
  }
  
  getAverageFPS() {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }
  
  getMinFPS() {
    if (this.fpsHistory.length === 0) return 0;
    return Math.min(...this.fpsHistory);
  }
  
  autoAdjustPerformance() {
    if (!PerformanceConfig.monitoring.autoAdjust) return;
    
    const avgFPS = this.getAverageFPS();
    if (avgFPS > 0 && avgFPS < PerformanceConfig.monitoring.fpsThreshold) {
      adjustPerformanceSettings(avgFPS);
      
      // Réinitialiser l'historique après ajustement
      this.fpsHistory = [];
    }
  }
  
  getCurrentFPS() {
    return this.fps;
  }
  
  getPerformanceInfo() {
    return {
      currentFPS: this.fps,
      averageFPS: this.getAverageFPS(),
      minFPS: this.getMinFPS(),
      isPerformanceGood: this.getAverageFPS() >= PerformanceConfig.monitoring.fpsThreshold
    };
  }
  
  destroy() {
    if (this.fpsDisplay && this.fpsDisplay.parentNode) {
      this.fpsDisplay.parentNode.removeChild(this.fpsDisplay);
    }
  }
}