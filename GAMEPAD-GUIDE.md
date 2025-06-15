# Guide d'utilisation des manettes de jeu 🎮

## Compatibilité

Le jeu supporte maintenant les manettes de jeu grâce à l'API Gamepad du navigateur. Les manettes compatibles incluent :

- **Xbox One/Series X|S** (filaire et sans fil)
- **PlayStation 4/5** (DualShock 4, DualSense)
- **Nintendo Switch Pro Controller**
- **Manettes génériques** compatibles avec l'API Gamepad

## Configuration requise

- **Navigateur moderne** supportant l'API Gamepad (Chrome, Firefox, Edge, Safari récents)
- **Connexion USB** ou **Bluetooth** pour les manettes sans fil
- **Drivers** appropriés installés (généralement automatiques)

## Connexion de la manette

### Manette filaire
1. Connectez votre manette via USB
2. Le jeu détectera automatiquement la manette
3. Une notification apparaîtra en haut à droite de l'écran

### Manette sans fil (Bluetooth)
1. Activez le mode appairage sur votre manette :
   - **Xbox** : Maintenez le bouton Xbox + bouton de connexion
   - **PlayStation** : Maintenez PS + Share pendant 3 secondes
   - **Switch Pro** : Maintenez le bouton de synchronisation
2. Connectez via les paramètres Bluetooth de votre système
3. Actualisez la page du jeu si nécessaire

## Contrôles par défaut

### Mouvement (Hors combat)
- **Stick analogique gauche** : Déplacement du personnage
- **D-Pad (croix directionnelle)** : Déplacement alternatif
  - ⬆️ Haut : Avancer
  - ⬇️ Bas : Reculer
  - ⬅️ Gauche : Aller à gauche
  - ➡️ Droite : Aller à droite

### Actions
- **A/X (bouton du bas)** : Action/Interaction (hors combat) / Valider choix (dans les menus) (équivalent Espace)
- **B/Circle** : Retour/Annuler (dans les menus)
- **RB/R1 ou RT/R2** : Sprint (hors combat uniquement) (équivalent Shift)

### Navigation dans les menus de combat et quiz
- **Stick analogique gauche** : Navigation dans les options
- **D-Pad (croix directionnelle)** : Navigation alternative dans les options
- **A/X (bouton du bas)** : Confirmer la sélection
- **B/Circle** : Retour au menu précédent

### Menu principal
- **Start/Options** : Menu/Pause (équivalent Échap)

### Stick analogique droit
- Actuellement non utilisé (réservé pour de futures fonctionnalités)

## Fonctionnalités avancées

### Zone morte (Deadzone)
- **Par défaut** : 15% (évite les mouvements involontaires)
- **Ajustable** via la console développeur :
  ```javascript
  // Exemple pour définir une zone morte de 20%
  gamepadController.setDeadzone(0.2);
  ```

### Détection automatique
- Le système détecte automatiquement la connexion/déconnexion
- Compatible avec plusieurs manettes simultanément
- Notifications visuelles pour les changements d'état

## Dépannage

### La manette n'est pas détectée
1. **Vérifiez la connexion** (USB bien branché, Bluetooth connecté)
2. **Testez dans un autre jeu** ou sur [gamepad-tester.com](https://gamepad-tester.com)
3. **Actualisez la page** du navigateur
4. **Redémarrez le navigateur** si nécessaire
5. **Vérifiez les drivers** de votre manette

### Mouvements erratiques
- **Augmentez la zone morte** si le personnage bouge tout seul
- **Nettoyez les sticks** analogiques si ils sont poussiéreux
- **Calibrez la manette** dans les paramètres système

### Latence ou retard
- **Utilisez une connexion filaire** pour réduire la latence
- **Fermez les autres applications** utilisant la manette
- **Vérifiez les performances** du navigateur (F12 > Performance)

## Compatibilité navigateur

| Navigateur | Support | Notes |
|------------|---------|-------|
| Chrome | ✅ Excellent | Support complet |
| Firefox | ✅ Excellent | Support complet |
| Edge | ✅ Excellent | Support complet |
| Safari | ⚠️ Partiel | Nécessite macOS 14.4+ |
| Mobile | ❌ Non supporté | API Gamepad non disponible |

## Développement et debug

### Console développeur
Ouvrez la console (F12) pour voir les messages de debug :
```
🎮 Manette connectée: Xbox Wireless Controller (index: 0)
🎮 Simulated keydown: KeyW
🎮 Zone morte définie à: 0.15
```

### API disponibles
```javascript
// Vérifier si une manette est connectée
gamepadController.isGamepadConnected()

// Obtenir la liste des manettes
gamepadController.getConnectedGamepads()

// Modifier la zone morte
gamepadController.setDeadzone(0.2)
```

## Intégration technique

Le système de manettes s'intègre parfaitement avec l'architecture existante :

- **Simulation clavier** : Les entrées manette sont converties en événements clavier
- **Système de messaging** : Broadcasting des événements via `input.gamepad`
- **Compatibilité mobile** : Fonctionne en parallèle des contrôles tactiles
- **Performance** : Utilise `requestAnimationFrame` pour un polling optimal

## Futures améliorations

- 🔄 **Vibration/Rumble** : Retour haptique pour les actions
- 🎯 **Stick droit** : Contrôle de la caméra
- ⚙️ **Configuration** : Interface pour personnaliser les contrôles
- 🎮 **Profils** : Sauvegarde des préférences par manette
- 📱 **Mobile** : Support des manettes Bluetooth sur mobile

---

**Note** : Cette fonctionnalité utilise l'API Gamepad standard du W3C et ne nécessite aucun plugin ou extension supplémentaire.