export const svgPoint = (svg: SVGSVGElement, x: number, y: number) => {
  if (svg.createSVGPoint && svg) {
    let point = svg.createSVGPoint();
    point.x = x;
    point.y = y;
    point = point.matrixTransform(svg!.getScreenCTM()!.inverse());
    return [point.x, point.y];
  }
  const rect = svg.getBoundingClientRect();
  return [x - rect.left - svg.clientLeft, y - rect.top - svg.clientTop];
};

export function m(x: number, y: number): string {
  return ` M ${x} ${y}`;
}
export function l(x: number, y: number): string {
  return ` L ${x} ${y}`;
}
