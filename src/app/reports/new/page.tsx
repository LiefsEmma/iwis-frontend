"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

type ReportType = "field-worker" | "citizen-scientist" | "admin";

export default function NewReportPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportType, setReportType] = useState<ReportType>("citizen-scientist");
  const [photoName, setPhotoName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="page-content create-report-page">
      <header className="create-report-page__header">
        <div>
          <h2 className="page-title">Submit Citizen Sighting</h2>
          <p className="page-description">
            Capture a new report around Hartbeespoort Dam. Backend persistence
            can be connected later.
          </p>
        </div>

        <div className="create-report-page__actions">
          <Link className="reports-page__dashboard-link" href="/reports">
            Back to Reports
          </Link>
        </div>
      </header>

      <form className="create-report-form" onSubmit={onSubmit}>
        <div className="create-report-grid">
          <article className="create-report-map-panel">
            <div className="create-report-map-preview" aria-label="Map preview">
              <span className="create-report-map-pin" aria-hidden="true">
                📍
              </span>
              <span className="create-report-map-label">Hartbeespoort Dam</span>
            </div>

            <label className="create-report-upload-box" htmlFor="camera-upload">
              <span aria-hidden="true">📷</span>
              <span>Attach Photo</span>
            </label>
            <input
              id="camera-upload"
              type="file"
              accept="image/*"
              className="create-report-file-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPhotoName(file?.name ?? "");
              }}
            />
            {photoName && <p className="create-report-file-name">{photoName}</p>}
          </article>

          <article className="create-report-fields">
            <label className="create-report-label" htmlFor="report-title">
              Photo Upload
            </label>
            <input
              id="report-title"
              className="create-report-input"
              placeholder="Concern Sighting"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />

            <label className="create-report-label" htmlFor="report-description">
              Description
            </label>
            <textarea
              id="report-description"
              className="create-report-input create-report-textarea"
              placeholder="Describe what you observed..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />

            <label className="create-report-label" htmlFor="report-type">
              Report Type
            </label>
            <select
              id="report-type"
              className="create-report-input"
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
            >
              <option value="field-worker">Field Worker</option>
              <option value="citizen-scientist">Citizen Scientist</option>
              <option value="admin">Admin</option>
            </select>

            <button type="submit" className="create-report-submit-btn">
              Submit
            </button>
          </article>
        </div>

        {submitted && (
          <p className="create-report-success">
            Report captured for demo mode. We can connect this submit action to
            the backend endpoint next.
          </p>
        )}
      </form>
    </section>
  );
}
