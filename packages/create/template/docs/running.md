# Run, build, and access your browser remotely

Run the app while editing it, or build it and preview the result. If the project lives on a lab server, use an SSH tunnel to open it in your laptop's browser.

## Install and run locally

Install Node.js 22.12+ or 24+ on the computer that will run the app. In your generated project directory, install its dependencies once:

```sh
npm install
```

Start the development server:

```sh
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open <http://localhost:5173>. Leave the terminal running; source edits usually appear automatically. Press Ctrl+C to stop the server. `--strictPort` makes the command fail if the port is occupied, so the address stays predictable.

For gene, SNP, and cCRE search, copy `.env.example` to `.env.local` in the project directory, set `SCREEN_API_KEY`, and restart the server. Get a key from <https://console.wenglab.org/>. Keep the key server-side; never put it in a `VITE_` variable. Coordinate search works without a key.

## Build and preview

In the project directory, run:

```sh
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

Open <http://localhost:4173>. The build checks TypeScript and writes the website to `dist/`; preview serves those files. After changing source files, run `npm run build` again to update the preview.

`npx` runs the project's installed Vite command. The template has no `preview` or `start` npm script, so use `npx vite preview` directly. `npm start` would only work if you added a `start` script to `package.json`.

Vite preview inherits this project's search proxy and reads the key from `.env.local`, so you can check search against the built app too. Preview is for testing the build. Permanent hosting requires serving `dist/` and providing the search endpoint separately; see [Deployment](deployment.md).

## Run on a lab server and open on your laptop

Replace `YOUR_USER`, `YOUR_SERVER`, and `/path/to/my-browser` with your SSH account, server hostname, and project directory. Connect to the lab VPN first if your server requires it. Node.js and the project dependencies must be installed on the server; the laptop needs SSH and a web browser.

### Development mode

In a terminal on your laptop, connect to the server:

```sh
ssh YOUR_USER@YOUR_SERVER
```

In that remote shell, start the app:

```sh
cd /path/to/my-browser
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

In a second terminal on your laptop, open the tunnel:

```sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:5173:127.0.0.1:5173 YOUR_USER@YOUR_SERVER
```

Open <http://localhost:5173> on your laptop. SSH forwards that local port to the app on the server. Keep both terminals open; a tunnel that connects successfully normally displays no output. Edit the project files on the server to see changes.

### Built preview

In the remote project directory, build and start preview:

```sh
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

In another terminal on your laptop, open its tunnel:

```sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:4173:127.0.0.1:4173 YOUR_USER@YOUR_SERVER
```

Open <http://localhost:4173> on your laptop. This uses the same build as a local preview, with the web server running remotely. Set `.env.local` in the project directory on the server if you want to test search.

Press Ctrl+C in the tunnel terminal to disconnect it, and in the remote server terminal to stop Vite.

## Troubleshooting remote access

- **A laptop port is occupied:** change only the local port in the tunnel, for example `-L 127.0.0.1:15173:127.0.0.1:5173`, then open `http://localhost:15173`.
- **A server port is occupied:** choose another Vite `--port` and use that same port as the final number in `-L`.
- **The page cannot connect:** confirm Vite is still running and the tunnel connects to the same server. A successful SSH connection alone does not prove that Vite is listening.
- **The page loads but tracks fail:** genomic URLs are fetched by your laptop's browser. The app tunnel does not forward those data requests. The URLs must be reachable from the laptop, including any required VPN, and support CORS and byte-range requests. See [Host your genomic files](deployment.md#host-your-genomic-files).
- **Coordinate search works but gene search fails:** check the server's `.env.local`, restart Vite, and confirm the server can reach the SCREEN API.
- **The preview shows old changes:** rebuild with `npm run build` and refresh the page.

Once connected, check startup tracks, pan and zoom, track selection, a lab-hosted dataset, and search in both development and preview modes.
