import { UsdcIcon } from "./UsdcIcon";

interface Props {
  amount: string | number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function UsdcAmount({ amount, size = 13, className = "", style }: Props) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: `${size}px`, ...style }}
    >
      <UsdcIcon size={size} />
      {amount} USDC
    </span>
  );
}
