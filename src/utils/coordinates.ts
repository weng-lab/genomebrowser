export interface Feature {
  coordinates: { start: number; end: number };
  name: string;
  color?: string;
}

export function groupFeatures<T extends Feature>(
  features: T[],
  x: (value: number) => number,
  fontSize: number,
  margin: number | undefined = 10
): T[][] {
  fontSize = fontSize || 0;
  return features.reduce<T[][]>((cpacked, feature) => {
    let foundmatch = false;
    for (let i = 0; i < cpacked.length; ++i) {
      if (
        x(cpacked[i][cpacked[i].length - 1].coordinates.end) +
          margin +
          fontSize * cpacked[i][cpacked[i].length - 1].name.length <=
        x(feature.coordinates.start)
      ) {
        cpacked[i].push(feature);
        foundmatch = true;
        break;
      }
    }
    if (!foundmatch) cpacked.push([feature]);
    return cpacked;
  }, []);
}
