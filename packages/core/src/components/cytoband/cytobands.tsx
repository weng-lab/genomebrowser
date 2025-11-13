import { gql, useQuery } from "@apollo/client";
import { Domain } from "../../utils/types";
import Centromere from "./centromere";
import Cytoband from "./cytoband";
import CytobandHighlight from "./highlight";
import { CytobandColors } from "./types";

const CYTOBAND_QUERY = gql`
  query cytobands($assembly: String!, $chromosome: String) {
    cytoband(assembly: $assembly, chromosome: $chromosome) {
      stain
      coordinates {
        chromosome
        start
        end
      }
    }
  }
`;

const DEFAULT_CYTOBAND_COLORS: CytobandColors = {
  default: "#000000",
  centromere: "#880000",
  stalk: "#ff0000",
};

export default function Cytobands({
  assembly,
  currentDomain,
}: {
  assembly: string;
  currentDomain: Domain;
}) {
  const width = 700;
  const height = 20;
  const highlight = { ...currentDomain, color: "rgba(50,50,255,0.75)" };
  const transform = `translate(0,0)`;

  const { data, loading, error } = useQuery(CYTOBAND_QUERY, {
    variables: {
      assembly: assembly,
      chromosome: currentDomain.chromosome || "",
    },
  });

  const colors = DEFAULT_CYTOBAND_COLORS;

  if (loading)
    return (
      <g width={700} height={20}>
        <text x="350" y="15" textAnchor="middle" style={{ fontSize: "14px", fontFamily: "sans-serif" }}>
          Loading...
        </text>
      </g>
    );
  if (error)
    return (
      <g width={700} height={20}>
        <text x="350" y="15" textAnchor="middle" style={{ fontSize: "14px", fontFamily: "sans-serif" }}>
          Error: {error.message}
        </text>
      </g>
    );

  const domain = { start: 0, end: Math.max(...data.cytoband.map((x: any) => x.coordinates.end)) };
  const x = xtransform(
    {
      start: domain.start,
      end: domain.end,
      chromosome: currentDomain.chromosome,
    },
    width
  );
  let centromereCount = 0;
  return (
    <g id="cytobands" width={width} height={height} transform={transform}>
      {data.cytoband.map((cytoband: { coordinates: { start: any; end: any }; stain: string }, i: any) => {
        const xc = x(cytoband.coordinates.start);
        const width = x(cytoband.coordinates.end) - xc;
        return cytoband.stain === "acen" ? (
          <Centromere
            width={width}
            x={xc}
            height={height}
            color={colors.centromere}
            key={i}
            opening={centromereCount++ === 0}
          />
        ) : (
          <Cytoband type={cytoband.stain} width={width} x={xc} height={height} colors={colors} opacity={1} key={i} />
        );
      })}
      {highlight ? (
        <CytobandHighlight
          onMouseOut={() => {}}
          // onMouseOver={() =>
          //   props.onHighlightMouseOver &&
          //   props.onHighlightMouseOver(props.highlight!, x((props.highlight!.start + props.highlight!.end) / 2), 0)
          // }
          // onClick={() =>
          //   props.onHighlightClick &&
          //   props.onHighlightClick(props.highlight!, x((props.highlight!.start + props.highlight!.end) / 2), 0)
          // }
          highlight={highlight}
          x={x}
          height={height}
          width={width}
        />
      ) : null}
      {/* {highlights
        ? highlights.map((h, i) => (
            <CytobandHighlight
              // onMouseOut={() => {}}
              // onMouseOver={() =>
              //   props.onHighlightMouseOver && props.onHighlightMouseOver(h, x((h.start + h.end) / 2), i)
              // }
              // onClick={() => {}}
              highlight={h}
              x={x}
              height={height}
              width={width}
            />
          ))
        : null} */}
      {/* {props.children} */}
    </g>
  );
}

function xtransform(domain: Domain, width: number): (i: number) => number {
  return (i: number) => ((i - domain.start) * width) / (domain.end - domain.start);
}
