# Système Audio IA001 - Documentation d'Implémentation

## Vue d'ensemble

Le système audio pour IA001 a été implémenté pour fournir une expérience sonore immersive avec trois types de sons :

- **Walk** : Son de marche joué en boucle quand IA001 se déplace
- **Fight** : Son de combat joué en boucle pendant les combats
- **Die** : Son de mort joué quand IA001 a moins de 20 points de vie

## Fichiers Créés/Modifiés

### Nouveaux Fichiers

#### `src/ia001-audio-system.js`
Système audio dédié à IA001 qui gère :
- Chargement automatique des sons depuis `resources/ia001/audios/`
- Gestion des états audio (marche, combat, mort)
- Audio spatial 3D avec position d'IA001
- Logique de déclenchement basée sur la santé et l'état

#### `resources/ia001/audios/audio.json` (corrigé)
Fichier de configuration JSON contenant les chemins vers les fichiers audio :
```json
{
    "walk": "./walk.mp3",
    "fight": "./fight.mp3",
    "die": "./die.mp3"
}
```

### Fichiers Modifiés

#### `src/npc-entity.js`
- Ajout de l'import `ia001_audio_system`
- Initialisation du système audio dans `InitComponent()` pour IA001
- Mise à jour de l'état audio dans la méthode `Update()`
- Intégration avec les états de mouvement et de combat

#### `src/main.js`
- Ajout de l'import `ia001_audio_system` pour rendre le module disponible

## Logique de Fonctionnement

### Sons de Marche
- **Déclenchement** : Quand IA001 est en état 'walk' et pas en combat
- **Arrêt** : Quand IA001 s'arrête ou entre en combat
- **Fréquence** : Répété toutes les 1.5 secondes
- **Volume** : 0.3 (30%)

### Sons de Combat
- **Déclenchement** : Quand IA001 entre en combat (système de combat actif)
- **Arrêt** : Quand le combat se termine
- **Mode** : Boucle continue
- **Volume** : 0.5 (50%)
- **Priorité** : Arrête tous les autres sons

### Sons de Mort
- **Déclenchement** : Quand la santé d'IA001 passe sous 20 points
- **Condition** : Se joue une seule fois, juste avant le dernier coup
- **Mode** : Son unique (pas de boucle)
- **Volume** : 0.7 (70%)
- **Priorité** : Arrête tous les autres sons et empêche les nouveaux

## Intégration avec le Système Existant

### Audio Spatial
- Utilise le système `spatial-audio-system.js` existant
- Position 3D basée sur la position d'IA001 dans le monde
- Audio directionnel avec distance et atténuation

### États de Jeu
- **Mouvement** : Détecté via l'état de la machine à états (`walk`)
- **Combat** : Détecté via le `CombatSystem.IsInCombat`
- **Santé** : Surveillée en continu pour détecter le seuil critique

### Gestion des Ressources
- Préchargement automatique des sons au démarrage
- Nettoyage automatique lors de la destruction du composant
- Gestion des erreurs de chargement

## Utilisation

### Automatique
Le système fonctionne automatiquement une fois IA001 créé :
1. Les sons sont préchargés au démarrage
2. L'état audio est mis à jour à chaque frame
3. Les transitions sont gérées automatiquement

### Débogage
Messages de console pour suivre l'état :
- `🔊 Système audio IA001 initialisé`
- `✅ Tous les sons IA001 préchargés`
- `🎵 Son de combat IA001 démarré`
- `💀 Son de mort IA001 joué`
- `⚠️ IA001 santé critique, son de mort déclenché`

## Extension Future

Ce système peut être facilement étendu pour d'autres ennemis :

1. **Créer un dossier audio** : `resources/[enemy-name]/audios/`
2. **Ajouter les fichiers** : `walk.mp3`, `fight.mp3`, `die.mp3`, `audio.json`
3. **Créer un système audio** : Copier et adapter `ia001-audio-system.js`
4. **Intégrer dans l'entité** : Ajouter le système dans le contrôleur NPC

## Fichiers Audio Requis

Pour que le système fonctionne, ces fichiers doivent être présents :
- `resources/ia001/audios/walk.mp3`
- `resources/ia001/audios/fight.mp3`
- `resources/ia001/audios/die.mp3`
- `resources/ia001/audios/audio.json`

## Configuration

### Volumes par Défaut
- Marche : 30%
- Combat : 50%
- Mort : 70%

### Timings
- Répétition marche : 1.5 secondes
- Seuil de mort : < 20 points de vie

### Audio Spatial
- Modèle de panoramique : HRTF
- Modèle de distance : inverse
- Distance de référence : 1 unité
- Distance maximale : 10000 unités

Ce système offre une expérience audio riche et immersive pour IA001, avec une architecture extensible pour les futurs ennemis du jeu.