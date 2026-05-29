export function EthIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 417"
      fill="currentColor"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
      aria-hidden="true"
    >
      <polygon points="127.961,0 125.166,9.5 125.166,285.168 127.961,287.958 255.923,212.32" opacity="0.85" />
      <polygon points="127.962,0 0,212.32 127.962,287.958 127.962,154.158" opacity="0.65" />
      <polygon points="127.961,312.187 126.386,314.107 126.386,412.306 127.961,417 255.999,236.587" opacity="0.85" />
      <polygon points="127.962,417 127.962,312.187 0,236.587" opacity="0.65" />
      <polygon points="127.961,287.958 255.921,212.321 127.961,154.159" />
      <polygon points="0,212.321 127.961,287.958 127.961,154.159" opacity="0.75" />
    </svg>
  );
}
