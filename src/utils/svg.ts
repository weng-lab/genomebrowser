export const svgPoint = (svg: SVGSVGElement, event: React.MouseEvent<SVGElement>) => {
  if (svg.createSVGPoint && svg) {
    let point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    point = point.matrixTransform(svg!.getScreenCTM()!.inverse());
    return [point.x, point.y];
  }
  const rect = svg.getBoundingClientRect();
  return [event.clientX - rect.left - svg.clientLeft, event.clientY - rect.top - svg.clientTop];
};
