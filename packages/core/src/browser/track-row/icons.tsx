type SvgIconProps = Omit<React.SVGProps<SVGSVGElement>, "key" | "ref">;

export function BottomIcon(props: SvgIconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

export function TopIcon(props: SvgIconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        stroke={props.fill || "#000000"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M20 4H4m8 3v11m0-11l3 3m-3-3l-3 3"
      />
    </svg>
  );
}

export function SettingsIcon(props: SvgIconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill={props.fill || "#000000"}
        d="M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.37-.31-.6-.22l-2.49 1a7.28 7.28 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14.01 2h-4c-.25 0-.46.18-.5.42l-.38 2.65c-.61.24-1.18.56-1.69.98l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65a7.93 7.93 0 0 0 0 1.96l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.12.22.37.31.6.22l2.49-1c.51.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.38-2.65c.61-.24 1.18-.56 1.69-.98l2.49 1c.23.08.48 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
      />
    </svg>
  );
}

export function LoadingSpinner({
  width,
  height,
  color,
}: {
  width: number;
  height: number;
  color: string;
}) {
  return (
    <svg width={width} height={height} viewBox="0 0 40 40">
      <path
        opacity="0.2"
        fill={color}
        d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"
      />
      <path
        fill={color}
        d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0C22.32,8.481,24.301,9.057,26.013,10.047z"
      >
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
