export interface ReportLocation {
  lat: number;
  lng: number;
  area: string;
}

export interface CitizenReport {
  id: string;
  title: string;
  type: "field-worker" | "citizen-scientist" | "admin";
  submittedBy: string;
  description: string;
  photoUrl: string;
  submittedAt: string;
  location: ReportLocation;
}

const MOCK_REPORTS: CitizenReport[] = [
  {
    id: "rep-1001",
    title: "Foam Build-Up Near South Pier",
    type: "field-worker",
    submittedBy: "Thabo M.",
    description:
      "Visible white foam concentrated near the south pier for roughly 40 meters. Water odor is stronger than normal.",
    photoUrl: "/report-photo.svg",
    submittedAt: "2026-03-08T10:22:00.000Z",
    location: {
      lat: -25.7468,
      lng: 27.8438,
      area: "South Pier",
    },
  },
  {
    id: "rep-1002",
    title: "Algae Bloom at Northern Bank",
    type: "citizen-scientist",
    submittedBy: "Lerato K.",
    description:
      "Dark green algae mats observed drifting toward the boat launch area. Approximate spread: 80 to 120 meters.",
    photoUrl: "/report-photo.svg",
    submittedAt: "2026-03-08T14:10:00.000Z",
    location: {
      lat: -25.7219,
      lng: 27.8718,
      area: "Northern Bank",
    },
  },
  {
    id: "rep-1003",
    title: "Dead Fish Sighting",
    type: "field-worker",
    submittedBy: "Nomsa P.",
    description:
      "Three dead fish located close to shallow reeds. No visible oil slick, but water clarity is low.",
    photoUrl: "/report-photo.svg",
    submittedAt: "2026-03-09T06:35:00.000Z",
    location: {
      lat: -25.733,
      lng: 27.8894,
      area: "Eastern Reeds",
    },
  },
  {
    id: "rep-1004",
    title: "Illegal Dumping Signs",
    type: "admin",
    submittedBy: "IWIS Admin",
    description:
      "Plastic bags and mixed waste found along the western shore footpath. Team cleanup requested.",
    photoUrl: "/report-photo.svg",
    submittedAt: "2026-03-09T09:42:00.000Z",
    location: {
      lat: -25.7408,
      lng: 27.8299,
      area: "Western Shore",
    },
  },
];

function isReportType(value: unknown): value is CitizenReport["type"] {
  return value === "field-worker" || value === "citizen-scientist" || value === "admin";
}

function isCitizenReport(value: unknown): value is CitizenReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<CitizenReport>;

  return Boolean(
    typeof report.id === "string" &&
      typeof report.title === "string" &&
      isReportType(report.type) &&
      typeof report.submittedBy === "string" &&
      typeof report.description === "string" &&
      typeof report.photoUrl === "string" &&
      typeof report.submittedAt === "string" &&
      report.location &&
      typeof report.location.area === "string" &&
      typeof report.location.lat === "number" &&
      typeof report.location.lng === "number",
  );
}

async function fetchReportsFromBackend(): Promise<CitizenReport[] | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    return null;
  }

  const endpoint = `${apiBaseUrl.replace(/\/$/, "")}/reports`;

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Reports request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      return null;
    }

    return payload.filter((report): report is CitizenReport => isCitizenReport(report));
  } catch (error) {
    console.warn("Falling back to mock reports data", error);
    return null;
  }
}

export async function fetchReports(): Promise<CitizenReport[]> {
  const backendData = await fetchReportsFromBackend();
  const reports = backendData && backendData.length > 0 ? backendData : MOCK_REPORTS;

  return [...reports].sort((a, b) => {
    const left = Date.parse(a.submittedAt);
    const right = Date.parse(b.submittedAt);
    return right - left;
  });
}
