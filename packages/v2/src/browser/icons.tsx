export function LoadingSpinner({ width, height, color }: { width: number; height: number; color: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 40 40">
      <path
        opacity="0.2"
        fill={color}
        d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"
      />
      <path fill={color} d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0C22.32,8.481,24.301,9.057,26.013,10.047z">
        <animateTransform
          attributeType="xml"
          attributeName="transform"
          type="rotate"
          from="0 20 20"
          to="360 20 20"
          dur="0.5s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

export function ErrorIcon({ width, height, outline, inside }: { width: number; height: number; outline: string; inside: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 451.74 481.74">
      <path
        fill={outline}
        d="M446.324,367.381L262.857,41.692c-15.644-28.444-58.311-28.444-73.956,0L5.435,367.381c-15.644,28.444,4.267,64,36.978,64h365.511C442.057,429.959,461.968,395.825,446.324,367.381z"
      />
      <path fill={inside} d="M225.879,63.025l183.467,325.689H42.413L225.879,63.025L225.879,63.025z" />
      <path
        fill="#3F4448"
        d="M196.013,212.359l11.378,75.378c1.422,8.533,8.533,15.644,18.489,15.644l0,0c8.533,0,17.067-7.111,18.489-15.644l11.378-75.378c2.844-18.489-11.378-34.133-29.867-34.133l0,0C207.39,178.225,194.59,193.87,196.013,212.359z"
      />
      <circle fill="#3F4448" cx="225.879" cy="336.092" r="17.067" />
    </svg>
  );
}

export function TopIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke={props.fill || "#000000"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 4H4m8 3v11m0-11l3 3m-3-3l-3 3" />
    </svg>
  );
}

export function BottomIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke={props.fill || "#000000"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 20H4m8-3V6m0 11l3-3m-3 3l-3-3" />
    </svg>
  );
}
