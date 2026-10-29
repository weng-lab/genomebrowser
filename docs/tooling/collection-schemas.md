# Regenerating collection schemas

Change schema inputs and regenerate their outputs rather than editing generated JSON by hand. Review and commit the generated diff with the change that caused it.

For first-party track schema changes, run these commands from the repository root:

```sh
pnpm exec turbo run build --filter=@weng-lab/genomebrowser-tracks...
node packages/core/dist/cli.js schema --from './packages/tracks/dist/genomebrowser-tracks.es.js#firstPartyTrackModules' --out packages/tracks/schemas/trackCollection.schema.json
```

If the tracks build fails because the old schema has the wrong track count, rebuild the dependencies and module bundle before regenerating:

1. Build core and reader through Turbo.
2. Run `pnpm --dir packages/tracks exec vite build` to refresh the module bundle.
3. Regenerate the schema, then run formatting and `pnpm verify`.

The tracks package build checks schema packaging and track count; do not treat it as a full schema-freshness comparison. The starter template has separate `schema` and `schema:check` scripts. Run those from `packages/create/template` when its schema inputs change; root verification does not run `schema:check`.
