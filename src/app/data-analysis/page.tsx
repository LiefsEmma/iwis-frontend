"use client";

import { useMemo, useState } from "react";

type VariableKey =
  | "ph"
  | "temperature"
  | "nitrateN"
  | "turbidity"
  | "dissolvedOxygen";

type UserRole = "Field Web" | "Field Worker" | "Citizenfield" | "Admin";

type DataSource =
  | "Hartbeespoort Dam"
  | "Upper Crocodile River"
  | "Canal Inlet"
  | "Wetland Outlet";

type DataPoint = {
  timestamp: number;
  role: UserRole;
  source: DataSource;
  values: Record<VariableKey, number>;
};

const VARIABLE_META: Array<{ key: VariableKey; label: string; unit: string }> = [
  { key: "ph", label: "PH", unit: "pH" },
  { key: "temperature", label: "Temp", unit: "C" },
  { key: "nitrateN", label: "Nitrate-N", unit: "mg/L" },
  { key: "turbidity", label: "Turbidity", unit: "NTU" },
  { key: "dissolvedOxygen", label: "DO", unit: "mg/L" },
];

const USER_ROLES: UserRole[] = [
  "Field Web",
  "Field Worker",
  "Citizenfield",
  "Admin",
];

const DATA_SOURCES: DataSource[] = [
  "Hartbeespoort Dam",
  "Upper Crocodile River",
  "Canal Inlet",
  "Wetland Outlet",
];

const ALL_VARIABLE_KEYS: VariableKey[] = VARIABLE_META.map((item) => item.key);

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildMockReadings(total = 320): DataPoint[] {
  const random = createSeededRandom(20260313);
  const now = Date.now();
  const points: DataPoint[] = [];

  for (let index = 0; index < total; index += 1) {
    const ageHours = (index / total) * 30 * 24;
    const timestamp = now - ageHours * 60 * 60 * 1000;
    const dayCycle = Math.sin((index / 12) * Math.PI);
    const drift = Math.sin((index / total) * Math.PI * 3);

    const temperature = 18 + dayCycle * 2.8 + drift * 1.3 + (random() - 0.5) * 1.6;
    const turbidity =
      12 + Math.max(0, drift) * 6 + Math.abs(dayCycle) * 2.5 + (random() - 0.5) * 3.4;
    const nitrateN =
      1.4 + turbidity * 0.09 + Math.max(0, drift) * 0.25 + (random() - 0.5) * 0.5;
    const ph = 7.25 - (temperature - 19) * 0.025 + (random() - 0.5) * 0.24;
    const dissolvedOxygen =
      10.4 - (temperature - 18) * 0.22 - nitrateN * 0.33 + (random() - 0.5) * 1.05;

    points.push({
      timestamp,
      role: USER_ROLES[Math.floor(random() * USER_ROLES.length)],
      source: DATA_SOURCES[Math.floor(random() * DATA_SOURCES.length)],
      values: {
        ph: round(clamp(ph, 6.3, 8.9)),
        temperature: round(clamp(temperature, 12, 28)),
        nitrateN: round(clamp(nitrateN, 0.3, 5.4)),
        turbidity: round(clamp(turbidity, 1.4, 42)),
        dissolvedOxygen: round(clamp(dissolvedOxygen, 2.2, 14.2)),
      },
    });
  }

  return points;
}

function calculateCorrelation(data: DataPoint[], left: VariableKey, right: VariableKey) {
  if (left === right) {
    return 1;
  }

  if (data.length < 2) {
    return 0;
  }

  const leftValues = data.map((point) => point.values[left]);
  const rightValues = data.map((point) => point.values[right]);

  const leftMean = leftValues.reduce((sum, value) => sum + value, 0) / leftValues.length;
  const rightMean = rightValues.reduce((sum, value) => sum + value, 0) / rightValues.length;

  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;

  for (let index = 0; index < data.length; index += 1) {
    const leftDiff = leftValues[index] - leftMean;
    const rightDiff = rightValues[index] - rightMean;
    numerator += leftDiff * rightDiff;
    leftVariance += leftDiff ** 2;
    rightVariance += rightDiff ** 2;
  }

  const denominator = Math.sqrt(leftVariance * rightVariance);
  return denominator === 0 ? 0 : numerator / denominator;
}

function getCorrelationColor(correlation: number) {
  const intensity = Math.abs(correlation);
  const alpha = 0.1 + intensity * 0.58;
  return `rgba(27, 82, 133, ${alpha.toFixed(3)})`;
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-ZA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVariableMeta(key: VariableKey) {
  return VARIABLE_META.find((item) => item.key === key);
}

const MOCK_READINGS = buildMockReadings();
const MOCK_REFERENCE_TIMESTAMP =
  MOCK_READINGS[MOCK_READINGS.length - 1]?.timestamp ?? 0;

export default function DataAnalysisPage() {
  const [timeRange, setTimeRange] = useState<"24h" | "30d">("24h");
  const [selectedRole, setSelectedRole] = useState<"all" | UserRole>("all");
  const [selectedSource, setSelectedSource] = useState<"all" | DataSource>("all");
  const [selectedVariables, setSelectedVariables] = useState<VariableKey[]>([
    "ph",
    "temperature",
    "nitrateN",
    "turbidity",
    "dissolvedOxygen",
  ]);
  const [scatterX, setScatterX] = useState<VariableKey>("temperature");
  const [scatterY, setScatterY] = useState<VariableKey>("dissolvedOxygen");

  const filteredData = useMemo(() => {
    const hours = timeRange === "24h" ? 24 : 24 * 30;
    const minTimestamp = MOCK_REFERENCE_TIMESTAMP - hours * 60 * 60 * 1000;

    return MOCK_READINGS.filter((item) => {
      if (item.timestamp < minTimestamp) {
        return false;
      }

      if (selectedRole !== "all" && item.role !== selectedRole) {
        return false;
      }

      if (selectedSource !== "all" && item.source !== selectedSource) {
        return false;
      }

      return true;
    });
  }, [timeRange, selectedRole, selectedSource]);

  const matrixVariables = useMemo(() => {
    if (selectedVariables.length >= 2) {
      return selectedVariables;
    }

    return ["temperature", "dissolvedOxygen"] as VariableKey[];
  }, [selectedVariables]);

  const matrixRows = useMemo(
    () =>
      matrixVariables.map((rowKey) => ({
        key: rowKey,
        values: matrixVariables.map((colKey) =>
          calculateCorrelation(filteredData, rowKey, colKey),
        ),
      })),
    [filteredData, matrixVariables],
  );

  const scatterPoints = useMemo(
    () =>
      filteredData.map((point) => ({
        x: point.values[scatterX],
        y: point.values[scatterY],
      })),
    [filteredData, scatterX, scatterY],
  );

  const strongestCorrelation = useMemo(() => {
    let bestPair = "-";
    let bestValue = -1;

    for (let rowIndex = 0; rowIndex < matrixVariables.length; rowIndex += 1) {
      for (let colIndex = rowIndex + 1; colIndex < matrixVariables.length; colIndex += 1) {
        const left = matrixVariables[rowIndex];
        const right = matrixVariables[colIndex];
        const correlation = Math.abs(calculateCorrelation(filteredData, left, right));

        if (correlation > bestValue) {
          const leftMeta = VARIABLE_META.find((meta) => meta.key === left);
          const rightMeta = VARIABLE_META.find((meta) => meta.key === right);
          bestPair = `${leftMeta?.label ?? left} / ${rightMeta?.label ?? right}`;
          bestValue = correlation;
        }
      }
    }

    return {
      pair: bestPair,
      value: bestValue < 0 ? 0 : bestValue,
    };
  }, [filteredData, matrixVariables]);

  const latestTimestamp = filteredData.length
    ? formatTimestamp(filteredData[filteredData.length - 1].timestamp)
    : "No data";

  const visibleSources = new Set(filteredData.map((item) => item.source)).size;
  const selectedVariableLabel = matrixVariables
    .map((key) => getVariableMeta(key)?.label ?? key)
    .join(" • ");
  const areAllVariablesSelected = selectedVariables.length === ALL_VARIABLE_KEYS.length;

  const toggleVariable = (variable: VariableKey) => {
    setSelectedVariables((current) => {
      if (current.includes(variable)) {
        if (current.length <= 2) {
          return current;
        }

        return current.filter((item) => item !== variable);
      }

      return [...current, variable];
    });
  };

  const scatterSvg = (() => {
    if (scatterPoints.length < 2) {
      return <p className="analysis-empty">Not enough points for a scatter plot.</p>;
    }

    const width = 640;
    const height = 280;
    const padding = { top: 18, right: 20, bottom: 30, left: 44 };
    const xValues = scatterPoints.map((point) => point.x);
    const yValues = scatterPoints.map((point) => point.y);
    const xMinRaw = Math.min(...xValues);
    const xMaxRaw = Math.max(...xValues);
    const yMinRaw = Math.min(...yValues);
    const yMaxRaw = Math.max(...yValues);
    const xPad = (xMaxRaw - xMinRaw || 1) * 0.08;
    const yPad = (yMaxRaw - yMinRaw || 1) * 0.12;
    const xMin = xMinRaw - xPad;
    const xMax = xMaxRaw + xPad;
    const yMin = yMinRaw - yPad;
    const yMax = yMaxRaw + yPad;

    const toX = (value: number) =>
      padding.left + ((value - xMin) / (xMax - xMin || 1)) * (width - padding.left - padding.right);
    const toY = (value: number) =>
      height -
      padding.bottom -
      ((value - yMin) / (yMax - yMin || 1)) * (height - padding.top - padding.bottom);

    const xMean = xValues.reduce((sum, value) => sum + value, 0) / xValues.length;
    const yMean = yValues.reduce((sum, value) => sum + value, 0) / yValues.length;
    let numerator = 0;
    let denominator = 0;

    for (let index = 0; index < scatterPoints.length; index += 1) {
      const dx = xValues[index] - xMean;
      numerator += dx * (yValues[index] - yMean);
      denominator += dx ** 2;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;
    const trendStartY = slope * xMin + intercept;
    const trendEndY = slope * xMax + intercept;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="analysis-scatter-svg" role="img" aria-label="Correlation scatter plot">
        {[0, 1, 2, 3, 4].map((tick) => {
          const ratio = tick / 4;
          const y = padding.top + ratio * (height - padding.top - padding.bottom);
          return <line key={`h-${tick}`} x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="analysis-gridline" />;
        })}

        {[0, 1, 2, 3, 4].map((tick) => {
          const ratio = tick / 4;
          const x = padding.left + ratio * (width - padding.left - padding.right);
          return <line key={`v-${tick}`} x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} className="analysis-gridline" />;
        })}

        {scatterPoints.map((point, index) => (
          <circle key={`${point.x}-${point.y}-${index}`} cx={toX(point.x)} cy={toY(point.y)} r={3.4} className="analysis-dot" />
        ))}

        <line x1={toX(xMin)} y1={toY(trendStartY)} x2={toX(xMax)} y2={toY(trendEndY)} className="analysis-trendline" />

        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="analysis-axis" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="analysis-axis" />
      </svg>
    );
  })();

  return (
    <section className="page-content analysis-page">
      <div className="analysis-top-row">
        <div>
          <h2 className="page-title">Data Analysis</h2>
          <p className="analysis-subtitle">
            Simulated water quality trends for UI testing and analytics validation.
          </p>
        </div>
        <div className="dashboard-toggle" aria-label="Time range">
          <button
            type="button"
            className={`dashboard-toggle-btn ${timeRange === "24h" ? "is-active" : ""}`}
            onClick={() => setTimeRange("24h")}
          >
            Last 24 Hours
          </button>
          <button
            type="button"
            className={`dashboard-toggle-btn ${timeRange === "30d" ? "is-active" : ""}`}
            onClick={() => setTimeRange("30d")}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      <div className="analysis-kpi-row" role="list" aria-label="Overview metrics">
        <article className="analysis-kpi" role="listitem">
          <span>Samples</span>
          <strong>{filteredData.length}</strong>
        </article>
        <article className="analysis-kpi" role="listitem">
          <span>Active sources</span>
          <strong>{visibleSources}</strong>
        </article>
        <article className="analysis-kpi" role="listitem">
          <span>Variables</span>
          <strong>{matrixVariables.length}</strong>
        </article>
        <article className="analysis-kpi" role="listitem">
          <span>Strongest |r|</span>
          <strong>{strongestCorrelation.value.toFixed(2)}</strong>
        </article>
      </div>

      <div className="analysis-layout">
        <div className="analysis-main-column">
          <div className="analysis-block">
            <div className="analysis-block-header">
              <div>
                <h3>Correlation Matrix</h3>
                <p>{selectedVariableLabel}</p>
              </div>
              <span>{filteredData.length} samples</span>
            </div>

            <div className="analysis-matrix-wrap">
              <table className="analysis-matrix">
                <thead>
                  <tr>
                    <th scope="col">Variable</th>
                    {matrixVariables.map((variable) => {
                      const meta = VARIABLE_META.find((item) => item.key === variable);
                      return (
                        <th scope="col" key={variable}>
                          {meta?.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => {
                    const rowMeta = VARIABLE_META.find((item) => item.key === row.key);
                    return (
                      <tr key={row.key}>
                        <th scope="row">{rowMeta?.label}</th>
                        {row.values.map((correlation, index) => (
                          <td
                            key={`${row.key}-${matrixVariables[index]}`}
                            style={{ backgroundColor: getCorrelationColor(correlation) }}
                            className={correlation > 0.82 ? "is-strong" : ""}
                            title={`r = ${correlation.toFixed(2)}`}
                          >
                            {correlation.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="analysis-block">
            <div className="analysis-block-header">
              <h3>Correlation Scatter Plot</h3>
              <div className="analysis-inline-controls">
                <label>
                  X-axis
                  <select value={scatterX} onChange={(event) => setScatterX(event.target.value as VariableKey)}>
                    {VARIABLE_META.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Y-axis
                  <select value={scatterY} onChange={(event) => setScatterY(event.target.value as VariableKey)}>
                    {VARIABLE_META.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <p className="analysis-scatter-meta">
              Correlating {getVariableMeta(scatterX)?.label} ({getVariableMeta(scatterX)?.unit}) against {" "}
              {getVariableMeta(scatterY)?.label} ({getVariableMeta(scatterY)?.unit}).
            </p>
            <div className="analysis-scatter-wrap">{scatterSvg}</div>
          </div>
        </div>

        <aside className="analysis-side-column">
          <div className="analysis-filters-card">
            <h3>Filters</h3>

            <div className="analysis-filter-group">
              <label htmlFor="source-filter">Data source</label>
              <select
                id="source-filter"
                value={selectedSource}
                onChange={(event) => setSelectedSource(event.target.value as "all" | DataSource)}
              >
                <option value="all">All sources</option>
                {DATA_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>

            <div className="analysis-filter-group">
              <span className="analysis-filter-label">Collector role</span>
              <div className="analysis-radio-list">
                <label>
                  <input
                    type="radio"
                    name="role-filter"
                    value="all"
                    checked={selectedRole === "all"}
                    onChange={() => setSelectedRole("all")}
                  />
                  All roles
                </label>
                {USER_ROLES.map((role) => (
                  <label key={role}>
                    <input
                      type="radio"
                      name="role-filter"
                      value={role}
                      checked={selectedRole === role}
                      onChange={() => setSelectedRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>

            <div className="analysis-filter-group">
              <div className="analysis-filter-heading">
                <span className="analysis-filter-label">Variables</span>
                <button
                  type="button"
                  className="analysis-all-btn"
                  onClick={() => setSelectedVariables(ALL_VARIABLE_KEYS)}
                  disabled={areAllVariablesSelected}
                >
                  All
                </button>
              </div>
              <div className="analysis-checkbox-list">
                {VARIABLE_META.map((item) => (
                  <label key={item.key}>
                    <input
                      type="checkbox"
                      checked={selectedVariables.includes(item.key)}
                      onChange={() => toggleVariable(item.key)}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              <p className="analysis-note">Select at least two variables for matrix view.</p>
            </div>

          </div>

          <div className="analysis-summary-card">
            <h3>Summary</h3>
            <div className="analysis-summary-grid">
              <div>
                <span>Latest sample</span>
                <strong>{latestTimestamp}</strong>
              </div>
              <div>
                <span>Strongest pair</span>
                <strong>{strongestCorrelation.pair}</strong>
              </div>
              <div>
                <span>Absolute r</span>
                <strong>{strongestCorrelation.value.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
