# Create Genome Browser

Create a small Vite and React genome browser application that you can edit directly.

```sh
npm create @weng-lab/genomebrowser@beta my-browser
cd my-browser
npm install
npm run dev
```

The command creates the target directory when it does not exist. It can also use an existing empty directory, but it will not overwrite a directory that already contains files.

The generated app includes a browser, genome search and region navigation, first-party track modules, a starter track collection, and TrackSelect. Gene, SNP, and cCRE search requires a server-side `SCREEN_API_KEY`; coordinate search does not. TrackSelect uses MUI X Premium and may display its license watermark; the grid remains functional. The template does not configure a license key. Generated projects include plain-language guides for customization, architecture, and deployment under `docs/`, plus `AGENTS.md` for coding agents.
