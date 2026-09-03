# Create Genome Browser

Create a small Vite and React genome browser application that you can edit directly.

```sh
npm create @weng-lab/genomebrowser my-browser
cd my-browser
npm install
npm run dev
```

The command creates the target directory when it does not exist. It can also use an existing empty directory, but it will not overwrite a directory that already contains files.

The generated app includes a browser, genome search and region navigation, first-party track modules, a starter track collection, and TrackSelect. Gene, SNP, and cCRE search requires a server-side `SCREEN_API_KEY`; coordinate search does not. TrackSelect uses MUI X Premium; provide a license key through `VITE_MUI_X_LICENSE_KEY` if your use requires one (optional to remove the watermark).
