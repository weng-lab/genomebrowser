const PATH1 = `M446.324,367.381L262.857,41.692c-15.644-28.444-58.311-28.444-73.956,0L5.435,367.381
c-15.644,28.444,4.267,64,36.978,64h365.511C442.057,429.959,461.968,395.825,446.324,367.381z`;

const PATH2 = `M196.013,212.359l11.378,75.378c1.422,8.533,8.533,15.644,18.489,15.644l0,0
c8.533,0,17.067-7.111,18.489-15.644l11.378-75.378c2.844-18.489-11.378-34.133-29.867-34.133l0,0
C207.39,178.225,194.59,193.87,196.013,212.359z`;

/**
 * An error icon, consisting of a red exclamation point inside a triangle.
 * @param width the width of the icon relative to the containing SVG.
 * @param height the height of the icon relative to the containing SVG.
 */
export default function ErrorIcon({ width, height }: { width: number; height: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 451.74 481.74">
      <path fill="#E24C4B" d={PATH1} />
      <path fill="#FFFFFF" d="M225.879,63.025l183.467,325.689H42.413L225.879,63.025L225.879,63.025z" />
      <g>
        <path fill="#3F4448;" d={PATH2} />
        <circle fill="#3F4448" cx="225.879" cy="336.092" r="17.067" />
      </g>
    </svg>
  );
}
