import React from "react";

export type ClipPathProps = {
  height: number;
  width: number;
  id: string;
};

/**
 * Creates an SVG clipPath element with a unique ID.
 * @param width the width of the element relative to the SVG.
 * @param height the height of the element relative to the SVG.
 * @param id the unqiue ID of the element, used to refer to it in properties of clipped elements.
 */
const ClipPath: React.FC<ClipPathProps> = ({ width, height, id }) => (
  <clipPath id={id}>
    <rect x={0} y={0} width={width} height={height} />
  </clipPath>
);
export default ClipPath;
