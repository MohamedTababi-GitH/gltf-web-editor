# ECAD 3D Model Viewer

A web-based, interactive 3D visualization platform developed in collaboration with Zuken GmbH to modernize Electronic Computer-Aided Design (ECAD) workflows. This platform delivers a lightweight, browser-based prototype for viewing, interacting with, and comparing complex 3D ECAD model data without the need for traditional desktop-bound, license-restricted software.

## Key Features

The system supports the complete 3D model lifecycle and provides advanced interaction capabilities:

*   **Web-Based Visualization (SPA):** Provides a responsive Single-Page Application (SPA) for accessible, installation-free viewing across desktop and mobile devices.
*   **Model Lifecycle Management:** Users can upload, store, list, retrieve, and manage 3D model files and associated metadata.
*   **Core 3D Interaction:** Intuitive controls for exploring models, including orbit, pan, and zoom, leveraging the power of client-side 3D rendering.
*   **Object Manipulation:** Features for object selection, movement, rotation, and grouping within the 3D viewport.
*   **Interaction Safety:** Built-in mechanisms for **Snapping and Slots** for precise component placement, and real-time **Collision Detection** to prevent invalid configurations.
*   **Version Comparison (Diff):** Enables users to set a baseline and visualize structural or positional differences between model versions.
*   **Metadata Inspection:** Allows for clicking and selecting individual components to view their associated properties and data retrieved via REST API.
*   **Supported Format:** Primarily uses industry-standard **.glTF** and **.glb** formats for 3D assets.

## Technology & Architecture

The solution employs a modular, cloud-native architecture to ensure performance, scalability, and maintainability.

*   **Frontend Technology:**
    *   **3D Rendering Engine:** Three.js for high-performance, client-side rendering and manipulation.
    *   **Application Framework:** A modern JavaScript framework (implied by the architecture) for building a responsive, single-page user interface (UI/UX).
    *   **Tooling:** Uses **Vite** for the build toolchain.
*   **Backend & Infrastructure:**
    *   **Stateless REST API:** Provides endpoints for data management, metadata, and versioning.
    *   **Cloud Storage:** Leverages **Azure Blob Storage** for scalable, persistent model and asset storage.
    *   **Security:** Communication secured via **HTTPS**, with access control managed through Azure-managed identity and SAS tokens.
*   **Quality Assurance:**
    *   **CI/CD Pipeline:** Automated pipelines for consistent deployment.
    *   **Code Quality:** Enforces standards using **SonarQube** and **ESLint**.
    *   **Development Language:** Utilizes **TypeScript** for type safety across the application.
