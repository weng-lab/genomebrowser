export default function BottomIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill={props.fill || "#000000"}
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        stroke={props.fill || "#000000"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M20 20H4m8-3V6m0 11l3-3m-3 3l-3-3"
      />
    </svg>
  );
}
