# Gene track next steps

This file records design decisions and remaining questions after the gene track implementation. The track fetches standard BigGenePred and BigGenePredPlusV1 data, renders transcript structure in full and tagged modes, renders a composite gene structure in merged mode, and supports typed feature and part interactions. The old transcript track remains separate and may be removed later.

The implementation intentionally favors an independent gene module over shared code with the old transcript module.

## Geometry contract

`geometry.ts` keeps transcript and merged biological geometry separate. Composite geometry provides these related views:

- `atoms` contains every resolved interval with its winning and overridden transcript contributions.
- `introns` filters intron atoms from `atoms`.
- `intronRuns` joins adjacent intron atoms for stable SVG lines and direction marks while retaining the detailed atoms in `segments`.
- `exonParts` filters CDS, UTR, and noncoding exon atoms from `atoms`.

`atoms` is the canonical merged biological result. The filtered arrays and intron runs are derived views. `preparation.ts` converts either biological model into source-neutral `GeneGlyphGeometry`. Each preparation function returns drawing geometry plus a map from stable glyph part IDs to typed interaction targets.

Keep the current composite precedence unless the product behavior changes:

1. Exon coverage wins over overlapping intron coverage.
2. CDS wins over UTR.
3. UTR wins over noncoding exon.
4. Winning and overridden transcript contributions remain available on merged part targets.

This topic is complete.

## Explicit render model

`GeneGlyph` receives only source-neutral intron and exon intervals carrying stable IDs. Transcript and merged preparation remain explicit functions, so the glyph is unaware of grouping, transcript metadata, and isoform conflict rules. This topic is complete.

## DOM metadata

The SVG keeps internal selectors for visible part kinds, direction marks, feature hit targets, part hit targets, and stable part IDs. Biological metadata is tested through pure geometry and preparation functions rather than duplicated in SVG strings. Interaction handlers receive typed targets directly. These attributes are not public API. This topic is complete.

## Interaction API

The module exports this interaction target:

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

The gene module adapts this target to the existing core interaction API. Click, hover, leave, and tooltips use the same target type. Merged exon parts report winning and overridden contributions. Merged intron runs retain detailed segments, and strand marks remain non-interactive decoration. Host applications decide what callbacks do. This topic is complete.

## Piece-level hit geometry

Every CDS, UTR, noncoding exon, and intron run has a separate typed target. Visible geometry does not receive pointer events. Transparent part hit regions cover each interval and the complete row height; there is no competing exon-level region around CDS and UTR segments. Whole-feature targets remain behind part regions so gaps resolve to the transcript or gene. Strand marks remain intron decoration.

Merged exon targets retain winning and overridden contributions. Merged intron run targets retain all detailed intron segments. This topic is complete.

## Labels

Labels use a separate, testable placement calculation. Full and tagged label transcripts with `transcriptName`, while merged labels grouped genes by gene name. Labels prefer the right side, move to the left near the right viewport edge, and hide when neither side fits. Their estimated bounds participate in row packing, and `GeneGlyph` remains unaware of text placement.

The current width estimate uses character count. Revisit it only if visual testing shows that proportional fonts cause meaningful collisions or unnecessary hiding.

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
