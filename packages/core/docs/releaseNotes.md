# Release notes

## Unreleased

Removed the public `defaultScreenGraphQlEndpoint` export. Core no longer defines a SCREEN-specific endpoint. Applications that used the constant for GenomeSearch should pass their host-owned route, such as `/api/screen-graphql`, directly. Server proxy routes and authentication ownership are unchanged.
