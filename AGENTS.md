# Idiom Quest RPG - Developer Context

This file provides context for coding agents working on the **Idiom Quest RPG** project.

## Project Overview
A 3D browser-based RPG built with React and Three.js where players explore a procedural world and battle monsters by answering Chinese idiom questions.

## Tech Stack & Environment
- **Framework**: React 18.2.0 (Functional Components + Hooks).
- **3D Engine**: Three.js (0.160.0) via `@react-three/fiber` and `@react-three/drei`.
- **Styling**: Tailwind CSS (v3 via CDN). No custom CSS files (except inline styles in `index.html`).
- **Icons**: `lucide-react`.
- **Build System**: ES Modules via browser `importmap`. No local bundler configuration (Webpack/Vite) is exposed; files are loaded directly.

## Directory Structure
The project root is flat. Do not create a `src/` directory.

- `index.tsx`: Entry point.
- `App.tsx`: Main game loop, state management, and 3D scene composition.
- `types.ts`: TypeScript interfaces for GameState, Idioms, and World entities.
- `metadata.json`: App metadata and permissions.
- `data/`: Static data files.
  - `idioms.ts`: Default dataset.
- `components/`: 2D UI React components.
  - `Button.tsx`: Generic button.
  - `HealthBar.tsx`: HP display.
  - `FloatingTextDisplay.tsx`: Damage numbers/feedback.

## Coding Conventions & Rules

### 1. File Paths & Imports
- **Root Directory**: Treat the current directory as the root.
- **Relative Imports**: Always use relative paths (e.g., `./components/Button`, not `src/components/Button`).
- **Extensions**: Do not include `.tsx` or `.ts` extensions in import statements within the code.

### 2. Styling
- **Tailwind CSS**: Use Tailwind utility classes for all 2D UI styling.
- **Animations**: Use standard CSS keyframes defined in `index.html` (`shake`, `float-up`) or Tailwind arbitrary values.
- **3D Styling**: Materials are defined programmatically in Three.js components (e.g., `meshStandardMaterial`).

### 3. State Management
- **Global State**: Managed in `App.tsx` using `useState` (`gameState`, `playerPos`, `worldMonsters`).
- **Refs**: Use `useRef` for 3D mutable objects (Three.js meshes) and AudioContext to avoid re-renders.
- **Persistence**: `localStorage` is used for `wrongIdioms` records.

### 4. 3D Logic (React Three Fiber)
- **Hooks**: Use `useFrame` for the render loop (animations, movement). Use `useThree` for camera/scene access.
- **Math**: Use `THREE.Vector3` and `Math` functions for movement and rotation logic.
- **Components**: Break 3D objects (Player, Monsters, Trees) into separate functional components within `App.tsx` or separate files if they grow too large.

### 5. Audio
- **Web Audio API**: Implemented directly in `App.tsx` via `window.AudioContext`.
- **Procedural Sound**: Sounds are generated synthetically (Oscillators/Noise buffers), not loaded from assets.

## Core Systems

### Movement
- **Input**: Handles Keyboard (`WASD`, Arrow Keys) and Virtual On-screen Controls.
- **Logic**: Physics-lite. Direct position updates in `useFrame` based on input state. Simple collision detection (distance check) against monsters.

### Battle System
- **Trigger**: Proximity to a monster sets `status` to `BATTLE`.
- **Flow**:
  1.  Question generated from `gameQueue`.
  2.  Player selects answer.
  3.  Feedback loop (Success/Fail).
  4.  Floating text animations.
  5.  Phase check (2 phases per monster).

### Data Model
- **Idiom Interface**:
  ```typescript
  interface Idiom {
    id: string;
    word: string; // The Chinese Idiom
    definition: string;
    example?: string;
  }
  ```
- **Custom Data**: Supports fetching remote JSON. Must be an array of objects containing `word` and `definition`.

## Known Constraints
- **Performance**: High object counts (trees/monsters) are rendered as individual meshes. No instanced mesh implementation currently.
- **Mobile**: Touch controls inject state via `(window as any).setVirtualControl`.
