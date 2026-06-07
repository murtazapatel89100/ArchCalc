# ArchCalc Web & Docs

This directory contains the landing page and documentation site for ArchCalc, built using [Next.js](https://nextjs.org/) and MDX.

## Getting Started

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Run Development Server:**
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Documentation Structure
The documentation is written in MDX and lives in `src/app/docs`. To add a new section, create a folder inside `docs` with a `page.mdx` file.

## Styling
The web application uses Tailwind CSS v4. Global styles and custom utilities (`glass`, `text-gradient`) are defined in `src/app/globals.css`.

