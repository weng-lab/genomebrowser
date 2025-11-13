import { lighten } from "../../../utils/color";
import { linearScale } from "../../../utils/coordinates";
import { SNP } from "./types";

export const createArcPath = (
  sourceSnp: SNP,
  targetSnp: SNP,
  height: number,
  leadHeight: number,
  snpHeight: number
) => {
  const targetX = targetSnp.pixelStart + (targetSnp.pixelEnd - targetSnp.pixelStart) / 2;
  const sourceX = sourceSnp.pixelStart + (sourceSnp.pixelEnd - sourceSnp.pixelStart) / 2;

  // Calculate correct y-coordinates based on whether each SNP is a lead or regular SNP
  const targetY = isLead(targetSnp) ? height - leadHeight : height - snpHeight;
  const sourceY = isLead(sourceSnp) ? height - leadHeight : height - snpHeight;

  const controlX = targetX + (sourceX - targetX) * 0.5;
  const controlY = Math.min(targetY, sourceY) - height * 1; // Arc height relative to the higher SNP
  return `M ${targetX} ${targetY} Q ${controlX} ${controlY} ${sourceX} ${sourceY}`;
};

export const getWidth = (score: string): number => {
  const numScore = parseFloat(score);
  if (isNaN(numScore)) return 4;
  return linearScale(numScore, { min: 0.7, max: 1 }, { min: 1, max: 8 });
};

// Helper function to get the correct rsquare value for a specific target SNP
export const getRSquareForTarget = (snp: SNP, targetSnpId: string): string => {
  if (snp.ldblocksnpid === "Lead") return snp.rsquare;

  const ldblocksnpids = snp.ldblocksnpid.split(",").map((id) => id.trim());
  const rsquareValues = snp.rsquare.split(",").map((val) => val.trim());

  // Find the index of the target SNP in the ldblocksnpids
  const targetIndex = ldblocksnpids.indexOf(targetSnpId);

  // Return the corresponding rsquare value, or the first one if not found
  return targetIndex >= 0 && targetIndex < rsquareValues.length
    ? rsquareValues[targetIndex]
    : rsquareValues[0] || snp.rsquare;
};

// Helper function to get the primary rsquare value (first one or the whole value if single)
export const getPrimaryRSquare = (snp: SNP): string => {
  if (snp.ldblocksnpid === "Lead") return snp.rsquare;

  const rsquareValues = snp.rsquare.split(",").map((val) => val.trim());
  return rsquareValues[0] || snp.rsquare;
};

export const isLead = (snp: SNP) => {
  return snp.rsquare.includes("*") || snp.ldblocksnpid.includes("Lead");
};

export const getFill = (snp: SNP, color: string) => {
  if (isLead(snp)) {
    return color;
  }
  return lighten(color, 0.3);
};
