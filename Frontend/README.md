# Frontend Developer Onboarding Guide

Welcome to the team! This document is designed to get you set up and running with the frontend application as quickly as possible.

## 1. Technical Stack & Environment
This project runs on a bleeding-edge stack. Ensure your environment matches the specific version requirements to avoid compilation issues.

| Component        | Technology     | Version / Note                                               |
|:-----------------|:---------------|:-------------------------------------------------------------|
| **Runtime**      | Node.js        | **v23+** (Strict requirement due to latest Vite/TS features) |
| **Framework**    | React          | **v19** (Leveraging latest concurrent features)              |
| **Build System** | Vite           | **v7**                                                       |
| **Language**     | TypeScript     | **v5.9** (Strict mode enabled)                               |
| **Styling**      | Tailwind CSS   | **v4** (Using `@theme` and native CSS variables)             |
| **3D Engine**    | Three.js / R3F | WebGL 2.0 Hardware Acceleration **Required**                 |

---

## 2. Prerequisites

Before you begin, ensure your development environment has the following:

* **Node.js:** v23.9.0+
* **Package Manager:** `npm` (included with Node.js).
* **Browser:** A modern browser (Chrome/Firefox/Edge) with **Hardware Acceleration enabled**.
    * *Note: Since this application relies heavily on WebGL for the `ModelViewer`, performance will degrade significantly if hardware acceleration is disabled.*

---

## 3. Getting Started

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <project-folder>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Environment Configuration

The application requires connection to a backend service.

1.  Create a `.env` file in the root directory.
2.  Add the following variable:
    ```properties
    VITE_BACKEND_URL=http://your-backend-url
    ```
    *(Ask a team lead for the current development backend URL if unknown).*

### Running the Application

Start the local development server:

```npm run dev```

The application will be accessible at: **`http://localhost:5173`**. 

Make sure to run the backend to be able to access network-specific features

---

## 4. Project Architecture

We follow a **Feature-First Architecture**. Instead of grouping files by technical type (e.g., all components together), we group them by business domain.

### 📂 `src/features`

This is where the core logic lives. If you are working on a specific page or functionality, you will likely be working here.

- **`HomeTab/`**: The landing experience and file upload wizard.
    
- **`ModelsTab/`**: The dashboard for listing, searching, and editing metadata of existing models.
    
- **`ModelViewer/`**: The 3D workspace. Contains complex logic for the `ThreeApp`, transformation controls, and versioning history.
    
<blockquote>Note: Components inside these folders are private to that feature.  </blockquote>

        

### 📂 `src/shared`

Contains reusable code used across multiple features.

- **`components/`**: Atomic UI elements (Buttons, Dialogs, Inputs). These are "dumb" components with no business logic.
    
- **`contexts/`**: Global providers (Theme, Navigation, Notification).
    
- **`services/`**: Global services like `AxiosConfig`.
    
- **`hooks/`**: Generic hooks (e.g., `useMutex`).
    

### 📂 `src/App.tsx`

The global wrapper. It initializes the Providers and renders the `Home` layout.

---

## 5. Code Quality & CI/CD

### Static Analysis

We use **SonarQube** for code quality checks.

- You do not need to run this locally.
    
- Analysis runs automatically in our CI/CD pipeline when you open a Pull Request.
    
- Please check the PR status checks to ensure you haven't introduced code smells or bugs.
    

### Linting

ESLint is configured to enforce code style. You should see these errors in your IDE or by running:

Bash

```npm run lint```

---

## 6. Common Issues / FAQ

#### General & Environment
<details> <summary><strong>The 3D Viewer is extremely slow or crashing.</strong></summary> <blockquote> Verify that your browser has Hardware Acceleration enabled. If you are running this in a virtual machine or a constrained container, WebGL performance may be limited. </blockquote> </details>

<details> <summary><strong>Where do I change the global theme?</strong></summary> <blockquote> Global styles are in <code>src/index.css</code> (Tailwind directives), but logic for toggling Light/Dark mode is handled in <code>src/shared/contexts/ThemeContext.tsx</code>. </blockquote> </details>

#### Architecture & Workflow
<details> <summary><strong>I created a new component. Should it go in src/shared or src/features?</strong></summary> <blockquote> Ask yourself: "Is this component used in more than one tab?" <ul> <li><strong>Yes:</strong> Put it in <code>src/shared/components</code>.</li> <li><strong>No:</strong> Put it in <code>src/features/[YourFeature]/components</code>.</li> <li><strong>Maybe later?</strong> Start in the feature folder. It is easier to move it to shared later than to clutter shared with specific logic now.</li> </ul> </blockquote> </details>

<details> <summary><strong>Can I import a component from ModelsTab into HomeTab?</strong></summary> <blockquote> <strong>No.</strong> Features should remain isolated. If you need to share logic or UI between features, move that code to <code>src/shared</code>. This prevents circular dependencies and "spaghetti code." </blockquote> </details>

<details> <summary><strong>How do features communicate (e.g., selecting a model in the List opens it in the Viewer)?</strong></summary> <blockquote> We use <strong>Context Providers</strong> in <code>src/shared/contexts</code>. <ul> <li>Do not try to pass props across different pages/tabs.</li> <li>Update the global state (e.g., <code>ModelContext</code>) in one feature, and consume it in the other.</li> </ul> </blockquote> </details>

#### Styling (Tailwind CSS)
<details> <summary><strong>Can I create a new .css file for my component?</strong></summary> <blockquote> <strong>Avoid it.</strong> We use Tailwind CSS for everything. <ul> <li>Use utility classes directly in your JSX (e.g., <code>className="p-4 bg-primary"</code>).</li> <li>If you need a complex style reused often, create a small wrapper component.</li> <li>The only global CSS lives in <code>src/index.css</code> (mainly for fonts and variables).</li> </ul> </blockquote> </details>

<details> <summary><strong>How do I access the theme colors (like primary or sidebar)?</strong></summary> <blockquote> Use Tailwind's semantic classes. <ul> <li>Instead of hardcoding hex values (<code>#ffffff</code>), use <code>bg-background</code> or <code>text-primary</code>.</li> <li>This ensures the app automatically looks correct in both Light and Dark modes (defined in <code>index.css</code>).</li> </ul> </blockquote> </details>

#### Development & Tools
<details> <summary><strong>Which icon library do we use?</strong></summary> <blockquote> We use <strong>Lucide React</strong>. <br /> Import icons like this: <code>import { Box, User } from 'lucide-react';</code> <br /> Do not install other icon libraries (like FontAwesome) to keep the bundle size small. </blockquote> </details>

<details> <summary><strong>My new 3D code works, but the TypeScript compiler is yelling at me.</strong></summary> <blockquote> Three.js types can be tricky. <ul> <li>Ensure you have installed <code>@types/three</code>.</li> <li>If you are extending Three.js elements in React Three Fiber, remember to use the <code>extend</code> function.</li> </ul> </blockquote> </details>

<details> <summary><strong>Why did my PR fail even though the app runs locally?</strong></summary> <blockquote> The CI pipeline runs strict checks that you might not be running constantly. Before pushing, run: <ul> <li><code>npm run lint</code> (Checks for code style errors)</li> <li><code>npm run build</code> (Checks for TypeScript type errors that Vite might ignore in dev mode)</li> </ul> </blockquote> </details>

### Happy Coding!
