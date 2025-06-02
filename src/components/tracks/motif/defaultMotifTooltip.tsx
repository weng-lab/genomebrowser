import { DNALogo } from "logojs-react";
import { MotifRect } from "./types";

export const DefaultMotifTooltip = (rect: MotifRect) => {
  console.log(rect);
  return (
    <g transform={`translate(0, ${-150})`}>
      <rect
        width={rect.pwm!.length * 20 + 10}
        height={150}
        fill="white"
        style={{ filter: "drop-shadow(0px 0px 5px rgba(0,0,0,0.3))" }}
      />
      {rect.pwm && <DNALogo ppm={rect.pwm} mode={"INFORMATION_CONTENT"} width={rect.pwm.length * 20} height={150} />}
    </g>
  );
};

export default DefaultMotifTooltip;
