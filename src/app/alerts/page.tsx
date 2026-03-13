"use client";

import { useEffect, useRef, useState } from "react";
import { fetchDashboardData, type SensorMapPoint } from "@/lib/dashboard";

// Parameters aligned with dashboard CurrentReadings.
// Add turbidity here once the backend API supplies it.
type ParameterKey = "ph" | "temperature" | "nitrate" | "dissolvedOxygen";
type AlertStatus = "active" | "resolved" | "dismissed";
type SensorReading = {
  id: string;
  location: string;
  values: Record<ParameterKey, number>;
};

type AlertItem = {
  id: string;
  parameter: ParameterKey;
  location: string;
  value: number;
  threshold: number;
  timestamp: number;
  status: AlertStatus;
};

type NotificationState = {
  visible: boolean;
  alertId: string | null;
  message: string;
};

const PARAMETER_META: Record<
  ParameterKey,
  { label: string; unit: string; threshold: number; min: number; max: number }
> = {
  ph: { label: "PH", unit: "pH", threshold: 8.5, min: 6.0, max: 10.0 },
  temperature: { label: "Temperature", unit: "C", threshold: 25.0, min: 15, max: 30 },
  nitrate: { label: "Nitrate", unit: "mg/L", threshold: 8.5, min: 0.5, max: 15 },
  dissolvedOxygen: { label: "Dissolved Oxygen", unit: "mg/L", threshold: 12.0, min: 4.0, max: 14.5 },
};

const PARAMETER_KEYS: ParameterKey[] = ["ph", "temperature", "nitrate", "dissolvedOxygen"];

const STORAGE_KEY = "iwis_alerts_v1";
const COUNTER_KEY = "iwis_alert_counter_v1";

function loadStoredAlerts(): AlertItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as AlertItem[];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: AlertItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // storage quota exceeded – silently ignore
  }
}

function loadStoredCounter(): number {
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    return raw ? Number(raw) : 1;
  } catch {
    return 1;
  }
}

function saveCounter(value: number) {
  try {
    localStorage.setItem(COUNTER_KEY, String(value));
  } catch {
    // ignore
  }
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-ZA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function evolveSensors(previous: SensorReading[]) {
  return previous.map((sensor) => {
    const nextValues = { ...sensor.values };

    for (const parameter of PARAMETER_KEYS) {
      const meta = PARAMETER_META[parameter];
      const range = meta.max - meta.min;
      const step = (Math.random() - 0.5) * range * 0.06;
      const driftBias = Math.random() < 0.15 ? range * 0.035 : 0;
      const nextValue = sensor.values[parameter] + step + driftBias;
      nextValues[parameter] = round(clamp(nextValue, meta.min, meta.max));
    }

    return {
      ...sensor,
      values: nextValues,
    };
  });
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [isSensorLoading, setIsSensorLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({
    visible: false,
    alertId: null,
    message: "",
  });
  const [highlightedAlertId, setHighlightedAlertId] = useState<string | null>(null);
  const [monitoring, setMonitoring] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);
  const alertCounterRef = useRef(1);
  const latestReadingsRef = useRef<SensorReading[]>([]);
  const activeKeysRef = useRef<Set<string>>(new Set());

  // Load persisted alerts and counter from localStorage after mount (client only).
  // Promise.resolve defers setState to avoid synchronous-in-effect lint rule.
  useEffect(() => {
    alertCounterRef.current = loadStoredCounter();
    Promise.resolve(loadStoredAlerts()).then((stored) => {
      if (stored.length > 0) {
        setAlerts(stored);
      }
    });
  }, []);

  useEffect(() => {
    fetchDashboardData("24h")
      .then((data) => {
        const sensors = data.mapPoints
          .filter((point): point is SensorMapPoint => point.type === "sensor")
          .map((point) => ({
            id: point.id,
            location: point.label,
            values: {
              ph: point.latestReadings.ph,
              nitrate: point.latestReadings.nitrate,
              temperature: point.latestReadings.temperature,
              dissolvedOxygen: point.latestReadings.dissolvedOxygen,
            },
          }));
        setSensorReadings(sensors);
        latestReadingsRef.current = sensors;
        setIsSensorLoading(false);
      })
      .catch(() => {
        setIsSensorLoading(false);
      });
  }, []);

  useEffect(() => {
    saveAlerts(alerts);
    activeKeysRef.current = new Set(
      alerts
        .filter((alert) => alert.status === "active")
        .map((alert) => `${alert.location}::${alert.parameter}`),
    );
  }, [alerts]);

  useEffect(() => {
    if (!monitoring) {
      return;
    }

    const timer = setInterval(() => {
      const previous = latestReadingsRef.current;
      const next = evolveSensors(previous);
      const now = Date.now();
      const newAlerts: AlertItem[] = [];

      for (const sensor of next) {
        const previousSensor = previous.find((item) => item.id === sensor.id);
        if (!previousSensor) {
          continue;
        }

        for (const parameter of PARAMETER_KEYS) {
          const threshold = PARAMETER_META[parameter].threshold;
          const previousValue = previousSensor.values[parameter];
          const nextValue = sensor.values[parameter];
          const alertKey = `${sensor.location}::${parameter}`;
          const crossedAboveThreshold =
            previousValue <= threshold && nextValue > threshold;

          if (!crossedAboveThreshold || activeKeysRef.current.has(alertKey)) {
            continue;
          }

          const id = `alert-${alertCounterRef.current}`;
          alertCounterRef.current += 1;
          saveCounter(alertCounterRef.current);
          activeKeysRef.current.add(alertKey);

          newAlerts.push({
            id,
            parameter,
            location: sensor.location,
            value: nextValue,
            threshold,
            timestamp: now,
            status: "active",
          });
        }
      }

      latestReadingsRef.current = next;
      setSensorReadings(next);

      if (newAlerts.length === 0) {
        return;
      }

      const newestAlert = newAlerts[0];
      setAlerts((current) => [...newAlerts, ...current]);
      setNotification({
        visible: true,
        alertId: newestAlert.id,
        message: `${PARAMETER_META[newestAlert.parameter].label} is high at ${newestAlert.location}`,
      });
      setHighlightedAlertId(newestAlert.id);
    }, 8000);

    return () => clearInterval(timer);
  }, [monitoring]);

  useEffect(() => {
    if (!notification.visible) {
      return;
    }

    const timeout = setTimeout(() => {
      setNotification((current) => ({ ...current, visible: false }));
    }, 8000);

    return () => clearTimeout(timeout);
  }, [notification.visible]);

  const activeCount = alerts.length;
  const [resolvedCount, setResolvedCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);

  const handlePopupClick = () => {
    if (!notification.alertId) {
      return;
    }

    setHighlightedAlertId(notification.alertId);
    setNotification((current) => ({ ...current, visible: false }));
    const alertElement = document.getElementById(notification.alertId);
    alertElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    panelRef.current?.focus();
  };

  const updateAlertStatus = (id: string, status: Exclude<AlertStatus, "active">) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
    if (status === "resolved") {
      setResolvedCount((current) => current + 1);
    } else {
      setDismissedCount((current) => current + 1);
    }
  };

  return (
    <section className="page-content alerts-page">
      <div className="alerts-header-row">
        <div>
          <h2 className="page-title">Alerts</h2>
          <p className="page-description alerts-description">
            Monitor threshold breaches in real time and respond quickly to high-risk parameters.
          </p>
        </div>
        <button
          type="button"
          className={`alerts-monitor-btn ${monitoring ? "is-active" : ""}`}
          onClick={() => setMonitoring((current) => !current)}
        >
          {monitoring ? "Monitoring On" : "Monitoring Paused"}
        </button>
      </div>

      <div className="alerts-summary-row">
        <article className="alerts-summary-card">
          <span>Active</span>
          <strong>{activeCount}</strong>
        </article>
        <article className="alerts-summary-card">
          <span>Resolved</span>
          <strong>{resolvedCount}</strong>
        </article>
        <article className="alerts-summary-card">
          <span>Dismissed</span>
          <strong>{dismissedCount}</strong>
        </article>
      </div>

      <div className="alerts-layout">
        <div className="alerts-main-panel">
          <div className="alerts-card">
            <h3>Live Sensor Data</h3>
            <p>Alerts are generated from these live readings whenever values cross thresholds.</p>
            {isSensorLoading ? (
              <p className="alerts-empty">Loading sensor data...</p>
            ) : (
              <table className="alerts-threshold-table">
                <thead>
                  <tr>
                    <th scope="col">Location</th>
                    <th scope="col">pH</th>
                    <th scope="col">Nitrate</th>
                    <th scope="col">Temp (C)</th>
                    <th scope="col">DO (mg/L)</th>
                  </tr>
                </thead>
                <tbody>
                  {sensorReadings.map((sensor) => (
                    <tr key={sensor.id}>
                      <td>{sensor.location}</td>
                      <td>{sensor.values.ph}</td>
                      <td>{sensor.values.nitrate}</td>
                      <td>{sensor.values.temperature}</td>
                      <td>{sensor.values.dissolvedOxygen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="alerts-card">
            <h3>Threshold Configuration</h3>
            <p>
              Alerts trigger automatically when a parameter value exceeds its configured threshold.
            </p>
            <table className="alerts-threshold-table">
              <thead>
                <tr>
                  <th scope="col">Parameter</th>
                  <th scope="col">Threshold</th>
                  <th scope="col">Unit</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PARAMETER_META) as ParameterKey[]).map((key) => (
                  <tr key={key}>
                    <td>{PARAMETER_META[key].label}</td>
                    <td>{PARAMETER_META[key].threshold}</td>
                    <td>{PARAMETER_META[key].unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="alerts-panel" ref={panelRef} tabIndex={-1}>
          <div className="alerts-panel__header">
            <h3>Alert Panel</h3>
            <span>{activeCount} active</span>
          </div>

          {alerts.length === 0 ? (
            <p className="alerts-empty">No alerts triggered yet.</p>
          ) : (
            <ul className="alerts-feed" aria-live="polite">
              {alerts.map((alert) => {
                const meta = PARAMETER_META[alert.parameter];
                const isHighlighted = highlightedAlertId === alert.id;
                return (
                  <li
                    key={alert.id}
                    id={alert.id}
                    className={`alerts-feed-item status-${alert.status} ${isHighlighted ? "is-highlighted" : ""}`}
                  >
                    <div className="alerts-feed-item__top">
                      <strong>{meta.label}</strong>
                      <span className={`alerts-status-chip status-${alert.status}`}>{alert.status}</span>
                    </div>
                    <p>
                      <span>Location:</span> {alert.location}
                    </p>
                    <p>
                      <span>Value:</span> {alert.value} {meta.unit} (threshold {alert.threshold} {meta.unit})
                    </p>
                    <p>
                      <span>Timestamp:</span> {formatTimestamp(alert.timestamp)}
                    </p>

                    {alert.status === "active" ? (
                      <div className="alerts-actions">
                        <button type="button" onClick={() => updateAlertStatus(alert.id, "resolved")}>
                          Resolve
                        </button>
                        <button type="button" onClick={() => updateAlertStatus(alert.id, "dismissed")}>
                          Dismiss
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      {notification.visible ? (
        <button type="button" className="alerts-toast" onClick={handlePopupClick}>
          <strong>New Alert Triggered</strong>
          <span>{notification.message}</span>
          <small>Click to open and highlight in the alert panel.</small>
        </button>
      ) : null}
    </section>
  );
}
