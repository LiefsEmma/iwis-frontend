"use client";

import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import type { CitizenReport } from "@/lib/reports";

interface ReportsLocationMapProps {
  reports: CitizenReport[];
  selectedReportId: string | null;
  onSelectReport: (reportId: string) => void;
}

const HARTBEESPOORT_CENTER: [number, number] = [-25.7343, 27.8587];
const HARTBEESPOORT_BOUNDS: [[number, number], [number, number]] = [
  [-25.79, 27.79],
  [-25.68, 27.93],
];

export default function ReportsLocationMap({
  reports,
  selectedReportId,
  onSelectReport,
}: ReportsLocationMapProps) {
  return (
    <MapContainer
      center={HARTBEESPOORT_CENTER}
      zoom={12}
      minZoom={11}
      maxZoom={16}
      maxBounds={HARTBEESPOORT_BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom
      className="reports-map__canvas"
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {reports.map((report) => {
        const isSelected = report.id === selectedReportId;

        return (
          <CircleMarker
            key={report.id}
            center={[report.location.lat, report.location.lng]}
            radius={isSelected ? 10 : 8}
            pathOptions={{
              color: isSelected ? "#1f5f96" : "#9f2e1d",
              fillColor: isSelected ? "#2a75b8" : "#c6402b",
              fillOpacity: 0.88,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onSelectReport(report.id),
            }}
          />
        );
      })}
    </MapContainer>
  );
}
