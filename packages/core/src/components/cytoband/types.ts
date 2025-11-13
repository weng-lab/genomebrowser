import React from "react";
import { Domain } from "../../utils/types";

export type Highlight = {
    color: string;
    start: number;
    end: number;
};

export type ShortHighlightProps = {
    highlight: Highlight;
    x: (value: number) => number;
    height: number;
};

export type Cytoband = {
    stain: string;
    coordinates: Domain;
};

export type CytobandColors = {
    default: string;
    centromere: string;
    stalk: string;
};

export type CytobandsProps = {
    data: Cytoband[];
    width: number;
    height: number;
    id: string;
    colors?: CytobandColors;
    transform?: string;
    highlight?: Highlight;
    highlights?: Highlight[];
    onHighlightMouseOver?: (highlight: Highlight, x: number, i: number) => void;
    onHighlightMouseOut?: () => void;
    onHighlightClick?: (highlight: Highlight, x: number, i: number) => void;
    domain?: Domain;
    children?: React.ReactNode;
    opacity?: number;
};

export type CytobandProps = {
    colors: CytobandColors;
    width: number;
    height: number;
    type: string;
    x: number;
    opacity?: number;
}

export type CentromereProps = {
    color: string;
    width: number;
    height: number;
    x: number;
    opening: boolean;
};

export type CytobandHighlightProps = {
    x: (value: number) => number;
    height: number;
    width: number;
    highlight: Highlight;
    onMouseOver?: () => void;
    onMouseOut?: () => void;
    onClick?: () => void;
};