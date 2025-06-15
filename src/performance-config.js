// Configuration des optimisations de performance
export const PerformanceConfig = {
  // Rendu 3D - Configuration haute performance
  rendering: {
    maxFPS: 120, // Augmenté pour les écrans haute fréquence
    antialias: true,
    shadows: true,
    shadowMapSize: 4096, // Qualité d'ombres maximale
    pixelRatio: Math.min(window.devicePixelRatio, 3), // Support des écrans haute résolution
    fog: true,
    conditionalRendering: false
  },

  // Système de particules - Configuration haute performance
  particles: {
    maxParticles: 2000, // Quadruplé pour plus d'effets visuels
    sortFrequency: 1, // Tri chaque frame pour la qualité maximale
    updateOptimization: false // Désactivé pour la fluidité maximale
  },

  // Contrôleur de joueur - Configuration haute performance
  player: {
    combatCheckFrequency: 1, // Vérification combat chaque frame
    collisionCheckFrequency: 1, // Vérifier les collisions chaque frame
    updateFrequencyInCombat: 1, // Mise à jour chaque frame en combat
    positionBroadcastOptimization: false // Désactivé pour la fluidité maximale
  },

  // Caméra - Configuration haute performance
  camera: {
    updateFrequency: 1, // Mise à jour chaque frame
    positionThreshold: 0.0001, // Seuil ultra-précis
    optimizeWhenIdle: false, // Désactivé pour la fluidité maximale
    interpolationFactor: 0.15 // Interpolation plus rapide
  },

  // Animations - Configuration haute performance
  animations: {
    updateFrequency: 1, // Mise à jour chaque frame
    compensateTime: false, // Pas de compensation temporelle
    highQualityBlending: true, // Mélange d'animations haute qualité
    precisionMode: true // Mode précision pour les animations fluides
  },

  // Détection des appareils peu puissants
  lowEndDevice: {
    memoryThreshold: 2, // GB (réduit pour détecter moins d'appareils comme "low-end")
    gpuBlacklist: [
      'intel hd 3000', 'intel hd 4000', 'adreno 420', 'adreno 430',
      'mali-t720', 'mali-t760', 'powervr sgx'
    ]
  },

  // Monitoring des performances
  monitoring: {
    enabled: false, // Désactivé pour masquer l'affichage FPS
    fpsThreshold: 30, // En dessous de 30 FPS, réduire la qualité
    autoAdjust: true // Ajuster automatiquement les paramètres
  }
};

// Fonction pour ajuster automatiquement les paramètres selon les performances
export function adjustPerformanceSettings(currentFPS) {
  if (!PerformanceConfig.monitoring.autoAdjust) return;
  
  if (currentFPS < PerformanceConfig.monitoring.fpsThreshold) {
    // Réduire la qualité
    PerformanceConfig.particles.maxParticles = Math.max(100, PerformanceConfig.particles.maxParticles * 0.8);
    PerformanceConfig.rendering.shadowMapSize = Math.max(512, PerformanceConfig.rendering.shadowMapSize * 0.8);
    PerformanceConfig.player.updateFrequencyInCombat = Math.min(4, PerformanceConfig.player.updateFrequencyInCombat + 1);
    PerformanceConfig.camera.updateFrequency = Math.min(4, PerformanceConfig.camera.updateFrequency + 1);
    PerformanceConfig.animations.updateFrequency = Math.min(4, PerformanceConfig.animations.updateFrequency + 1);
    
    console.log('Performance ajustée automatiquement - FPS:', currentFPS);
  }
}

// Fonction pour détecter un appareil faible
export function isLowEndDevice() {
  // Vérifier la mémoire
  if (navigator.deviceMemory && navigator.deviceMemory < PerformanceConfig.lowEndDevice.memoryThreshold) {
    return true;
  }
  
  // Vérifier le GPU
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (gl) {
    const renderer = gl.getParameter(gl.RENDERER).toLowerCase();
    for (const gpu of PerformanceConfig.lowEndDevice.gpuBlacklist) {
      if (renderer.includes(gpu)) {
        return true;
      }
    }
  }
  
  return false;
}

// Fonction pour appliquer les paramètres d'appareil faible
export function applyLowEndSettings() {
  PerformanceConfig.rendering.antialias = false;
  PerformanceConfig.rendering.shadows = false;
  PerformanceConfig.rendering.shadowMapSize = 1024;
  PerformanceConfig.rendering.fog = false;
  PerformanceConfig.rendering.maxFPS = 60;
  PerformanceConfig.particles.maxParticles = 500;
  PerformanceConfig.player.combatCheckFrequency = 5;
  PerformanceConfig.camera.updateFrequency = 2;
  PerformanceConfig.animations.updateFrequency = 2;
  
  console.log('Paramètres d\'appareil faible appliqués');
}