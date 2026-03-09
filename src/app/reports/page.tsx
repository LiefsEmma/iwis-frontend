"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type CitizenReport, fetchReports } from "@/lib/reports";

const ReportsLocationMap = dynamic(
  () => import("@/components/ReportsLocationMap"),
  {
    ssr: false,
    loading: () => <p className="state-text">Loading map...</p>,
  },
);

function formatReportDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function previewDescription(value: string): string {
  if (value.length <= 96) {
    return value;
  }

  return `${value.slice(0, 96).trim()}...`;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      try {
        const data = await fetchReports();

        if (!cancelled) {
          setReports(data);
          setSelectedReportId((current) => {
            if (current && data.some((report) => report.id === current)) {
              return current;
            }

            return data[0]?.id ?? null;
          });
          setLoadError(null);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Reports could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadReports();

    const interval = window.setInterval(loadReports, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? null,
    [reports, selectedReportId],
  );

  return (
    <section className="page-content reports-page">
      <header className="reports-page__header">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="page-description">
            View all submitted reports on the map and select any marker or list item
            to read the full report details.
          </p>
        </div>
        <Link className="reports-page__dashboard-link" href="/">
          Back to Dashboard
        </Link>
      </header>

      {isLoading && <p className="state-text">Loading reports...</p>}
      {!isLoading && loadError && <p className="state-text is-error">{loadError}</p>}

      {!isLoading && !loadError && (
        <div className="reports-layout">
          <article className="reports-card reports-map-card">
            <div className="reports-card__title-row">
              <h3>Map of Report Locations</h3>
              <span>{reports.length} reports</span>
            </div>

            <div className="reports-map" role="region" aria-label="Reports map with markers">
              <ReportsLocationMap
                reports={reports}
                selectedReportId={selectedReportId}
                onSelectReport={setSelectedReportId}
              />
            </div>
          </article>

          <article className="reports-card reports-detail-card">
            <h3>Full Report Details</h3>
            {selectedReport ? (
              <div className="report-detail">
                <Image
                  src={selectedReport.photoUrl}
                  alt={selectedReport.title}
                  width={800}
                  height={450}
                />
                <div>
                  <h4>{selectedReport.title}</h4>
                  <p>
                    <strong>Submitted:</strong> {formatReportDate(selectedReport.submittedAt)}
                  </p>
                  <p>
                    <strong>Location:</strong> {selectedReport.location.area}
                  </p>
                  <p>
                    <strong>Submitted by:</strong> {selectedReport.submittedBy}
                  </p>
                  <p>
                    <strong>Report type:</strong> {selectedReport.type}
                  </p>
                  <p>{selectedReport.description}</p>
                </div>
              </div>
            ) : (
              <p className="state-text">Select a marker or report to view details.</p>
            )}
          </article>

          <article className="reports-card reports-list-card">
            <h3>All Submitted Reports</h3>
            <ul className="reports-list">
              {reports.map((report) => {
                const isSelected = report.id === selectedReportId;

                return (
                  <li key={report.id}>
                    <button
                      type="button"
                      className={`reports-list__item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedReportId(report.id)}
                    >
                      <div className="reports-list__meta">
                        <strong>{report.location.area}</strong>
                        <span>{formatReportDate(report.submittedAt)}</span>
                      </div>
                      <p>{previewDescription(report.description)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
        </div>
      )}
    </section>
  );
}
