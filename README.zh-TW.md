# 📜 Idiom Quest RPG 3D (成語征途) - 繁體中文

[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **當 Roblox 遇上成語學習！** 這是一個基於 React 與 Three.js 開發的 3D 角色扮演遊戲。玩家將在廣大且充滿活力的 Roblox 風格世界中探索，透過與怪物的戰鬥來精通成語。

---

## 🌟 核心特色

### 🎮 沈浸式 3D 學習體驗
- **Roblox 風格世界**：使用 `react-three-fiber` 打造的低多邊形 (Low-poly) 3D 環境，支援動態視角旋轉與平滑的角色移動。
- **動態戰鬥系統**：遇到怪物即進入回合制戰鬥，透過選擇正確的成語釋放「致命一擊」。
- **專業慶祝特效**：勝利時將觸發 8 人啦啦隊編隊走位舞蹈與物理粒子煙火，儀式感十足。

### 🧠 智慧教育設計
- **雙重挑戰模式**：
  - **模式一**：釋義選成語（強化理解力）。
  - **模式二**：成語選釋義（強化邏輯力）。
- **錯題庫系統**：自動記錄錯誤成語，並在下次探索中提高出現頻率，實現精準複習。
- **詳盡解析**：每個關卡後附帶例句教學，確保玩家不只是選對，更能掌握用法。

### 🛠️ 高度擴展性 (Custom Data Support)
- **自定義題庫**：支援遠端 JSON URL 匯入，教師或家長可以輕鬆製作專屬的成語清單。
- **最近記錄記憶**：自動保存曾使用過的自定義 URL，一鍵切換不同課程。

---

## 🕹️ 遊戲操作

### 基本移動
- **W / A / S / D**：控制角色行走方向。
- **方向鍵 (↑ / ↓ / ← / →)**：調整相機視角與俯仰角度。
- **虛擬按鈕**：在行動裝置上使用螢幕左下角與右下角的按鈕進行操作。

### 戰鬥與複習
- **觸碰怪物**：觸發戰鬥介面。
- **圖書圖示**：隨時進入「成語藏經閣」複習先前答錯的內容。

---

## 🛠️ 技術架構

本專案採用最前沿的前端技術棧，專注於高效能渲染與流暢的使用者體驗：

| 組件 | 技術選擇 |
| :--- | :--- |
| **3D 引擎** | `@react-three/fiber` + `@react-three/drei` |
| **物理與動畫** | `Three.js` Lerp 走位算法 + Procedural Animation |
| **介面 UI** | `Tailwind CSS` + `Lucide-React` Icons |
| **音效系統** | Web Audio API (程序化合成爆炸音效) |
| **資料管理** | React Hooks + LocalStorage 永久化存儲 |

---

## 📦 快速開始

1. **環境需求**
   - Node.js (v18+)
   - npm / yarn

2. **安裝步驟**
   ```bash
   # 安裝依賴
   npm install

   # 啟動開發伺服器
   npm run dev
   ```

---

## 📄 授權協議

本專案採用 **MIT License** 授權。