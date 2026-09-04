# Your genome browser

An editable React and TypeScript application built with the Weng Lab genome browser packages. It starts with hg38 and reference tracks, ready to adapt to your datasets and workflows.

## Run locally

With Node.js 22.12+ or 24+ installed:

```sh
npm install
npm run dev
```

Open the address printed by Vite. Source changes usually appear automatically.

See [Run, build, and access remotely](docs/running.md) for built previews and SSH access from your laptop to an app running on a lab server.

For gene, SNP, and cCRE search, copy `.env.example` to `.env.local`, set `SCREEN_API_KEY`, and restart the server. Keys are available from <https://console.wenglab.org/>. Coordinate search works without a key.

## Customize and deploy

- [Customization](docs/customization.md): datasets, startup selection, assemblies, and interface changes.
- [Architecture](docs/architecture.md): shared state and track initialization.
- [Deployment](docs/deployment.md): hosting the website, data, and search endpoint.

For agent-assisted changes, provide the intended behavior, assembly, dataset URLs, and a representative region. [AGENTS.md](AGENTS.md) provides package documentation locations and verification commands.

## Current limitations

- Search supports hg38/GRCh38 and mm10. Other assemblies show a notice instead of search; pan and zoom remain available.
- Tracks and highlights are held in memory. Reloading restores the configured startup tracks and region.
- The track selector uses MUI X Premium and may display its license watermark. The grid remains functional; this template does not configure a license key.
- Production gene, SNP, and cCRE search requires a server endpoint; the local development proxy is not included in the build.

## Check your changes

Run the [verification commands](AGENTS.md#verification) and check the affected browser workflow. Agents should complete these checks and report the results with their changes.
