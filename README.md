## 🌌 Tulpar Language Docs

Tulpar is a futuristic programming language designed for modern developers, combining a **minimal, readable syntax** with a **powerful standard library**.  
This repository contains the source code for the **official documentation site** of Tulpar, currently offering content in **English and Turkish**.

The site is built with Astro, Starlight, and Tailwind, featuring a **dark‑first, high‑contrast, futuristic UI** with strong focus on readability and code examples.

---

## 🛰️ Features

- **Multilingual docs**: English and Turkish content
- **Futuristic UI**: Carefully tuned accent colors, dark theme, and typography
- **Starlight documentation stack**: Ready for versioning and large doc sets
- **Code‑centric content**: Guides, examples, and standard library references
- **Static site**: Fast, secure, and easy to deploy anywhere

---

## 🧱 Project Structure

High‑level directory layout:

```text
.
├── public/               # Static assets (favicon, icons, etc.)
├── src/
│   ├── assets/           # Images and media
│   ├── content/
│   │   └── docs/         # EN / TR documentation content
│   ├── styles/           # Custom styles (e.g. custom.css)
│   └── content.config.ts # Starlight content configuration
├── astro.config.mjs      # Astro + Starlight configuration
├── tailwind.config.mjs   # Tailwind theme configuration
├── package.json
└── tsconfig.json
```

---

## 🔧 Setup

Requirements:
- **Node.js** (recommended: LTS)
- **pnpm** package manager

After cloning the repository, install dependencies:

```bash
pnpm install
```

---

## 🚀 Development & Build Commands

- **Start the development server**  
  ```bash
  pnpm dev
  ```  
  Default URL: `http://localhost:4321`

- **Create a production build**  
  ```bash
  pnpm build
  ```  
  Output directory: `./dist/`

- **Preview the production build locally**  
  ```bash
  pnpm preview
  ```

- **Astro CLI commands**  
  ```bash
  pnpm astro -- --help
  ```

---

## 🎨 Design & Theme

- **Dark‑first**, futuristic color palette (the `accent` color represents the Tulpar brand)
- `src/styles/custom.css` redefines Starlight colors to match Tulpar’s visual identity
- Tailwind configuration is extended to keep the docs UI minimal yet expressive

---

## 📚 Documentation Sections

The documentation is organized into the following main sections (with EN and TR variants):

- **Introduction**
- **Language Guide**
- **Standard Library**
- **Examples**

Each section is designed to provide a clear and practical learning path, from **first steps with Tulpar** to **advanced examples**.

---

## 🤝 Contributing & Feedback

We welcome **ideas, fixes, and contributions** to make the Tulpar documentation even better.  
You can open issues, submit pull requests, or propose improvements to the content and structure.

Let’s write the code of the future together. 🚀
