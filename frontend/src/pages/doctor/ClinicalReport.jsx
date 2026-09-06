import { useEffect, useMemo, useState } from "react";
import { getCase, getClinicalReport } from "../../services/api";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const BACKEND_URL = API_BASE_URL.replace(/\/api\/?$/, "");

function buildUploadUrl(pathValue) {
  if (!pathValue) return "";

  let value = String(pathValue).trim();

  if (!value) return "";

  /* Already an absolute URL */
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  /*
   * Normalize Windows paths and URL paths.
   * This handles:
   *   D:\\...\\backend\\uploads\\file.png
   *   D:/.../backend/uploads/file.png
   *   /uploads/file.png
   *   uploads/file.png
   */
  const normalized = value.replace(/\\/g, "/");

  /* Find /uploads/ anywhere in an absolute backend path. */
  const uploadsMatch = normalized.match(/(?:^|\/)uploads\/(.+)$/i);

  if (uploadsMatch) {
    return `${BACKEND_URL}/uploads/${encodePath(uploadsMatch[1])}`;
  }

  /* Handle a plain uploads/... path. */
  const clean = normalized.replace(/^\/+/, "");

  if (/^uploads\//i.test(clean)) {
    return `${BACKEND_URL}/uploads/${encodePath(
      clean.substring("uploads/".length)
    )}`;
  }

  /* Handle a path already relative to the uploads folder. */
  return `${BACKEND_URL}/uploads/${encodePath(clean)}`;
}

function encodePath(pathValue) {
  return String(pathValue)
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function getEvidenceUrl(screeningId, type) {
  if (!screeningId) return "";

  const id = encodeURIComponent(String(screeningId));

  if (type === "fundus") {
    return `${API_BASE_URL}/cases/${id}/image`;
  }

  if (type === "gradcam") {
    return `${API_BASE_URL}/cases/${id}/gradcam`;
  }

  return "";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatConfidence(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return null;
  }

  /*
   * Supports both:
   * 0.9997
   * 99.9978
   */
  const percentage =
    number <= 1 ? number * 100 : number;

  return Math.min(Math.max(percentage, 0), 100);
}

function getStatusLabel(status) {
  const map = {
    PENDING: "Pending review",
    REVIEWED: "Reviewed",
    REFERRED: "Referred",
  };

  return map[status] || status || "—";
}

function normalizeReferralStatus(value) {
  if (!value) return null;

  const normalized = String(value).trim().toUpperCase();

  if (normalized === "REFERRED" || normalized === "REFERRAL_RECOMMENDED") {
    return "REFERRED";
  }

  if (
    normalized === "NOT_REFERRED" ||
    normalized === "NOT REFERRED" ||
    normalized === "NO_REFERRAL"
  ) {
    return "NOT_REFERRED";
  }

  return value;
}

function getSeverityTone(level) {
  const number = Number(level);

  if (number >= 2) {
    return {
      box: "bg-rose-50 border-rose-200",
      title: "text-rose-700",
      badge: "bg-rose-100 text-rose-700",
      bar: "bg-rose-500",
    };
  }

  if (number === 1) {
    return {
      box: "bg-amber-50 border-amber-200",
      title: "text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      bar: "bg-amber-500",
    };
  }

  return {
    box: "bg-emerald-50 border-emerald-200",
    title: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
  };
}

function EvidenceCard({
  title,
  subtitle,
  imageUrl,
  emptyText,
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  return (
    <div className="rounded-[24px] overflow-hidden border border-slate-200 bg-white print-evidence-card">
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>

      <div className="relative aspect-[16/10] bg-[#06171b] flex items-center justify-center overflow-hidden">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={title}
            loading="eager"
            decoding="async"
            className="w-full h-full object-contain"
            onError={(event) => {
              console.error(`Evidence image failed: ${title}`, imageUrl);
              event.currentTarget.style.display = "none";
              setImageError(true);
            }}
          />
        ) : (
          <div className="text-center px-8">
            <div className="w-16 h-16 mx-auto rounded-2xl border border-teal-300/20 bg-teal-300/5 flex items-center justify-center">
              <span className="text-teal-300 text-xl">◉</span>
            </div>
            <p className="text-white font-bold mt-4">
              {imageError ? "Evidence unavailable" : "Evidence pending"}
            </p>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              {imageError
                ? "The screening backend could not load this evidence file."
                : emptyText}
            </p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">Evidence source</span>
        <span className={`text-xs font-bold ${imageUrl && !imageError ? "text-emerald-600" : "text-slate-400"}`}>
          {imageUrl && !imageError ? "Available" : "Unavailable"}
        </span>
      </div>
    </div>
  );
}

function DetailCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 min-h-[82px]">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="font-semibold text-slate-800 mt-2 break-words">
        {value || "—"}
      </p>
    </div>
  );
}

function ProbabilityBar({
  label,
  probability,
  highlight,
}) {
  const value = Number(probability) || 0;

  const percentage =
    value <= 1 ? value * 100 : value;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>

        <span className="text-sm font-bold text-slate-500">
          {percentage.toFixed(3)}%
        </span>
      </div>

      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            highlight
              ? "bg-teal-500"
              : "bg-slate-300"
          }`}
          style={{
            width: `${Math.min(percentage, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function ClinicalReport({
  caseData,
  review,
  onBack,
  onDashboard,
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * Dashboard item should contain screeningId.
   */
  const screeningId =
    caseData?.screeningId ||
    caseData?.screening_id ||
    caseData?.id;

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      if (!screeningId) {
        setLoading(false);
        setError(
          "This case does not contain a valid screening ID."
        );
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await getClinicalReport(screeningId);

        if (cancelled) return;

        if (!response?.report) {
          throw new Error(
            "Clinical report data was not returned by the backend."
          );
        }

        let nextReport = response.report;

        // Compatibility fallback for report endpoints that were built before
        // quality_metrics was added to ai_results. The complete case endpoint
        // now exposes the same AI record including quality_metrics.
        if (!nextReport?.aiResult?.quality_metrics) {
          try {
            const caseResponse = await getCase(screeningId);
            const completeCase = caseResponse?.case;

            if (completeCase?.aiResult) {
              nextReport = {
                ...nextReport,
                aiResult: {
                  ...nextReport.aiResult,
                  ...completeCase.aiResult,
                },
              };
            }
          } catch (fallbackError) {
            console.warn(
              "Quality metrics fallback failed:",
              fallbackError
            );
          }
        }

        setReport(nextReport);
      } catch (err) {
        console.error(
          "Clinical report loading failed:",
          err
        );

        if (!cancelled) {
          setError(
            err.message ||
              "Failed to load clinical report."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [screeningId]);

  const ai = report?.aiResult || null;

  const qualityMetrics =
    ai?.quality_metrics ||
    ai?.qualityMetrics ||
    {};

  const patient = report?.patient || {};
  const caseInfo = report?.case || {};
  const clinic = report?.clinic || {};
  const doctorReview =
    report?.doctorReview || review || null;

  const confidence = formatConfidence(
    ai?.confidence
  );

  /*
   * Always use the dedicated case evidence endpoints.
   * They resolve the real database file paths on the backend and
   * are safer than constructing /uploads URLs in the browser.
   */
  const originalImageUrl = useMemo(
    () => getEvidenceUrl(screeningId, "fundus"),
    [screeningId]
  );

  const gradCamUrl = useMemo(
    () => getEvidenceUrl(screeningId, "gradcam"),
    [screeningId]
  );

  const severityTone = getSeverityTone(
    ai?.dr_level
  );

  const probabilities =
    ai?.probabilities ||
    ai?.class_probabilities ||
    [];

  const probabilityLabels =
    Array.isArray(ai?.class_labels) && ai.class_labels.length
      ? ai.class_labels
      : [
          "No DR",
          "Mild NPDR",
          "Moderate NPDR",
          "Severe NPDR",
          "Proliferative DR",
        ];

  async function handlePrint() {
    const urls = [originalImageUrl, gradCamUrl].filter(Boolean);

    // Preload and decode the evidence before Chrome starts print rendering.
    // A timeout prevents a missing backend image from blocking printing.
    await Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve) => {
            const image = new Image();
            let done = false;
            const finish = () => {
              if (done) return;
              done = true;
              resolve();
            };

            image.onload = async () => {
              try {
                if (image.decode) await image.decode();
              } catch {
                // The image loaded; decode is only an optimization.
              }
              finish();
            };
            image.onerror = finish;
            image.src = url;
            window.setTimeout(finish, 4000);
          })
      )
    );

    // Allow one layout frame before entering the browser print compositor.
    await new Promise((resolve) =>
      window.requestAnimationFrame(() => resolve())
    );
    window.setTimeout(() => window.print(), 50);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f8f8] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-teal-100 shadow-sm mx-auto flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-4 border-teal-100 border-t-teal-500 animate-spin" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mt-5">
            Loading clinical report
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            Retrieving patient, AI, image and review data
            from RetinaSafe backend...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f8f8] px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-[28px] border border-rose-200 shadow-sm p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-rose-500 font-bold">
              Report error
            </p>

            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              Unable to load clinical report
            </h1>

            <p className="text-slate-500 mt-3">
              {error}
            </p>

            <div className="flex gap-3 mt-7">
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Back to review
              </button>

              <button
                type="button"
                onClick={onDashboard}
                className="px-5 py-3 rounded-xl bg-[#071b20] text-white font-semibold hover:bg-teal-700"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const classification =
    ai?.classification || "Analysis unavailable";

  const drLevel =
    ai?.dr_level !== null &&
    ai?.dr_level !== undefined
      ? Number(ai.dr_level)
      : null;

  // AI recommendation is derived from the MATLAB grade.
  // This is intentionally kept separate from the doctor's final disposition.
  const aiReferralRecommended =
    drLevel !== null && drLevel >= 2;

  const doctorReferralStatus = normalizeReferralStatus(
    doctorReview?.referral_status ||
      doctorReview?.referralStatus ||
      doctorReview?.review?.referral_status
  );

  const reportStatus =
    getStatusLabel(caseInfo.status);

  const finalReferralStatus =
    doctorReferralStatus ||
    (caseInfo.status === "REFERRED" ? "REFERRED" : null);

  return (
    <div className="min-h-screen bg-[#f4f8f8] text-slate-900 print:bg-white">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 print:static">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 h-[76px] flex items-center justify-between">

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-11 h-11 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-lg hover:bg-slate-50 print:hidden"
            >
              ←
            </button>

            <div className="w-11 h-11 rounded-2xl bg-[#071b20] text-white flex items-center justify-center font-bold">
              RS
            </div>

            <div>
              <h1 className="font-bold text-lg">
                RetinaSafe
              </h1>

              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                Clinical report
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">
              Report ID
            </p>

            <p className="font-bold text-slate-800">
              {report?.reportId || `RPT-${caseInfo.caseId}`}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-6">

        <div className="print-page print-page-1">
        {/* =====================================================
            REPORT HEADER
        ===================================================== */}

        <section className="rounded-[30px] bg-[#071b20] text-white p-7 md:p-9 shadow-xl print:shadow-none">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7">

            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-teal-300 font-bold">
                Ophthalmologist clinical report
              </p>

              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">
                Screening report
              </h2>

              <p className="text-slate-300 mt-3 max-w-2xl leading-relaxed">
                RetinaSafe AI-assisted diabetic retinopathy
                screening record with retinal evidence,
                explainability and human clinical review.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 min-w-[230px]">
              <p className="text-xs text-slate-400">
                Case
              </p>

              <p className="text-xl font-bold mt-1">
                {caseInfo.caseId || "—"}
              </p>

              <p className="text-sm text-slate-400 mt-2">
                {formatDate(
                  caseInfo.screeningDate
                )}
              </p>
            </div>

          </div>
        </section>

        {/* =====================================================
            PATIENT
        ===================================================== */}

        <section className="bg-white rounded-[28px] border border-slate-200 p-6 md:p-7 shadow-sm">

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                01 · Patient
              </p>

              <h3 className="text-2xl font-bold mt-1">
                Patient & screening details
              </h3>
            </div>

            <span className="text-xs font-bold text-slate-400">
              Generated {formatDate(report?.generatedAt)}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">

            <DetailCard
              label="Patient"
              value={patient.fullName}
            />

            <DetailCard
              label="Patient ID"
              value={patient.patientCode}
            />

            <DetailCard
              label="Age / Sex"
              value={
                patient.age !== null &&
                patient.age !== undefined
                  ? `${patient.age} years · ${patient.sex || "—"}`
                  : patient.sex || "—"
              }
            />

            <DetailCard
              label="Screened eye"
              value={caseInfo.eye}
            />

            <DetailCard
              label="Clinic / PHC"
              value={clinic.name}
            />

            <DetailCard
              label="Screening reason"
              value={report?.screeningReason}
            />

            <DetailCard
              label="Worker"
              value={clinic.workerName}
            />

            <DetailCard
              label="Diabetes type"
              value={patient.diabetesType}
            />

            <DetailCard
              label="HbA1c"
              value={
                patient.hba1c !== null &&
                patient.hba1c !== undefined
                  ? `${patient.hba1c}%`
                  : "—"
              }
            />

          </div>
        </section>

        {/* =====================================================
            AI RESULT
        ===================================================== */}

        <section className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">

          <div className="bg-white rounded-[28px] border border-slate-200 p-6 md:p-7 shadow-sm">

            <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
              02 · AI result
            </p>

            <h3 className="text-2xl font-bold mt-1">
              Screening assessment
            </h3>

            <div
              className={`mt-6 rounded-[24px] border p-6 ${severityTone.box}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                    Classification
                  </p>

                  <h4
                    className={`text-2xl md:text-3xl font-bold mt-2 ${severityTone.title}`}
                  >
                    {classification}
                  </h4>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${severityTone.badge}`}
                >
                  {drLevel !== null
                    ? `Grade ${drLevel}`
                    : "Unclassified"}
                </span>

              </div>

              <div className="mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">
                    Model confidence
                  </span>

                  <span className="font-bold text-slate-800">
                    {confidence !== null
                      ? `${confidence.toFixed(2)}%`
                      : "—"}
                  </span>
                </div>

                <div className="h-2.5 rounded-full bg-white mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${severityTone.bar}`}
                    style={{
                      width: `${confidence || 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {aiReferralRecommended && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-rose-600 font-bold">
                  Referral recommendation
                </p>

                <p className="text-lg font-bold text-rose-800 mt-2">
                  Ophthalmic referral recommended
                </p>

                <p className="text-sm text-rose-700/80 mt-2 leading-relaxed">
                  The screening result is within the
                  prototype's referable severity range.
                  Specialist clinical evaluation is required.
                </p>
              </div>
            )}

            {doctorReview && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">
                  Human clinical disposition
                </p>
                <p className="text-lg font-bold text-slate-900 mt-2">
                  {finalReferralStatus === "REFERRED"
                    ? "Patient referred"
                    : finalReferralStatus === "NOT_REFERRED"
                      ? "Patient not referred"
                      : "Clinical review recorded"}
                </p>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  The ophthalmologist's decision is the final clinical workflow disposition and may differ from the AI recommendation.
                </p>
              </div>
            )}

          </div>

          <div className="bg-white rounded-[28px] border border-slate-200 p-6 md:p-7 shadow-sm">

            <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
              Case status
            </p>

            <h3 className="text-2xl font-bold mt-1">
              Clinical workflow
            </h3>

            <div className="mt-6 space-y-4">

              <StatusItem
                number="01"
                title="Image captured"
                value="Completed"
              />

              <StatusItem
                number="02"
                title="MATLAB analysis"
                value={
                  ai?.processing_status ||
                  "Completed"
                }
              />

              <StatusItem
                number="03"
                title="Ophthalmologist review"
                value={
                  doctorReview
                    ? "Completed"
                    : reportStatus
                }
              />

              <StatusItem
                number="04"
                title="Final clinical disposition"
                value={
                  doctorReview
                    ? finalReferralStatus === "REFERRED"
                      ? "REFERRED"
                      : finalReferralStatus === "NOT_REFERRED"
                        ? "NOT REFERRED"
                        : "REVIEWED"
                    : reportStatus
                }
              />

            </div>

          </div>

        </section>

        </div>

        <div className="print-page print-page-2">
        {/* =====================================================
            EVIDENCE
        ===================================================== */}

        <section className="bg-white rounded-[28px] border border-slate-200 p-6 md:p-7 shadow-sm">

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                03 · Evidence
              </p>

              <h3 className="text-2xl font-bold mt-1">
                Retinal evidence & explainability
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Original fundus image and MATLAB-generated
                Grad-CAM evidence.
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
              {gradCamUrl
                ? "Explainability available"
                : "Human review required"}
            </span>

          </div>

          <div className="grid lg:grid-cols-2 gap-5 print-evidence-grid">

            <EvidenceCard
              title="Original fundus image"
              subtitle={`${caseInfo.eye || "Eye"} · Captured screening image`}
              imageUrl={originalImageUrl}
              emptyText="The uploaded fundus image is not available."
            />

            <EvidenceCard
              title="Grad-CAM explanation"
              subtitle="MATLAB model attention visualization"
              imageUrl={gradCamUrl}
              emptyText="MATLAB did not return a Grad-CAM image for this case."
            />

          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-5">

            <DetailCard
              label="Image quality"
              value={
                ai?.quality_status
                  ? `${ai.quality_status}${
                      ai.quality_score !== null &&
                      ai.quality_score !== undefined
                        ? ` · ${Number(
                            ai.quality_score
                          ).toFixed(2)}/100`
                        : ""
                    }`
                  : "—"
              }
            />

            <DetailCard
              label="Grad-CAM"
              value={
                gradCamUrl
                  ? "Available"
                  : "Unavailable"
              }
            />

            <DetailCard
              label="Evidence source"
              value="RetinaSafe MATLAB pipeline"
            />

          </div>

        </section>

        {/* =====================================================
            FINDINGS
        ===================================================== */}

        <section className="bg-white rounded-[28px] border border-slate-200 p-6 md:p-7 shadow-sm">

          <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
            04 · Clinical findings
          </p>

          <h3 className="text-2xl font-bold mt-1">
            Structured findings
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Findings returned by the screening pipeline.
          </p>

          {report?.clinicalFindings?.length ? (
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              {report.clinicalFindings.map(
                (finding) => (
                  <div
                    key={finding.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <p className="text-xs uppercase tracking-wider text-teal-600 font-bold">
                      {finding.finding_type ||
                        "Clinical finding"}
                    </p>

                    <p className="font-semibold text-slate-800 mt-2">
                      {finding.finding_value ||
                        "Not supplied"}
                    </p>

                    <p className="text-xs text-slate-400 mt-3">
                      Recorded by screening pipeline
                    </p>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-6">
              <p className="font-semibold text-slate-700">
                No structured lesion-level findings
                were returned.
              </p>

              <p className="text-sm text-slate-500 mt-2">
                The current report uses the available
                MATLAB classification, quality assessment
                and Grad-CAM evidence.
              </p>
            </div>
          )}

        </section>


        {/* =====================================================
            QUALITY METRICS + PROBABILITIES
        ===================================================== */}

        <section className="bg-white rounded-[28px] border border-slate-200 p-6 md:p-7 shadow-sm">
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                Quality assessment
              </p>
              <h3 className="text-2xl font-bold mt-1">Image quality metrics</h3>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <DetailCard label="Overall score" value={ai?.quality_score !== null && ai?.quality_score !== undefined ? `${Number(ai.quality_score).toFixed(2)}/100` : "—"} />
                <DetailCard label="Quality status" value={ai?.quality_status || "—"} />
                <DetailCard label="Illumination" value={qualityMetrics.illumination !== null && qualityMetrics.illumination !== undefined ? Number(qualityMetrics.illumination).toFixed(1) : "—"} />
                <DetailCard label="Contrast" value={qualityMetrics.contrast !== null && qualityMetrics.contrast !== undefined ? Number(qualityMetrics.contrast).toFixed(1) : "—"} />
                <DetailCard label="Focus" value={qualityMetrics.focus !== null && qualityMetrics.focus !== undefined ? Number(qualityMetrics.focus).toFixed(1) : "—"} />
                <DetailCard label="Saturation" value={qualityMetrics.saturation !== null && qualityMetrics.saturation !== undefined ? Number(qualityMetrics.saturation).toFixed(1) : "—"} />
                <DetailCard label="Field of View" value={qualityMetrics.fieldOfView !== null && qualityMetrics.fieldOfView !== undefined ? Number(qualityMetrics.fieldOfView).toFixed(1) : "—"} />
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                Model output
              </p>
              <h3 className="text-2xl font-bold mt-1">Grade probabilities</h3>

              {probabilities.length > 0 ? (
                <div className="space-y-4 mt-5">
                  {probabilityLabels.map((label, index) => (
                    <ProbabilityBar
                      key={`${label}-${index}`}
                      label={`Grade ${index} — ${label}`}
                      probability={probabilities[index] || 0}
                      highlight={index === Number(ai?.dr_level)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-5">
                  Probability distribution was not returned for this case.
                </p>
              )}
            </div>
          </div>
        </section>
        </div>

        <div className="print-page print-page-3">
        {/* =====================================================
            DOCTOR REVIEW
        ===================================================== */}

        <section className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">

          <div className="bg-white rounded-[28px] border border-slate-200 p-6 md:p-7 shadow-sm">

            <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
              05 · Ophthalmologist review
            </p>

            <h3 className="text-2xl font-bold mt-1">
              Clinical decision
            </h3>

            {doctorReview ? (
              <div className="mt-6 space-y-4">

                <div className="rounded-2xl bg-teal-50 border border-teal-100 p-5">
                  <p className="text-xs uppercase tracking-wider text-teal-600 font-bold">
                    Decision
                  </p>

                  <p className="text-xl font-bold text-slate-900 mt-2">
                    {doctorReview.decision ||
                      doctorReview.review?.decision ||
                      "Recorded"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Reviewer
                  </p>

                  <p className="font-semibold mt-2">
                    {doctorReview.reviewer_name ||
                      doctorReview.reviewerName ||
                      doctorReview.review?.reviewer_name ||
                      "Ophthalmologist"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Clinical notes
                  </p>

                  <p className="text-sm text-slate-700 leading-relaxed mt-2 whitespace-pre-wrap">
                    {doctorReview.notes ||
                      doctorReview.review?.notes ||
                      "No additional notes recorded."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Final referral disposition
                  </p>

                  <p className={`text-lg font-bold mt-2 ${
                    finalReferralStatus === "REFERRED"
                      ? "text-rose-700"
                      : finalReferralStatus === "NOT_REFERRED"
                        ? "text-emerald-700"
                        : "text-slate-800"
                  }`}>
                    {finalReferralStatus === "REFERRED"
                      ? "Referred"
                      : finalReferralStatus === "NOT_REFERRED"
                        ? "Not referred"
                        : "Not recorded"}
                  </p>

                  <p className="text-xs text-slate-400 mt-2">
                    This is the ophthalmologist's final disposition and is separate from the AI recommendation.
                  </p>
                </div>

              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-100 p-5">
                <p className="font-bold text-amber-800">
                  Ophthalmologist review not recorded
                </p>

                <p className="text-sm text-amber-700/80 mt-2">
                  This report contains AI screening evidence,
                  but no final human clinical decision has
                  been recorded yet.
                </p>
              </div>
            )}

          </div>

          <aside className="space-y-4">

            <div className="bg-[#071b20] rounded-[28px] p-6 text-white shadow-xl">

              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-300 font-bold">
                Final workflow status
              </p>

              <p className="text-2xl font-bold mt-2">
                {doctorReview
                  ? "Clinical review completed"
                  : "Awaiting clinical review"}
              </p>

              <div className="mt-5 pt-5 border-t border-white/10 space-y-3">

                <StatusRow
                  label="Case"
                  value={caseInfo.caseId}
                />

                <StatusRow
                  label="Grade"
                  value={
                    drLevel !== null
                      ? `Grade ${drLevel}`
                      : "—"
                  }
                />

                <StatusRow
                  label="AI confidence"
                  value={
                    confidence !== null
                      ? `${confidence.toFixed(2)}%`
                      : "—"
                  }
                />

                <StatusRow
                  label="AI referral recommendation"
                  value={
                    aiReferralRecommended
                      ? "Recommended"
                      : "Not indicated"
                  }
                />

                <StatusRow
                  label="Final clinical disposition"
                  value={
                    finalReferralStatus === "REFERRED"
                      ? "REFERRED"
                      : finalReferralStatus === "NOT_REFERRED"
                        ? "NOT REFERRED"
                        : doctorReview
                          ? "REVIEWED"
                          : "Awaiting review"
                  }
                />

              </div>

            </div>

            <div className="bg-white rounded-[28px] border border-slate-200 p-6">

              <p className="font-bold">
                Clinical safety note
              </p>

              <p className="text-sm text-slate-500 leading-relaxed mt-2">
                RetinaSafe is a screening decision-support
                prototype. AI classification, confidence and
                Grad-CAM must be interpreted together with
                clinical evidence. Final diagnosis and
                treatment decisions remain with a qualified
                ophthalmologist.
              </p>

            </div>

          </aside>

        </section>

        {/* =====================================================
            SIGNATURES
        ===================================================== */}

        <section className="bg-white rounded-[28px] border border-slate-200 p-6 md:p-7 shadow-sm">

          <div className="grid md:grid-cols-2 gap-8">

            <SignatureBlock
              title="PHC / Screening worker"
              name={
                clinic.workerName ||
                "Screening worker"
              }
              id={clinic.workerId}
            />

            <SignatureBlock
              title="Ophthalmologist"
              name={
                doctorReview?.reviewer_name ||
                doctorReview?.reviewerName ||
                "Ophthalmologist"
              }
              id=""
            />

          </div>

        </section>

        </div>

        {/* =====================================================
            ACTIONS
        ===================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-10 print:hidden">

          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50"
          >
            ← Back to case review
          </button>

          <div className="flex gap-3">

            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-3 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-700"
            >
              Print / Save PDF
            </button>

            <button
              type="button"
              onClick={onDashboard}
              className="px-5 py-3 rounded-xl bg-[#071b20] text-white font-bold hover:bg-teal-700"
            >
              Dashboard
            </button>

          </div>

        </div>

      </main>

      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 7mm 8mm;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              width: 100% !important;
            }

            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .print\:hidden,
            button.print\:hidden {
              display: none !important;
            }

            /* Hide the interactive web header in the PDF. The report has its own
               printable header inside page 1. This prevents an empty first page. */
            header {
              display: none !important;
            }

            header > div {
              padding-left: 0 !important;
              padding-right: 0 !important;
              height: auto !important;
              min-height: 0 !important;
            }

            main {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }

            /* The screen report uses Tailwind space-y-6 on <main>.
               In print that margin was being added between the three A4
               wrappers, making each wrapper taller than one physical page
               and creating blank/extra sheets. Remove that inter-page gap. */
            main.space-y-6 > .print-page {
              margin-top: 0 !important;
            }

            /* EXACTLY THREE PRINT PAGES.
               Each wrapper is one A4 printable canvas.
               The wrapper itself must NOT be break-inside: avoid; Chrome can
               otherwise move an oversized wrapper to the next page and create
               an empty page before it. */
            .print-page {
              width: 100% !important;
              height: 281mm !important;
              min-height: 281mm !important;
              max-height: 281mm !important;
              box-sizing: border-box !important;
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            .print-page-1,
            .print-page-2 {
              margin-top: 0 !important;
              margin-bottom: 0 !important;
              break-after: page !important;
              page-break-after: always !important;
            }

            .print-page-3 {
              margin-top: 0 !important;
              margin-bottom: 0 !important;
              break-after: auto !important;
              page-break-after: auto !important;
            }

            .print-page > section {
              box-sizing: border-box !important;
              margin: 0 0 2mm 0 !important;
              padding: 3mm !important;
              box-shadow: none !important;
              border-radius: 2.5mm !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            .print-page > section:last-child {
              margin-bottom: 0 !important;
            }

            /* Font sizes are intentionally untouched. Only spacing is reduced. */

            /* Reclaim whitespace from Tailwind padding utilities. */
            .p-9, .md\:p-9, .p-8, .md\:p-8, .p-7, .md\:p-7 {
              padding: 3mm !important;
            }
            .p-6, .md\:p-6 { padding: 2.8mm !important; }
            .p-5 { padding: 2.5mm !important; }
            .p-4 { padding: 2mm !important; }
            .px-7 { padding-left: 3mm !important; padding-right: 3mm !important; }
            .px-6 { padding-left: 2.8mm !important; padding-right: 2.8mm !important; }
            .px-5 { padding-left: 2.5mm !important; padding-right: 2.5mm !important; }
            .py-7 { padding-top: 2.5mm !important; padding-bottom: 2.5mm !important; }
            .py-6 { padding-top: 2.3mm !important; padding-bottom: 2.3mm !important; }
            .py-5 { padding-top: 2mm !important; padding-bottom: 2mm !important; }
            .py-4 { padding-top: 1.7mm !important; padding-bottom: 1.7mm !important; }

            .gap-8 { gap: 3mm !important; }
            .gap-7 { gap: 3mm !important; }
            .gap-6 { gap: 2.5mm !important; }
            .gap-5 { gap: 2mm !important; }
            .gap-4 { gap: 1.8mm !important; }
            .gap-3 { gap: 1.2mm !important; }

            .grid {
              gap: 2mm !important;
            }

            .min-h-\[82px\] {
              min-height: 0 !important;
            }

            .space-y-8 > :not([hidden]) ~ :not([hidden]) { margin-top: 2mm !important; }
            .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.8mm !important; }
            .space-y-5 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5mm !important; }
            .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.3mm !important; }
            .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 1mm !important; }

            .mt-8 { margin-top: 2.5mm !important; }
            .mt-7 { margin-top: 2.5mm !important; }
            .mt-6 { margin-top: 2mm !important; }
            .mt-5 { margin-top: 1.5mm !important; }
            .mt-4 { margin-top: 1.2mm !important; }
            .mt-3 { margin-top: 1mm !important; }
            .mt-2 { margin-top: .7mm !important; }
            .mb-8 { margin-bottom: 2.5mm !important; }
            .mb-6 { margin-bottom: 2mm !important; }
            .mb-5 { margin-bottom: 1.5mm !important; }
            .mb-4 { margin-bottom: 1.2mm !important; }
            .mb-3 { margin-bottom: 1mm !important; }

            /* Evidence images remain large enough for clinical inspection. */
            .print-evidence-grid {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 2.5mm !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            .print-evidence-card {
              margin: 0 !important;
              break-inside: auto !important;
              page-break-inside: auto !important;
            }

            .print-evidence-card .aspect-\[16\/10\] {
              height: 42mm !important;
              min-height: 42mm !important;
              aspect-ratio: auto !important;
            }

            .print-evidence-card img {
              width: 100% !important;
              height: 100% !important;
              display: block !important;
              object-fit: contain !important;
            }

            .print-evidence-card > div:last-child {
              padding: 1.5mm 2.5mm !important;
            }

            .h-16 { height: 8mm !important; }

            h1, h2, h3, h4 {
              break-after: avoid !important;
              page-break-after: avoid !important;
            }

            /* Do not print interactive actions. */
            main > div:last-child {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function StatusItem({
  number,
  title,
  value,
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 border border-slate-100 p-4">

      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-teal-600">
        {number}
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="text-xs text-slate-400 mt-1">
          {value}
        </p>
      </div>

      <span className="text-teal-600 font-bold">
        ✓
      </span>

    </div>
  );
}

function StatusRow({
  label,
  value,
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-400">
        {label}
      </span>

      <span className="text-right font-semibold text-slate-200 max-w-[190px]">
        {value || "—"}
      </span>
    </div>
  );
}

function SignatureBlock({
  title,
  name,
  id,
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">
        {title}
      </p>

      <div className="h-16 border-b border-slate-300 mt-8" />

      <p className="font-semibold text-slate-800 mt-3">
        {name}
      </p>

      <p className="text-xs text-slate-400 mt-1">
        {id ? `ID: ${id}` : "Clinical reviewer"}
      </p>
    </div>
  );
}

export default ClinicalReport;