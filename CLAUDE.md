# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Game
- **Local Development**: Serve the project with a local HTTP server (e.g., `python -m http.server 8000` or Live Server extension)
- **Entry Point**: Open `index.html` in browser after starting local server
- **No Build Process**: Direct ES6 module loading, no compilation required

## Architecture Overview

### Entity-Component System (ECS)
The game uses a clean ECS architecture centered around three core classes:

- **Entity** (`src/entity.js`): Base container that holds components and manages messaging
- **Component** (`src/entity.js`): Base class for all game functionality (health, rendering, input, etc.)  
- **EntityManager** (`src/entity-manager.js`): Central registry handling entity lifecycle and global updates

Components communicate via message broadcasting using the `Broadcast()` method. New functionality should be implemented as components following this pattern.

### Core Game Loop
Located in `src/main.js`, the `HackNSlashDemo` class manages:
- Three.js scene setup and rendering
- EntityManager updates via `_RAF()` method
- Camera, lighting, and world initialization

### State Management
- **Finite State Machine** (`src/finite-state-machine.js`): Generic FSM implementation
- **Player States** (`src/player-state.js`): Handles player character states (idle, walk, run, attack, death)
- Character behavior is controlled through FSM state transitions

### Spatial Systems
- **Spatial Hash Grid** (`src/spatial-hash-grid.js`): Optimizes collision detection and entity queries
- **Spatial Grid Controller** (`src/spatial-grid-controller.js`): Component wrapper for spatial functionality
- Critical for performance with 50+ NPCs and collision detection

### Key Game Systems
- **Health System** (`src/health-component.js`): HP, stats, experience, and leveling
- **Inventory System** (`src/inventory-controller.js`): Item management and equipment  
- **Combat System** (`src/attacker-controller.js`): Attack timing and damage mechanics
- **Quest System** (`src/quest-component.js`): Quest progression and management
- **UI System** (`src/ui-controller.js`): Pure DOM manipulation, no framework

### 3D Rendering Pipeline  
- **GLTF Component** (`src/gltf-component.js`): Handles 3D model loading (GLB, GLTF, FBX)
- **Animation System**: Three.js AnimationMixer integration for character animations
- **Asset Organization**: Resources organized by type (monsters, nature, weapons, etc.)

## Adding New Features

### Creating New Components
1. Extend the `Component` base class in `src/entity.js`
2. Implement required methods: `InitComponent()`, `Update()`, `Destroy()`
3. Use `this.Broadcast()` for component communication
4. Register with entities using `entity.AddComponent()`

### Adding New Entities
1. Create entity via `EntityManager.Get(name)`
2. Add required components (GLTF for rendering, HealthComponent, etc.)
3. Set initial position and parameters
4. Components will be automatically updated by EntityManager

### UI Extensions
- Modify `src/ui-controller.js` for new UI panels
- Update corresponding HTML in `index.html`
- Use DOM manipulation patterns consistent with existing code

## Technical Constraints

- **No Build System**: All modules loaded directly via ES6 imports
- **Three.js Dependency**: Loaded from CDN, version specified in `index.html`
- **Browser-Only**: No Node.js dependencies or server-side code
- **Static Assets**: All 3D models and textures served statically from `resources/`