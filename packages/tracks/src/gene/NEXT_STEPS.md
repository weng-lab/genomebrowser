# Gene track next steps

This file records the design questions left open after the first BigGenePred gene track implementation. The track now fetches standard BED12+8 data, renders transcript structure in pack mode, renders a composite gene structure in squish mode, and keeps whole-feature interactions working. The old transcript track remains separate and may be removed later.

The current implementation intentionally favors an independent gene module over shared code with the old transcript module. Revisit the topics below before adding detailed interactions or labels.

## Geometry contract

`geometry.ts` currently produces several views of composite gene geometry:

- `atoms` contains every resolved interval with its winning and overridden transcript contributions.
- `introns` filters intron atoms from `atoms`.
- `intronRuns` joins adjacent intron atoms for stable SVG lines and direction marks.
- `exonParts` filters CDS, UTR, and noncoding exon atoms from `atoms`.

These views are internally consistent today, but the return type does not state which one is canonical. A future caller could choose the wrong view or assume that every array has independent meaning.

One possible split is a biological composite model followed by a drawing model:

```ts
type CompositeGeneModel = {
  parts: CompositeGenePart[];
};

type GeneGlyphGeometry = {
  introns: VisualIntron[];
  exons: VisualExon[];
};

function createCompositeGeneModel(gene: GroupedGene): CompositeGeneModel;

function createGeneGlyphGeometry(model: CompositeGeneModel): GeneGlyphGeometry;
```

Keep the current composite precedence unless the product behavior changes:

1. Exon coverage wins over overlapping intron coverage.
2. CDS wins over UTR.
3. UTR wins over noncoding exon.
4. Winning and overridden transcript contributions remain available for later interactions.

This topic is complete when the code names one canonical biological result and the renderer receives only the geometry it needs to draw.

## Explicit render model

`GeneGlyph` is now the shared drawing component. `TranscriptGlyph` and `CompositeGeneGlyph` remain explicit variants, which keeps pack and squish preparation separate.

The glyph still distinguishes transcript metadata from composite metadata by checking object properties:

```ts
if ("winningContributions" in part.metadata) {
  // Composite gene part
} else {
  // Transcript part
}
```

This works, but the meaning is indirect. Once the geometry contract is settled, use either an explicit source discriminator or a source-neutral drawing model.

```ts
type GenePartSource =
  | {
      kind: "transcript";
      exonIndex: number;
      transcriptionIndex: number;
      frame: -1 | 0 | 1 | 2;
    }
  | {
      kind: "composite";
      winners: CompositeGeneContribution[];
      conflicts: CompositeGeneContribution[];
    };
```

The preferred direction is to keep `GeneGlyph` unaware of grouping and isoform conflict rules. It should receive ready-to-draw introns and exons. Do not introduce a mode boolean such as `isComposite` when explicit transcript and composite wrappers can prepare the correct input.

This topic is complete when the compiler can narrow every render case without testing for incidental property names.

## DOM metadata

The SVG currently includes attributes such as:

- `data-gene-part`
- `data-exon-index`
- `data-transcription-index`
- `data-frame`
- `data-utr-side`
- `data-contributing-transcript-ids`
- hit-target markers used by tests

These attributes help with DOM inspection and targeted renderer tests. They should not become a second biological data model. Future interaction code should receive typed objects directly instead of reconstructing them from strings on SVG elements.

A likely cleanup is:

- Keep a small number of stable internal selectors, such as `data-gene-part` and the hit-target markers.
- Test detailed biological metadata through the pure geometry functions.
- Remove DOM attributes that duplicate typed fields without serving rendering or debugging.
- Do not document these attributes as public API unless downstream consumers are expected to use them.

This topic is complete when each remaining `data-*` attribute has a concrete internal or public purpose.

## Interaction API

The current track module interaction API is difficult to understand and should be reviewed before adding part-level behavior. For now, pack callbacks receive a `GeneTranscript`, while squish callbacks receive a `GroupedGene`. One full-row hit target owns click, hover, leave, and tooltip behavior for each feature.

Do not design the gene interaction API around SVG elements. A possible typed target is:

```ts
type GeneInteractionTarget =
  | { kind: "gene"; feature: GroupedGene }
  | { kind: "transcript"; feature: GeneTranscript }
  | {
      kind: "part";
      feature: GroupedGene | GeneTranscript;
      part: GenePart;
    };
```

Questions to answer:

- Should the core interaction API change, or should the gene module adapt to it?
- Should hover and click receive the same target type?
- How should composite parts report winning and overridden isoforms?
- Does a strand-direction mark resolve to its parent intron?
- Which interaction behavior belongs to the module and which belongs to the host application?

This topic is complete when a user can understand the callback payload without reading renderer internals.

## Piece-level hit geometry

The biological pieces are already distinct geometry objects and SVG elements, but they do not own pointer events. This was deliberate. Whole-feature hit targets preserve the existing behavior while the interaction API remains unsettled.

When part interactions are added:

- Give CDS, UTR, noncoding exon, and intron intervals separate typed targets.
- Keep visible geometry separate from hit geometry.
- Give thin introns a taller invisible hit region constrained to the intron interval.
- Avoid overlapping exon-level and CDS or UTR hit regions that compete for the same event.
- Treat strand marks as intron decoration, not a separate biological part.

```ts
type GenePartHitRegion = {
  target: GeneInteractionTarget;
  x: number;
  y: number;
  width: number;
  height: number;
};
```

Squish parts require extra care because a visible interval may represent several isoforms with conflicting source parts.

This topic is complete when every clickable area maps to one unambiguous typed target.

## Labels

Labels remain intentionally absent. The old transcript track always placed text to the right and estimated its width from character count. That caused clipping near viewport edges and wasted horizontal space during row packing.

Before adding labels, decide:

- Whether pack uses transcript names and squish uses gene names.
- Whether labels can appear inside a long feature.
- Whether an outside label prefers the right or left side.
- When a label should be hidden because neither side has enough room.
- Whether label width participates in row packing.
- How labels behave when a feature is clipped by the viewport.

Label placement should be a separate calculation rather than an extra `x` value appended inside `GeneGlyph`.

This topic is complete when label placement and collision rules are explicit and testable.

## Temporary interaction overlay

The transcript and gene hit targets currently use a bright red fill at partial opacity. This is intentional debugging output used to inspect their bounds. Tests should verify target size and behavior, not the temporary color.

Before the track is considered finished:

- Restore a transparent fill while retaining pointer events.
- Confirm that the hit boxes still cover the intended row area.
- Update documentation if it currently describes behavior that differs from the debug build.

This topic is complete when the overlay is invisible and interaction coverage has been checked visually.

## Accessibility

Current SVG interactions are pointer-based. The interaction design should also cover keyboard and assistive technology behavior.

Decide whether gene and transcript targets should provide:

- Keyboard focus.
- Enter and Space activation.
- An accessible name containing the gene or transcript name and interval.
- A visible focus indicator that does not obscure exon structure.
- Tooltip behavior on focus and blur.

Part-level keyboard navigation could create too many focus stops. Start with whole genes and transcripts, then decide whether individual parts need direct keyboard access or whether a focused feature should expose part details another way.

This topic is complete when pointer and keyboard users can reach the same meaningful actions.

## Visual metrics

`glyph.tsx` now keeps visual sizing in `createGeneGlyphMetrics`. It names the CDS height, secondary exon height, intron stroke width, direction-mark size, spacing, and minimum drawable intron width.

These values are renderer policy, not track configuration. Keep them internal until users have a real need to change them. If the visual design changes, adjust the named metrics rather than scattering new ratios through the SVG code.

This topic only needs more work if visual testing shows poor behavior at small row heights, large row heights, or extreme zoom levels.
