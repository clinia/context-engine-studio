import { iconProps, type IconProps } from "./icon-props";

export function RemoveIcon(props: IconProps) {
  const { size, ...rest } = iconProps(props);
  return (
    <svg
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path d="M242.69-457.31q-9.64 0-16.16-6.58-6.53-6.58-6.53-16.31 0-9.72 6.53-16.11 6.52-6.38 16.16-6.38h474.62q9.64 0 16.16 6.58 6.53 6.58 6.53 16.31 0 9.72-6.53 16.11-6.52 6.38-16.16 6.38H242.69Z" />
    </svg>
  );
}
