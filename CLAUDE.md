# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start development server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

This is a Next.js 16 project using the App Router with TypeScript and Tailwind CSS v4.

### Key Technologies
- **Next.js 16** with App Router (not Pages Router)
- **React 19** with Server Components as default
- **Tailwind CSS v4** - uses `@import "tailwindcss"` syntax and `@theme` directive
- **TypeScript** with strict mode enabled

### Project Structure
- `app/` - App Router pages and layouts (file-based routing)
- `app/layout.tsx` - Root layout with Geist font configuration
- `app/page.tsx` - Home page (Server Component by default)
- `app/globals.css` - Global styles with Tailwind v4 theme configuration
- `public/` - Static assets

### Path Aliases
Use `@/*` to import from project root (configured in tsconfig.json).

### Styling Notes
- Tailwind v4 uses CSS-native `@theme` blocks for custom properties
- Dark mode uses `prefers-color-scheme` media query
- Geist font family loaded via `next/font/google`
