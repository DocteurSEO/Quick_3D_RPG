# Guide du Système d'Audio Spatial

## 🎵 Vue d'ensemble

Le système d'audio spatial a été ajouté au jeu RPG pour offrir une expérience audio immersive. Il utilise la **Web Audio API** native du navigateur avec support de l'audio 3D et des effets spatiaux.

## 🚀 Fonctionnalités

### Audio Spatial 3D
- **Positionnement 3D** : Les sons peuvent être placés dans l'espace 3D
- **Orientation du listener** : L'audio s'adapte à la position et orientation du joueur
- **Atténuation par distance** : Les sons deviennent plus faibles avec la distance
- **Effet HRTF** : Simulation réaliste de l'audio spatial pour les écouteurs

### Intégration dans le Combat
- **Son de victoire** : Lecture du fichier `resources/audios/victoire/01.mp3` à la position du monstre vaincu
- **Audio spatial automatique** : La position du joueur est automatiquement trackée pendant le combat
- **Fallback** : Retour vers l'ancien système si l'audio spatial échoue

## 📁 Fichiers Ajoutés

### `src/spatial-audio-system.js`
Système principal d'audio spatial avec les fonctionnalités :
- Chargement et gestion des fichiers audio
- Positionnement 3D des sons
- Contrôle du volume et des effets
- Gestion du listener (position du joueur)

### `src/spatial-audio-demo.js`
Interface de démonstration pour tester l'audio spatial :
- Contrôles interactifs
- Test du son de victoire
- Animation circulaire de sons
- Réglages de position et volume

## 🎮 Utilisation

### Dans le Jeu
L'audio spatial fonctionne automatiquement :
1. **Démarrer un combat** : Le système s'initialise
2. **Gagner le combat** : Le son de victoire joue à la position du monstre
3. **Se déplacer** : L'audio s'adapte à votre position

### Démonstration
Pour tester le système indépendamment :
```javascript
// Dans la console du navigateur
startSpatialAudioDemo();
```

Cela ouvre une interface avec :
- Bouton pour jouer le son de victoire
- Animation de son circulaire
- Contrôles de position et volume

## 🔧 Configuration Technique

### Paramètres Audio
```javascript
{
  panningModel: 'HRTF',        // Algorithme spatial (HRTF ou equalpower)
  distanceModel: 'inverse',     // Modèle d'atténuation
  refDistance: 1,               // Distance de référence
  maxDistance: 10000,           // Distance maximale
  rolloffFactor: 1,             // Facteur d'atténuation
  coneInnerAngle: 360,          // Angle interne du cône
  coneOuterAngle: 360,          // Angle externe du cône
  coneOuterGain: 0              // Gain externe du cône
}
```

### Formats Audio Supportés
- **MP3** ✅ (utilisé pour le son de victoire)
- **WAV** ✅
- **OGG** ✅
- **WEBM** ✅
- **AAC** ✅

## 🎧 Recommandations

### Pour une Meilleure Expérience
1. **Utilisez des écouteurs** : L'effet spatial est plus prononcé
2. **Volume approprié** : Réglez le volume pour entendre les nuances
3. **Navigateur moderne** : Chrome, Firefox, Safari récents

### Compatibilité
- ✅ **Chrome 66+**
- ✅ **Firefox 60+**
- ✅ **Safari 14+**
- ✅ **Edge 79+**
- ⚠️ **Mobile** : Support variable selon l'appareil

## 🔍 Débogage

### Messages Console
- `🔊 Système d'audio spatial initialisé` : Initialisation réussie
- `✅ Audio chargé: victory` : Fichier audio chargé
- `🏆 Jouer son de victoire à position (x, y, z)` : Son de victoire joué
- `❌ Erreur lors de l'initialisation` : Problème d'initialisation

### Problèmes Courants

#### Audio ne fonctionne pas
1. Vérifiez que le fichier `resources/audios/victoire/01.mp3` existe
2. Assurez-vous que l'interaction utilisateur a eu lieu (clic requis)
3. Vérifiez les paramètres audio du navigateur

#### Pas d'effet spatial
1. Testez avec des écouteurs
2. Vérifiez que HRTF est supporté
3. Essayez la démo pour isoler le problème

## 🛠️ Développement

### Ajouter de Nouveaux Sons
```javascript
// Charger un nouveau fichier audio
await spatialAudio.LoadAudio('nom_du_son', '/chemin/vers/fichier.mp3');

// Jouer le son à une position
spatialAudio.PlaySpatialSound('nom_du_son', x, y, z, {
  volume: 0.8,
  refDistance: 2
});
```

### Personnaliser les Effets
```javascript
// Son avec configuration personnalisée
spatialAudio.PlaySpatialSound('effet', x, y, z, {
  panningModel: 'equalpower',
  distanceModel: 'linear',
  rolloffFactor: 0.5,
  volume: 0.6
});
```

## 📚 Ressources

### Documentation Web Audio API
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) <mcreference link="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API" index="2">2</mcreference>
- [Spatialization Basics](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics) <mcreference link="https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics" index="1">1</mcreference>

### Bibliothèques Alternatives
- [Howler.js](https://howlerjs.com/) <mcreference link="https://howlerjs.com/" index="4">4</mcreference> : Bibliothèque audio simplifiée avec support spatial
- [Tone.js](https://tonejs.github.io/) : Pour la synthèse audio avancée

## 🎯 Prochaines Étapes

### Améliorations Possibles
1. **Plus de sons spatiaux** : Ajouter des effets pour différentes actions
2. **Musique d'ambiance** : Audio spatial pour l'environnement
3. **Effets de réverbération** : Simulation d'espaces acoustiques
4. **Audio procédural** : Génération de sons basée sur les actions

### Optimisations
1. **Préchargement intelligent** : Charger les sons selon le contexte
2. **Pool d'objets audio** : Réutiliser les sources audio
3. **Compression audio** : Optimiser la taille des fichiers
4. **Streaming audio** : Pour les fichiers volumineux

---

*Ce système d'audio spatial améliore significativement l'immersion du jeu en utilisant les technologies web modernes pour créer une expérience audio 3D réaliste.*