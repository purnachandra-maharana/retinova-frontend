import { useEffect, useMemo, useState } from "react";
import { sendScreeningToDoctor } from "../../services/api";

/*
  RetinaSafe — Step 6: Screening Result

  This component displays the REAL result returned by MATLAB through
  the backend. It does not calculate or invent a diagnosis locally.

  Expected analysisResult shape:
    {
      caseId,
      quality,
      prediction,
      referral,
      gradcam,
      clinicalMessage,
      aiResult
    }
*/

function ScreeningResult({
  patient,
  selectedEye,
  imageFile,
  screeningId,
  analysisResult,
  onBack,
  onRestart,
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [sendState, setSendState] = useState("idle");
  const [sendError, setSendError] = useState("");

  const eyeName =
    selectedEye === "left"
      ? "Left Eye"
      : selectedEye === "right"
      ? "Right Eye"
      : "Selected Eye";

  const qualityStatus =
    analysisResult?.quality?.status ||
    analysisResult?.aiResult?.quality_status ||
    "UNKNOWN";

  const qualityScore =
    analysisResult?.quality?.score ??
    analysisResult?.aiResult?.quality_score ??
    null;

  const prediction = analysisResult?.prediction || {};

  const grade =
    prediction?.grade ??
    analysisResult?.aiResult?.dr_level ??
    null;

  const classification =
    prediction?.label ||
    analysisResult?.aiResult?.classification ||
    "Classification unavailable";

  const confidence =
    prediction?.confidence ??
    analysisResult?.aiResult?.confidence ??
    null;

  /*
   * IMPORTANT:
   * MATLAB's S10_final_clinical_pipeline.m writes the five values here:
   *
   * quality.metrics.brightness
   * quality.metrics.contrast
   * quality.metrics.sharpness
   * quality.metrics.saturation
   * quality.metrics.retinalCoverage
   *
   * The same response also contains the original quality fields:
   *
   * quality.brightnessScore
   * quality.contrastScore
   * quality.sharpnessScore
   * quality.saturationScore
   * quality.retinalCoverageScore
   *
   * Prefer these direct MATLAB values over the database aiResult object.
   * This prevents an older DB record containing 0 values from overriding
   * the real values returned by the current MATLAB analysis.
   */

  const matlabMetrics =
    analysisResult?.quality?.metrics || {};

  const matlabQuality =
    analysisResult?.quality?.details || {};

  const storedMetrics =
    analysisResult?.aiResult?.quality_metrics || {};

  const numeric = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const pick = (...values) => {
    for (const value of values) {
      const n = numeric(value);
      if (n !== null) return n;
    }
    return null;
  };

  const qualityMetrics = {
    illumination: pick(
      matlabMetrics.brightness,
      matlabQuality.brightnessScore,
      matlabQuality.brightness,
      storedMetrics.illumination,
      storedMetrics.brightnessScore,
      storedMetrics.brightness
    ),

    contrast: pick(
      matlabMetrics.contrast,
      matlabQuality.contrastScore,
      matlabQuality.contrast,
      storedMetrics.contrast,
      storedMetrics.contrastScore
    ),

    focus: pick(
      matlabMetrics.sharpness,
      matlabQuality.sharpnessScore,
      matlabQuality.sharpness,
      storedMetrics.focus,
      storedMetrics.sharpnessScore,
      storedMetrics.sharpness
    ),

    saturation: pick(
      matlabMetrics.saturation,
      matlabQuality.saturationScore,
      matlabQuality.saturation,
      storedMetrics.saturation,
      storedMetrics.saturationScore
    ),

    fieldOfView: pick(
      matlabMetrics.retinalCoverage,
      matlabQuality.retinalCoverageScore,
      matlabQuality.retinalCoverage,
      storedMetrics.fieldOfView,
      storedMetrics.retinalCoverageScore,
      storedMetrics.retinalCoverage
    ),
  };

  const probabilityValues =
    Array.isArray(prediction?.probabilities)
      ? prediction.probabilities
      : Array.isArray(analysisResult?.aiResult?.probabilities)
        ? analysisResult.aiResult.probabilities
        : [];

  const probabilityLabels =
    Array.isArray(prediction?.classLabels)
      ? prediction.classLabels
      : Array.isArray(analysisResult?.aiResult?.class_labels)
        ? analysisResult.aiResult.class_labels
        : [
            "No DR",
            "Mild NPDR",
            "Moderate NPDR",
            "Severe NPDR",
            "Proliferative DR",
          ];

  const referralRequired =
    analysisResult?.referral?.required ??
    (typeof grade === "number" ? grade >= 2 : false);

  const gradCamPath =
    analysisResult?.gradcam?.url ||
    analysisResult?.aiResult?.gradcam_path ||
    "";

  const clinicalMessage =
    analysisResult?.clinicalMessage ||
    "The MATLAB screening pipeline has completed analysis.";

  const caseId =
    analysisResult?.caseId ||
    analysisResult?.aiResult?.case_id ||
    "Not available";

  const patientCode =
    patient?.patientId ||
    analysisResult?.aiResult?.patient_code ||
    "Not available";

  const apiBase =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const backendOrigin = useMemo(() => {
    try {
      return new URL(apiBase).origin;
    } catch {
      return "http://localhost:5000";
    }
  }, [apiBase]);

  const gradCamUrl = useMemo(() => {
    if (!gradCamPath) return "";

    if (
      gradCamPath.startsWith("http://") ||
      gradCamPath.startsWith("https://") ||
      gradCamPath.startsWith("data:")
    ) {
      return gradCamPath;
    }

    return `${backendOrigin}${
      gradCamPath.startsWith("/") ? "" : "/"
    }${gradCamPath}`;
  }, [gradCamPath, backendOrigin]);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl("");
      return undefined;
    }

    if (typeof imageFile === "string") {
      setImageUrl(imageFile);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImageUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const isPoor = qualityStatus.toUpperCase() === "POOR";
  const isBorderline =
    qualityStatus.toUpperCase() === "BORDERLINE";

  const confidenceText =
    confidence === null || confidence === undefined
      ? "—"
      : `${Number(confidence).toFixed(2)}%`;

  const qualityText =
    qualityScore === null || qualityScore === undefined
      ? "—"
      : `${Number(qualityScore).toFixed(2)}/100`;

  const gradeText =
    grade === null || grade === undefined
      ? "—"
      : `Grade ${grade}`;

  const handleSendToDoctor = async () => {
    if (!screeningId) {
      setSendError(
        "Screening ID is unavailable. The case cannot be sent yet."
      );
      return;
    }

    try {
      setSendError("");
      setSendState("sending");

      await sendScreeningToDoctor(screeningId);

      setSendState("sent");
    } catch (error) {
      console.error("Send case to doctor failed:", error);

      setSendState("error");
      setSendError(
        error?.message ||
          "Unable to send the screening to the ophthalmologist."
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#f4f8f8] text-slate-900 print:bg-white">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <header className="h-20 bg-white border-b border-slate-200 px-5 md:px-10 flex items-center justify-between print:hidden">
        <div>
          <h1 className="font-bold text-lg tracking-tight">
            RetinaSafe
          </h1>

          <p className="text-xs text-teal-700 uppercase tracking-[0.2em] font-bold mt-1">
            PHC Screening
          </p>
        </div>

        <div className="text-sm text-slate-500">
          Step <b className="text-slate-900">6</b> of 6
        </div>
      </header>

      {/* =========================================================
          PROGRESS
      ========================================================= */}
      <ProgressBar active={5} />

      <main className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-10">
        {/* =======================================================
            TITLE
        ======================================================= */}
        <section className="text-center max-w-3xl mx-auto">
          <span className="inline-flex px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-[0.14em]">
            Step 6 · Screening Result
          </span>

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-5">
            Screening Assessment
          </h2>

          <p className="text-slate-500 mt-3 leading-relaxed">
            AI-assisted diabetic retinopathy screening result generated
            from the MATLAB clinical pipeline.
          </p>
        </section>

        {/* =======================================================
            PATIENT / CASE SUMMARY
        ======================================================= */}
        <section className="mt-8 bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-teal-700 font-bold">
                Patient & screening
              </p>

              <h3 className="text-2xl font-bold mt-1">
                {patient?.fullName || "Patient"}
              </h3>

              <p className="text-slate-500 mt-1">
                {patientCode} · {eyeName}
              </p>
            </div>

            <div
              className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border ${
                isPoor
                  ? "bg-rose-50 border-rose-200"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  isPoor
                    ? "bg-rose-500 text-white"
                    : "bg-emerald-500 text-white"
                }`}
              >
                {isPoor ? "!" : "✓"}
              </div>

              <div>
                <p
                  className={`text-xs font-semibold ${
                    isPoor
                      ? "text-rose-700"
                      : "text-emerald-700"
                  }`}
                >
                  {isPoor
                    ? "Recapture required"
                    : "Analysis completed"}
                </p>

                <p
                  className={`font-bold ${
                    isPoor
                      ? "text-rose-900"
                      : "text-emerald-900"
                  }`}
                >
                  {isPoor
                    ? "Image quality inadequate"
                    : "MATLAB result available"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-7">
            <SummaryTile
              label="Case ID"
              value={caseId}
            />

            <SummaryTile
              label="Patient ID"
              value={patientCode}
            />

            <SummaryTile
              label="Eye"
              value={eyeName}
            />

            <SummaryTile
              label="Quality"
              value={`${qualityStatus} · ${qualityText}`}
            />
          </div>
        </section>

        {/* =======================================================
            POOR QUALITY — STOP PATH
        ======================================================= */}
        {isPoor ? (
          <section className="mt-6 bg-white border border-rose-200 rounded-3xl shadow-sm p-6 md:p-8">
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xl font-bold shrink-0">
                  !
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-rose-700 font-bold">
                    Quality gate
                  </p>

                  <h3 className="text-2xl font-bold text-rose-950 mt-1">
                    Automated classification withheld
                  </h3>

                  <p className="text-rose-800 mt-3 leading-relaxed">
                    {clinicalMessage}
                  </p>

                  <p className="font-semibold text-rose-800 mt-4">
                    Please recapture the fundus image with better focus,
                    illumination and retinal field coverage.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-7">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={onBack}
                className="px-7 py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition"
              >
                Recapture Image
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* =====================================================
                AI RESULT
            ===================================================== */}
            <section className="mt-6 grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-teal-700 font-bold">
                      AI result
                    </p>

                    <h3 className="text-2xl font-bold mt-1">
                      Screening assessment
                    </h3>
                  </div>

                  <span
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold ${
                      isBorderline
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {qualityStatus}
                  </span>
                </div>

                <div
                  className={`mt-7 rounded-2xl border p-6 ${
                    referralRequired
                      ? "bg-rose-50 border-rose-200"
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <p
                    className={`text-xs uppercase tracking-[0.14em] font-bold ${
                      referralRequired
                        ? "text-rose-700"
                        : "text-emerald-700"
                    }`}
                  >
                    Classification
                  </p>

                  <h4
                    className={`text-2xl md:text-3xl font-bold mt-2 leading-snug ${
                      referralRequired
                        ? "text-rose-900"
                        : "text-emerald-900"
                    }`}
                  >
                    {classification}
                  </h4>

                  <div className="grid sm:grid-cols-2 gap-4 mt-6">
                    <ResultMetric
                      label="International severity"
                      value={gradeText}
                    />

                    <ResultMetric
                      label="Model confidence"
                      value={confidenceText}
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400 font-bold">
                    Clinical interpretation
                  </p>

                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {clinicalMessage}
                  </p>
                </div>

                <div
                  className={`mt-5 rounded-2xl border p-5 ${
                    referralRequired
                      ? "bg-rose-50 border-rose-200"
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <p
                    className={`text-xs uppercase tracking-[0.14em] font-bold ${
                      referralRequired
                        ? "text-rose-700"
                        : "text-emerald-700"
                    }`}
                  >
                    Referral assessment
                  </p>

                  <p
                    className={`font-bold mt-2 ${
                      referralRequired
                        ? "text-rose-900"
                        : "text-emerald-900"
                    }`}
                  >
                    {referralRequired
                      ? "Ophthalmic referral recommended"
                      : "No referral indicated by the prototype screening rule"}
                  </p>

                  {analysisResult?.referral?.message && (
                    <p
                      className={`text-sm mt-2 leading-relaxed ${
                        referralRequired
                          ? "text-rose-800"
                          : "text-emerald-800"
                      }`}
                    >
                      {analysisResult.referral.message}
                    </p>
                  )}
                </div>
              </div>

              {/* ===================================================
                  QUALITY DETAILS
              =================================================== */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-teal-700 font-bold">
                  Image quality
                </p>

                <h3 className="text-2xl font-bold mt-1">
                  Quality assessment
                </h3>

                <div className="mt-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        Overall score
                      </p>

                      <p className="text-4xl font-bold mt-1">
                        {qualityText}
                      </p>
                    </div>

                    <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                      {qualityStatus}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-5">
                    <div
                      className={`h-full rounded-full ${
                        isBorderline
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          Math.max(Number(qualityScore) || 0, 0),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-7">
                  <QualityMetric label="Illumination" value={qualityMetrics.illumination} />
                  <QualityMetric label="Contrast" value={qualityMetrics.contrast} />
                  <QualityMetric label="Focus" value={qualityMetrics.focus} />
                  <QualityMetric label="Saturation" value={qualityMetrics.saturation} />
                  <QualityMetric label="Field of View" value={qualityMetrics.fieldOfView} />
                </div>

                {analysisResult?.quality?.enhancement?.applied && (
                  <div className="mt-5 rounded-2xl bg-teal-50 border border-teal-100 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-teal-700 font-bold">
                      Enhancement applied
                    </p>

                    <p className="text-sm text-teal-900 mt-1 leading-relaxed">
                      {analysisResult.quality.enhancement.method}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* =====================================================
                GRADE PROBABILITIES
            ===================================================== */}
            {probabilityValues.length > 0 && (
              <section className="mt-6 bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
                <p className="text-xs uppercase tracking-[0.18em] text-teal-700 font-bold">
                  Model output
                </p>
                <h3 className="text-2xl font-bold mt-1">Grade probabilities</h3>
                <p className="text-sm text-slate-500 mt-2">Model confidence across all five diabetic retinopathy severity grades.</p>

                <div className="space-y-4 mt-6">
                  {probabilityValues.map((value, index) => {
                    const numeric = Number(value);
                    const percent = Math.min(Math.max(numeric <= 1 ? numeric * 100 : numeric, 0), 100);
                    const label = probabilityLabels[index] || `Grade ${index}`;
                    const active = index === Number(grade);
                    return (
                      <div key={`${label}-${index}`}>
                        <div className="flex items-center justify-between gap-4 mb-1.5">
                          <span className={`text-sm ${active ? "font-bold text-slate-900" : "font-semibold text-slate-600"}`}>
                            Grade {index} — {label}
                          </span>
                          <span className="text-sm font-bold text-slate-500">{percent.toFixed(2)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${active ? "bg-teal-500" : "bg-slate-300"}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* =====================================================
                EVIDENCE
            ===================================================== */}
            <section className="mt-6 bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-teal-700 font-bold">
                    Explainability
                  </p>

                  <h3 className="text-2xl font-bold mt-1">
                    Retinal evidence
                  </h3>

                  <p className="text-slate-500 mt-2">
                    Original fundus image and MATLAB-generated Grad-CAM
                    evidence.
                  </p>
                </div>

                <span className="inline-flex px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                  Human review required
                </span>
              </div>

              <div className="grid lg:grid-cols-2 gap-5 mt-7">
                <EvidencePanel
                  title="Original fundus image"
                  src={imageUrl}
                />

                <EvidencePanel
                  title="MATLAB Grad-CAM"
                  src={gradCamUrl}
                />
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400 font-bold">
                  Explainability note
                </p>

                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Grad-CAM provides a coarse visual explanation of image
                  regions contributing to the model prediction. It should
                  not be interpreted as pixel-level lesion segmentation or
                  definitive anatomical localization.
                </p>
              </div>
            </section>

            {/* =====================================================
                SEND TO DOCTOR
            ===================================================== */}
            <section className="mt-6 bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-teal-700 font-bold">
                    Next clinical step
                  </p>

                  <h3 className="text-2xl font-bold mt-1">
                    Ophthalmologist review
                  </h3>

                  <p className="text-slate-500 mt-2 max-w-2xl leading-relaxed">
                    Send this completed screening case to the doctor
                    dashboard for clinical review of the AI result,
                    retinal evidence and referral recommendation.
                  </p>
                </div>

                <div className="shrink-0">
                  {sendState === "sent" ? (
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                      <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        ✓
                      </span>
                      Sent to ophthalmologist
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        sendState === "sending" ||
                        !screeningId
                      }
                      onClick={handleSendToDoctor}
                      className={`px-7 py-3 rounded-xl font-semibold transition ${
                        sendState === "sending" || !screeningId
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-slate-950 text-white hover:bg-slate-800 shadow-sm"
                      }`}
                    >
                      {sendState === "sending"
                        ? "Sending case..."
                        : "Send to Ophthalmologist →"}
                    </button>
                  )}
                </div>
              </div>

              {sendError && (
                <div className="mt-5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                  {sendError}
                </div>
              )}

              {sendState === "sent" && (
                <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                  Case <b>{caseId}</b> is now available in the
                  ophthalmologist review workflow.
                </div>
              )}
            </section>

            {/* =====================================================
                SAFETY
            ===================================================== */}
            <section className="mt-6 rounded-2xl bg-slate-900 text-white p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  i
                </div>

                <div>
                  <p className="font-bold">
                    AI-assisted screening only
                  </p>

                  <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                    {analysisResult?.disclaimer ||
                      "This system is an AI-assisted diabetic retinopathy screening prototype and is not a medical diagnostic device. The output should not replace comprehensive ophthalmic examination, clinical judgment, or professional medical advice."}
                  </p>
                </div>
              </div>
            </section>

            {/* =====================================================
                ACTIONS
            ===================================================== */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-8 print:hidden">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
              >
                ← Back to Analysis
              </button>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Print / Save PDF
                </button>

                <button
                  type="button"
                  onClick={onRestart}
                  className="px-7 py-3 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 transition"
                >
                  Start New Screening
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   PROGRESS BAR
========================================================= */

function ProgressBar({ active }) {
  const steps = [
    "Patient",
    "Eye",
    "Capture",
    "Quality",
    "Analysis",
    "Result",
  ];

  return (
    <div className="w-full bg-white border-b border-slate-100 px-5 md:px-8 py-4 print:hidden">
      <div className="max-w-6xl mx-auto flex items-center">
        {steps.map((step, index) => {
          const completed = index < active;
          const current = index === active;

          return (
            <div
              key={step}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    completed
                      ? "bg-teal-500 text-white"
                      : current
                      ? "bg-teal-700 text-white shadow-lg shadow-teal-700/20"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {completed ? "✓" : index + 1}
                </div>

                <span
                  className={`hidden md:block text-xs font-semibold ${
                    current
                      ? "text-teal-700"
                      : completed
                      ? "text-slate-600"
                      : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-slate-200 mx-2 md:mx-4 relative overflow-hidden">
                  {completed && (
                    <div className="absolute inset-0 bg-teal-400" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   SUMMARY TILE
========================================================= */

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-bold">
        {label}
      </p>

      <p className="font-semibold text-slate-800 mt-1 truncate">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   RESULT METRIC
========================================================= */

function ResultMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-white/70 border border-black/5 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-bold text-lg mt-1">{value}</p>
    </div>
  );
}

/* =========================================================
   QUALITY METRIC
========================================================= */

function QualityMetric({ label, value }) {
  const display =
    value === null || value === undefined
      ? "—"
      : `${Number(value).toFixed(1)}`;

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-bold text-slate-800 mt-1">
        {display}
      </p>
    </div>
  );
}

/* =========================================================
   EVIDENCE PANEL
========================================================= */

function EvidencePanel({ title, src }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#071a20] border border-slate-200">
      <div className="px-4 py-3 text-white text-sm font-bold border-b border-white/10">
        {title}
      </div>

      <div className="min-h-[280px] md:min-h-[360px] flex items-center justify-center p-4">
        {src ? (
          <img
            src={src}
            alt={title}
            className="max-w-full max-h-[500px] object-contain rounded-xl"
          />
        ) : (
          <div className="text-center text-slate-400">
            <div className="text-3xl opacity-50">◌</div>
            <p className="text-sm mt-2">
              Evidence image unavailable
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScreeningResult;
