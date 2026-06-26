export type Status = "missing" | "found";

const config: Record<Status, { label: string; color: string; pulse: boolean }> = {
  missing: { label: "NO LOCALIZADO", color: "#cc1111", pulse: true  },
  found:   { label: "LOCALIZADO",    color: "#22a05a", pulse: false },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, color, pulse } = config[status] ?? config.unknown;
  return (
    <span
      style={{
        backgroundColor: `${color}22`,
        color,
        border: `1px solid ${color}66`,
        fontFamily: "var(--mono)",
        fontSize: "0.65rem",
        fontWeight: 600,
        letterSpacing: "0.12em",
        padding: "2px 8px",
        borderRadius: 2,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        whiteSpace: "nowrap",
      }}
    >
      {pulse && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: color,
            animation: "pulse-red 1.4s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
      )}
      {label}
    </span>
  );
}
