# Documentation and agent guidance

Maintainer documentation is shared by people and agents. Repository documents own project requirements, policies, and their rationale. Keep each topic in one canonical location so changing a policy does not require finding copies in several agent instructions.

## Skills route common tasks

Repository skills make common workflows discoverable and explicitly invocable. Keep them small: describe when the skill applies, require it to read the relevant repository documents, and guide execution through the task. A short skill is useful even when its main job is to load the right guidance.

Put shared reference material in the repository documentation rather than inside a skill's references directory. These skills are specific to this repository; they do not need to carry a portable copy of its policies. Developers should be able to find and follow the same guidance without invoking a skill.

Skill descriptions already make these workflows discoverable to the agent. Do not repeat skill routing in AGENTS.md or other documents unless a specific edge case needs it.

## AGENTS.md supplies essential context

Keep AGENTS.md short and precise. Use it for standing instructions that should apply across tasks and pointers to important guidance that would otherwise take unnecessary exploration to find. Let agents discover ordinary code and use skill descriptions to select workflows. Avoid a codebase map, a skill catalog, or copies of detailed policies.

## Writing guides

- [Writing documentation](writing.md): shared standards for evidence, examples, and language.
- [Package documentation architecture](packageArchitecture.md): organize consumer tutorials, guides, and references.
- [API reference writing](apiReference.md): cover public contracts and write usable reference pages.
- [Maintainer documentation](maintainerDocs.md): explain project judgment, contribution practices, and consequential decisions.
