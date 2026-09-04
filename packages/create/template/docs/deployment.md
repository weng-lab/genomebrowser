# Deployment

Deployment has three parts: the built website, accessible genomic files, and a search endpoint. Provide the target host, site address, audience, and access constraints so an agent can configure and verify the deployment.

## Build the website

Run the [verification commands](../AGENTS.md#verification). `npm run build` produces `dist/`; deploy its contents through the host's publishing workflow.

The template assumes a website root. Deploying under a path such as `/my-project/` requires matching asset paths and search routing. Use HTTPS for the website and data; clipboard access also requires a secure context outside localhost.

## Keep search working

Coordinate search runs in the browser. Gene, SNP, and cCRE search requires `POST /api/screen-graphql` on the same website.

Vite supplies a local development proxy, but it is not included in `dist/`. The production host needs a server function or a route to a server implementing this contract:

| Request or setting | Behavior                                                        |
| ------------------ | --------------------------------------------------------------- |
| Destination        | `https://screen.api.wenglab.org/graphql`                        |
| Body               | Forward the incoming GraphQL JSON body                          |
| Authentication     | Add `Authorization: Bearer <SCREEN_API_KEY>` on the server      |
| Response           | Return the upstream status and JSON; handle connection failures |
| Secret storage     | Set `SCREEN_API_KEY` in the server environment                  |

Keep the key out of browser code and `VITE_` variables. The local `.env.local` file is ignored by Git and should remain private.

## Host your genomic files

Collection entries require HTTP or HTTPS URLs reachable by the intended audience. The lab's suggested directory is `/zata/public_html/users/YOUR_USER`; establish its corresponding public URL before configuring tracks.

BigWig and BigBed access requires byte-range requests with uncompressed partial responses. A different data origin must allow cross-origin requests (CORS). See `node_modules/@weng-lab/genomebrowser-tracks/docs/dataSources.md` for diagnostics.

## Verify deployment

Check the deployed site, not just the local build:

- Startup tracks load before opening Select tracks.
- Coordinate and gene search work on a supported assembly.
- Track selection, highlights, navigation, and copying work.
- Controls remain usable in a narrow window.
- Data is accessible from the intended audience's network and authentication context.

Report any endpoint or access checks that could not be completed.
