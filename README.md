# LLM Code Exporter

LLM Code Exporter is a desktop application built with **Electron**, **React**, and **TypeScript** that scans a folder for code files, displays them in a user-friendly interface, and allows you to copy or export the entire project as Markdown—making it ideal for feeding code into Large Language Models (LLMs).

---

## Features

- **Directory Selection**: Drag-and-drop or browse to select a folder of code.
- **Configurable File Types**: Specify which file extensions to include or ignore, and which directories or files to skip.
- **Project Stats**: View total file count, lines, characters, and approximate tokens. Supports a variety of LLM context limits.
- **Code Viewer**: Preview file contents and copy them quickly from a side-by-side explorer.
- **Copy & Export**: Copy the entire project as a single Markdown block or save it out to a `.md` file.
- **Dark Mode**: Easily toggle between light and dark themes.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development](#development)
3. [Production Build](#production-build)
4. [Usage](#usage)
5. [Testing](#testing)
6. [Folder Structure](#folder-structure)
7. [Contributing](#contributing)
8. [License](#license)

---

## Getting Started

### Prerequisites

- **Node.js** (v16+ recommended)
- **npm** (or Yarn)

### Installation

1. **Clone or download** this repository.
2. **Install dependencies** in the project root:
   ```bash
   npm install
   ```
3. (Optional) **Customize** the default config—such as allowed file types—by editing `useFileScannerConfig.ts` if needed.

---

## Development

During development, you can run both the front end (Vite) and Electron processes in watch mode:

```bash
npm run dev
```

This script does three things in parallel:

1. **Compile TypeScript** (`npm run watch:ts`)
2. **Launch the Vite dev server** (`npm run dev:vite`)
3. **Start Electron** once the build is ready (`npm run dev:electron`)

When everything is up, an Electron window will open with your app loaded from Vite. Any code changes will live-reload accordingly.

---

## Production Build

### 1) Compile the application

```bash
npm run build
```

- Transpiles the Electron code into `dist-ts/`.
- Builds the React front end into `dist/` using Vite.

### 2) Create installers or app bundles

```bash
# For Apple Silicon (M1/M2) macOS
npm run dist:mac-arm64

# For Intel macOS
npm run dist:mac-intel

# For other or default packaging
npm run dist
```

The final `.app` or `.dmg` (on macOS) or `.exe` (Windows) will appear in the **`release/`** folder.

---

## Usage

1. **Open the Application**

   - Either run `npm run dev` or install the built app from the generated `.dmg`/`.exe`.

2. **Select or Drag in a Folder**

   - A directory selection box lets you choose the folder. Alternatively, drag a folder onto the drop area.

3. **Configure**

   - Expand **Advanced Configuration** to add or remove allowed file extensions, directories, or files to ignore.

4. **Generate File List**

   - Click **Generate** to scan the folder and read in the code.

5. **Explore & Copy**

   - Use the file explorer on the left to preview each file in the code viewer.
   - Copy individual files or the entire project as a Markdown block.

6. **Export**
   - Click **Export File** to save all scanned files into a single Markdown file.

---

## Testing

```bash
npm test
```

- Runs Jest unit tests for both the Electron logic and the React components (in a jsdom environment).
- Ensures your code remains stable and well-tested.

---

## Folder Structure

- **`src/`**

  - Contains all React + TypeScript source.
  - **`hooks/`**: Reusable hooks like `useFileScannerConfig` and `useScanFiles`.
  - **`components/`**: UI components such as `DirectorySelection`, `ConfigSection`, `CodeViewer`, etc.
  - **`utils/`**: Utility functions (e.g. file type inference).
  - **`App.tsx`**: Main application component.

- **`electron-main.ts`**

  - Entry point for the main Electron process (packaged into `dist-ts/electron-main.js`).

- **`dist/`**

  - Production build of the React front end (from Vite).

- **`dist-ts/`**

  - Compiled JavaScript for Electron.

- **`tests/`**

  - Jest test files for your components, hooks, and main process code.

- **`build/`**

  - Resources such as `icon.png`, `icon.icns`, and other images.

- **`release/`**
  - Output folder for built installers or `.app` packages.

---

## Contributing

Feel free to open **issues** or **pull requests** for improvements or bug fixes.

When submitting changes:

1. **Run tests**: `npm run test`
2. **Build**: `npm run build`
3. **Verify** everything is working properly.

We welcome contributions of all kinds—feature ideas, bug reports, or documentation enhancements.

---

## License

[MIT License](./LICENSE)

(c) 2025 Daniel Morgan  
See `LICENSE` for details.
