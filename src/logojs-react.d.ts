declare module "logojs-react" {
  import { FC } from "react";

  export interface DNALogoProps {
    ppm: any; // Replace 'any' with the correct type if known
    mode: string;
    width: number;
    height: number;
  }

  export declare type LetterProps =
    | React.SVGProps<SVGPathElement>
    | React.SVGProps<SVGRectElement>
    | React.SVGProps<SVGCircleElement>;

  export declare const A: React.FC<LetterProps>;
  export declare const C: React.FC<LetterProps>;
  export declare const G: React.FC<LetterProps>;
  export declare const T: React.FC<LetterProps>;

  export const DNALogo: FC<DNALogoProps>;
}
