type BarChartSeries = {
  label: string;
  color: string;
  values: number[];
};

export function BarChart({
  categories,
  series,
  height = 220,
  formatValue = (v) => String(v),
}: {
  categories: string[];
  series: BarChartSeries[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (categories.length === 0) {
    return <p className="admin-empty">No hay datos para graficar en este rango.</p>;
  }

  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const barWidth = 18;
  const barGap = 4;
  const groupGap = 28;
  const groupWidth = series.length * barWidth + (series.length - 1) * barGap;
  const width = categories.length * (groupWidth + groupGap) + groupGap;
  const chartHeight = height - 28;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMinYMid meet"
        role="img"
        aria-label="Gráfico de barras"
      >
        <line x1={0} y1={chartHeight} x2={width} y2={chartHeight} stroke="var(--line)" />
        {categories.map((cat, ci) => {
          const groupX = groupGap / 2 + ci * (groupWidth + groupGap);
          return (
            <g key={cat}>
              {series.map((s, si) => {
                const value = s.values[ci] ?? 0;
                const barHeight = max > 0 ? (value / max) * (chartHeight - 8) : 0;
                const x = groupX + si * (barWidth + barGap);
                const y = chartHeight - barHeight;
                return (
                  <rect key={s.label} x={x} y={y} width={barWidth} height={barHeight} fill={s.color}>
                    <title>{`${s.label} · ${cat}: ${formatValue(value)}`}</title>
                  </rect>
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--ink-muted)"
              >
                {cat}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="admin-chart-legend">
        {series.map((s) => (
          <span key={s.label} className="admin-chart-legend__item">
            <span className="admin-chart-legend__swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
