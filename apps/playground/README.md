# Genome browser playground

This private Next.js App Router application is the repository's development playground. It owns experimental routes and custom browser compositions that do not belong in the standalone product or publishable packages.

The home page (`/`) shows an mm10 browser with one GENCODE M25 comprehensive Gene track. Pan by dragging, use the zoom buttons, and open track settings to change the display or switch to the basic annotation variant.

The files under `examples/` preserve the former core and UI package demos and their fixtures. They are intentionally not connected to routes. Each `App.tsx` is already a client component, so a temporary route can import it directly.

The playground resolves every public workspace package entry directly to its TypeScript source. Add new public track subpaths to both `next.config.ts` and `tsconfig.json` so runtime and type resolution stay aligned.

From the repository root, a human maintainer can run:

```sh
pnpm playground dev
```

Automation agents must not start the development server.
