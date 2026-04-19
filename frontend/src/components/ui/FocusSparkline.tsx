type FocusSparklineProps = {
  data: number[];
  width: number;
  height: number;
};

function buildPoints(data: number[], width: number, height: number): string {
  if (data.length === 0) {
    return "";
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  return data
    .map((value, index) => {
      const x = Number((index * stepX).toFixed(2));
      const normalized = (value - min) / range;
      const y = Number((height - normalized * height).toFixed(2));
      return `${x},${y}`;
    })
    .join(" ");
}

export default function FocusSparkline({ data, width, height }: FocusSparklineProps) {
  if (data.length === 0) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Empty sparkline">
        <rect width={width} height={height} fill="transparent" />
      </svg>
    );
  }

  const points = buildPoints(data, width, height);
  const polygonPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Focus trend sparkline">
      <polygon points={polygonPoints} fill="#00C2CB" opacity={0.15} />
      <polyline points={points} fill="none" stroke="#00C2CB" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
