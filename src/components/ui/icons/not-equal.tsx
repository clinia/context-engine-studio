import { iconProps, type IconProps } from "./icon-props";

export function NotEqualIcon(props: IconProps) {
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
      <path d="M222.69-307.31q-17.79 0-30.24-12.48T180-350.1q0-17.82 12.45-30.21 12.45-12.38 30.24-12.38h514.62q17.78 0 30.24 12.48Q780-367.73 780-349.91q0 17.83-12.45 30.22-12.46 12.38-30.24 12.38H222.69Zm0-260q-17.79 0-30.24-12.48T180-610.09q0-17.83 12.45-30.22 12.45-12.38 30.24-12.38h514.62q17.78 0 30.24 12.48Q780-627.73 780-609.9q0 17.82-12.45 30.21-12.46 12.38-30.24 12.38H222.69ZM356.44 -185.83A30 30 0 0 1 303.56 -214.17L603.56 -774.17A30 30 0 0 1 656.44 -745.83Z" />
    </svg>
  );
}
