export type TimeWindow = "24h" | "30d";

export type TrendMetric = "nitrate" | "phosphate" | "temperature";

export interface DashboardAlert {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
}

export interface CurrentReadings {
  ph: number;
  nitrate: number;
  temperature: number;
  dissolvedOxygen: number;
}

export type SensorSnapshot = CurrentReadings;

export interface TrendSeries {
  unit: string;
  points: number[];
}

export interface WeatherConditions {
  windSpeed: number;
  airTemp: number;
  windDirection: string;
}

export interface RecentReport {
  id: string;
  title: string;
  summary: string;
}

export interface SensorMapPoint {
  id: string;
  label: string;
  type: "sensor";
  lat: number;
  lng: number;
  latestReadings: SensorSnapshot;
}

export interface ReportMapPoint {
  id: string;
  label: string;
  type: "report";
  lat: number;
  lng: number;
  reportSummary: string;
  reportedAt: string;
}

export type MapPoint = SensorMapPoint | ReportMapPoint;

export interface PollutionHotspot {
  id: string;
  lat: number;
  lng: number;
  intensity: "low" | "medium" | "high";
  radiusMeters: number;
}

export interface DashboardData {
  locationName: string;
  alerts: DashboardAlert[];
  currentReadings: CurrentReadings;
  trends: Record<TrendMetric, TrendSeries>;
  weather: WeatherConditions;
  recentReports: RecentReport[];
  mapPoints: MapPoint[];
  pollutionHotspots: PollutionHotspot[];
  indices: {
    correlation: number;
    pollutionHeatmap: number;
  };
}

const HARTBEESPOORT_DAM_COORDS = {
  lat: -25.7343,
  lng: 27.8587,
};

function getMockData(window: TimeWindow): DashboardData {
  const longWindow = window === "30d";
  const sensorBaseline: SensorSnapshot = {
    ph: longWindow ? 7.1 : 7.2,
    nitrate: longWindow ? 7.6 : 8,
    temperature: longWindow ? 22 : 23,
    dissolvedOxygen: longWindow ? 5.8 : 5.6,
  };

  return {
    locationName: "Hartbeespoort Dam",
    alerts: [
      {
        id: "alert-1",
        title: "High nitrate levels detected",
        severity: "high",
      },
    ],
    currentReadings: {
      ...sensorBaseline,
    },
    trends: {
      nitrate: {
        unit: "mg/L",
        points: longWindow
          ? [1.1, 1.4, 1.8, 1.6, 2.2, 2.5, 2.1, 2.8, 2.4, 2.7]
          : [0.7, 1.2, 0.9, 2.8, 1.1, 0.8, 2.5, 0.6, 1.3, 0.7, 1.5, 0.9],
      },
      phosphate: {
        unit: "mg/L",
        points: longWindow
          ? [0.4, 0.5, 0.8, 1.1, 0.7, 0.9, 1.3, 1.2, 1, 0.9]
          : [0.2, 0.4, 0.6, 0.5, 0.7, 0.9, 0.6, 0.5, 0.8, 0.6, 0.7, 0.5],
      },
      temperature: {
        unit: "°C",
        points: longWindow
          ? [20, 21, 22, 23, 23, 24, 24, 23, 22, 22]
          : [21, 22, 22, 23, 24, 23, 24, 25, 24, 23, 23, 22],
      },
    },
    weather: {
      windSpeed: 12,
      airTemp: 24,
      windDirection: "NW",
    },
    recentReports: [
      {
        id: "report-1",
        title: "Hyacinth Sighting Near North Shore",
        summary:
          "Citizen reported sighting of water hyacinths near the north shore.",
      },
      {
        id: "report-2",
        title: "Algae Bloom Report by Citizen",
        summary:
          "Citizen reported algae bloom near the dam's central basin.",
      },
    ],
    mapPoints: [
      {
        id: "sensor-north-shore",
        label: "North Shore Sensor",
        type: "sensor",
        lat: HARTBEESPOORT_DAM_COORDS.lat + 0.011,
        lng: HARTBEESPOORT_DAM_COORDS.lng - 0.03,
        latestReadings: {
          ph: sensorBaseline.ph,
          nitrate: sensorBaseline.nitrate,
          temperature: sensorBaseline.temperature,
          dissolvedOxygen: sensorBaseline.dissolvedOxygen,
        },
      },
      {
        id: "sensor-central-basin",
        label: "Central Basin Sensor",
        type: "sensor",
        lat: HARTBEESPOORT_DAM_COORDS.lat - 0.004,
        lng: HARTBEESPOORT_DAM_COORDS.lng + 0.006,
        latestReadings: {
          ph: longWindow ? 7 : 7.1,
          nitrate: longWindow ? 8.1 : 8.4,
          temperature: longWindow ? 22.4 : 23.2,
          dissolvedOxygen: longWindow ? 5.7 : 5.4,
        },
      },
      {
        id: "report-east-bay",
        label: "Citizen Report - East Bay",
        type: "report",
        lat: HARTBEESPOORT_DAM_COORDS.lat - 0.021,
        lng: HARTBEESPOORT_DAM_COORDS.lng + 0.04,
        reportSummary:
          "Floating debris and algae accumulation observed near the eastern shoreline.",
        reportedAt: "2026-03-08T14:22:00Z",
      },
      {
        id: "report-west-inlet",
        label: "Citizen Report - West Inlet",
        type: "report",
        lat: HARTBEESPOORT_DAM_COORDS.lat + 0.016,
        lng: HARTBEESPOORT_DAM_COORDS.lng + 0.012,
        reportSummary:
          "Possible sewage inflow odor detected near the west inlet after rainfall.",
        reportedAt: "2026-03-09T08:05:00Z",
      },
    ],
    pollutionHotspots: [
      {
        id: "hotspot-east-shore",
        lat: HARTBEESPOORT_DAM_COORDS.lat - 0.014,
        lng: HARTBEESPOORT_DAM_COORDS.lng + 0.028,
        intensity: "high",
        radiusMeters: 640,
      },
      {
        id: "hotspot-central",
        lat: HARTBEESPOORT_DAM_COORDS.lat - 0.002,
        lng: HARTBEESPOORT_DAM_COORDS.lng + 0.004,
        intensity: "medium",
        radiusMeters: 520,
      },
      {
        id: "hotspot-northwest",
        lat: HARTBEESPOORT_DAM_COORDS.lat + 0.011,
        lng: HARTBEESPOORT_DAM_COORDS.lng - 0.019,
        intensity: "low",
        radiusMeters: 430,
      },
    ],
    indices: {
      correlation: longWindow ? 0.81 : 0.76,
      pollutionHeatmap: longWindow ? 67 : 72,
    },
  };
}

function isDashboardData(payload: unknown): payload is DashboardData {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<DashboardData>;
  return Boolean(
    candidate.locationName &&
      candidate.currentReadings &&
      candidate.trends &&
      candidate.weather &&
      Array.isArray(candidate.recentReports) &&
      Array.isArray(candidate.mapPoints) &&
      Array.isArray(candidate.pollutionHotspots),
  );
}

async function fetchDashboardFromBackend(
  window: TimeWindow,
): Promise<DashboardData | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    return null;
  }

  const endpoint = `${apiBaseUrl.replace(/\/$/, "")}/dashboard?window=${window}`;

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Dashboard request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    return isDashboardData(payload) ? payload : null;
  } catch (error) {
    console.warn("Falling back to mock dashboard data", error);
    return null;
  }
}

export async function fetchDashboardData(window: TimeWindow): Promise<DashboardData> {
  const backendData = await fetchDashboardFromBackend(window);
  if (backendData) {
    return backendData;
  }

  return getMockData(window);
}
