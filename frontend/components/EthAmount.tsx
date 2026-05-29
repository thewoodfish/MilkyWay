import { EthIcon } from "./EthIcon";

interface Props {
  amount: string | number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function EthAmount({ amount, size = 13, className = "", style }: Props) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: "3px", ...style }}
    >
      <EthIcon size={size} />
      {amount} ETH
    </span>
  );
}
