const COLORS = ["#2f2f2f", "#8a8a8a", "#c2c2c2", "#4b5aa6", "#a64b4b", "#4ba674", "#a68a4b"];

export function DonutChart({
  data,
  size = 180,
  formatValue = (v) => String(v),
}: {
  data: { label: string; value: number }[];
  size?: number;
  formatValue?: (v: number) => string;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total <= 0) {
    return <p className="admin-empty">No hay datos para graficar en este rango.</p>;
  }

  const radius = size / 2;
  const strokeWidth = radius * 0.4;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let offset = 0;
  const arcs = data.map((d, i) => {
    const fraction = d.value / total;
    const dash = fraction * circumference;
    const arc = {
      color: COLORS[i % COLORS.length],
      dasharray: `${dash} ${circumference - dash}`,
      dashoffset: -offset,
      label: d.label,
      value: d.value,
      fraction,
    };
    offset += dash;
    return arc;
  });

  return (
    <div className="admin-donut">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Gráfico de dona">
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={arc.dasharray}
              strokeDashoffset={arc.dashoffset}
            >
              <title>{`${arc.label}: ${formatValue(arc.value)} (${Math.round(arc.fraction * 100)}%)`}</title>
            </circle>
          ))}
        </g>
      </svg>
      <ul className="admin-donut__legend">
        {arcs.map((arc) => (
          <li key={arc.label}>
            <span className="admin-chart-legend__swatch" style={{ background: arc.color }} />
            {arc.label}
            <span className="meta" style={{ marginLeft: 6 }}>
              {formatValue(arc.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
