# 📜 Idiom Quest RPG 3D - English Version

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **When Roblox meets Idiom Learning!** An immersive 3D RPG developed with React and Three.js. Explore a vibrant Roblox-style world and master Chinese idioms through epic monster battles.

---

## 🌟 Key Features

### 🎮 Immersive 3D Learning
- **Roblox-Style World**: A low-poly 3D environment built with `react-three-fiber`, featuring dynamic camera rotation and smooth character movement.
- **Dynamic Battle System**: Encounter monsters to trigger turn-based combat. Deliver "Critical Hits" by selecting the correct idiom.
- **Celebration Effects**: Victory triggers an 8-person cheerleader squad dance with procedural particle fireworks for a grand sense of achievement.

### 🧠 Smart Educational Design
- **Dual Challenge Modes**:
  - **Mode 1**: Definition to Idiom (Strengthens comprehension).
  - **Mode 2**: Idiom to Definition (Strengthens logical matching).
- **Wrong Records System**: Automatically logs missed idioms and increases their frequency in future explorations for targeted review.
- **Detailed Analysis**: Includes example sentences after each stage to ensure mastery of usage.

### 🛠️ High Extensibility (Custom Data)
- **Custom Question Banks**: Supports importing remote JSON URLs. Teachers or parents can easily create custom idiom lists.
- **History Memory**: Automatically saves recently used custom URLs for quick switching.

---

## 🕹️ Controls

### Basic Movement
- **W / A / S / D**: Control character movement.
- **Arrow Keys (↑ / ↓ / ← / →)**: Adjust camera angle and pitch.
- **Virtual Buttons**: On-screen controls for mobile devices (bottom-left and bottom-right).

### Combat & Review
- **Touch Monster**: Trigger battle interface.
- **Library Icon**: Access the review gallery for idioms you missed previously.

---

## 🛠️ Tech Stack

This project utilizes cutting-edge web technologies for high-performance rendering and smooth UX:

| Component | Technology |
| :--- | :--- |
| **3D Engine** | `@react-three/fiber` + `@react-three/drei` |
| **Physics/Animation** | `Three.js` Lerp algorithms + Procedural Animation |
| **UI Interface** | `Tailwind CSS` + `Lucide-React` Icons |
| **Audio System** | Web Audio API (Procedurally synthesized sounds) |
| **Data Management** | React Hooks + LocalStorage Persistence |

---

## 📦 Quick Start

1. **Requirements**
   - Node.js (v18+)
   - npm / yarn

2. **Installation**
   ```bash
   # Install dependencies
   npm install

   # Start dev server
   npm run dev
   ```

---

## 📄 License

This project is licensed under the **MIT License**.