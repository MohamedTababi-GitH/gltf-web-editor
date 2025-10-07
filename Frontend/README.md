# ⚙️ ECAD 3D Model Viewer — Frontend

A modern **React + TypeScript** web application for viewing, inspecting, and interacting with **3D ECAD models** in real
time.
This frontend leverages **Babylon.js** for 3D rendering, **Redux Toolkit** for state management, and **Tailwind CSS**
for clean, responsive design.

---

## 🚀 Tech Stack

| Category               | Technologies                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)                             |
| **3D Rendering**       | [Babylon.js](https://www.babylonjs.com/) + [react-babylonjs](https://github.com/brianzinn/react-babylonjs) |
| **Styling**            | [Tailwind CSS 4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)                         |
| **State Management**   | [Redux Toolkit](https://redux-toolkit.js.org/)                                                             |
| **Routing**            | [React Router 7](https://reactrouter.com/)                                                                 |
| **Tooling**            | [Vite](https://vitejs.dev/), [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)               |

---

## 🧱 Project Structure

```
frontend/
├── public/               # Static assets
├── src/
│   ├── components/       # Reusable UI components
│   ├── features/         # Redux slices and logic
│   ├── pages/            # Page-level components (Viewer, Dashboard, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── store.ts          # Redux store setup
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## ⚡ Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) **v18+**
- [npm](https://www.npmjs.com/) **v9+** (or [pnpm](https://pnpm.io/) / [yarn](https://yarnpkg.com/))

---

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Kekschorstviy/gltf-web-editor.git
cd Frontend
npm install
```

---

### 3. Development Server

Start the local dev environment:

```bash
npm run dev
```

This will:

- Run **Prettier** and **ESLint** checks
- Launch Vite’s dev server
- Open the app at [http://localhost:5173](http://localhost:5173)

---

### 4. Production Build

Create an optimized production build:

```bash
npm run build
```

Preview the production output:

```bash
npm run preview
```

---

### 5. Linting & Formatting

Run code quality checks manually:

```bash
npm run lint
```

Prettier auto-format check:

```bash
npx prettier -c .
```

---

## 🧩 Key Features

- 🌀 **Interactive 3D Model Viewer** built on Babylon.js
- 🧭 **Camera controls** for zoom, pan, and orbit
- 🧱 **Model loading support** via common ECAD file formats (e.g., `.glb`, `.glTF`)
- ⚙️ **Layer and part toggling** for detailed inspection
- 🧠 **Redux-based state management**
- 🎨 **Tailwind + Radix UI components** for clean, accessible interfaces
- 🔧 **Strict TypeScript setup** with ESLint & Prettier integration

---

## 🧠 Development Guidelines

- **Use TypeScript** for all code.
- **Keep components modular** — place them under `src/components/`.
- **Maintain consistent styling** using Tailwind utilities.
- **Validate 3D models** for compatibility before importing.
- **Commit frequently** with meaningful messages.

---

## 🧰 Useful Commands

| Command             | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Run the app in development mode      |
| `npm run build`     | Create a production build            |
| `npm run preview`   | Preview the production build locally |
| `npm run lint`      | Run ESLint checks                    |
| `npx prettier -c .` | Verify code formatting               |

---

## 🧭 Roadmap

- [ ] Support for multiple 3D file formats
- [ ] Model annotation and measurement tools
- [ ] Viewer themes (light/dark)
- [ ] Performance profiling for large models

---

## 🤝 Contributing

1. Create a new branch: `feature/your-feature-name`
2. Commit your changes
3. Submit a pull request

---

## 👥 Authors

**ECAD Viewer Team**
Built with ❤️ using React, Babylon.js, and TypeScript.
