import { useEffect, useMemo, useState } from "react";

/*
  RetinaSafe — Step 5: AI Analysis

  IMPORTANT:
  MATLAB analysis is already performed by the backend when the fundus
  image is uploaded in Step 3.

  This screen therefore does NOT run a second/fake AI algorithm.
  It presents the real result returned by MATLAB and gives the user
  a short, professional processing sequence before continuing.
*/

function AIAnalysis({
  selectedEye,
  imageFile,
  analysisResult,
  screeningId,
  onNext,
  onBack,
}) {
  const [stage, setStage] = useState(0);

  const eyeName =
    selectedEye === "left"
      ? "Left Eye"
      : selectedEye === "right"
      ? "Right Eye"
      : "Selected Eye";

  const qualityStatus =
    analysisResult?.quality?.status ||
    analysisResult?.aiResult?.quality_status ||
    "";

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

  const isPoor = qualityStatus.toUpperCase() === "POOR";
  const hasResult = Boolean(analysisResult);

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

  /*
    Evidence image:
    The uploaded File can disappear from the browser preview lifecycle
    while moving between PHC steps. The backend already stores the exact
    screening image, so Step 5 uses the authoritative backend evidence
    endpoint whenever screeningId is available.

    Fallback to the local File preview only when the screening ID is not
    available yet.
  */
  const localImageUrl = useMemo(() => {
    if (!imageFile) return "";

    if (typeof imageFile === "string") {
      return imageFile;
    }

    try {
      return URL.createObjectURL(imageFile);
    } catch {
      return "";
    }
  }, [imageFile]);

  useEffect(() => {
    if (!imageFile || typeof imageFile === "string") {
      return undefined;
    }

    return () => {
      if (localImageUrl) {
        URL.revokeObjectURL(localImageUrl);
      }
    };
  }, [imageFile, localImageUrl]);

  /*
    Evidence loading strategy:
    1. Prefer the authoritative screening evidence endpoint.
    2. Fall back to the exact upload URL returned by the backend.
    3. Finally fall back to the local browser preview.

    This makes the UI resilient even if an older backend instance is
    temporarily serving the upload directly while the new evidence route
    is being installed.
  */
  const backendImagePath =
    analysisResult?.image?.url ||
    analysisResult?.imageUrl ||
    "";

  const backendImageUrl = useMemo(() => {
    if (!backendImagePath) return "";

    if (
      backendImagePath.startsWith("http://") ||
      backendImagePath.startsWith("https://") ||
      backendImagePath.startsWith("data:")
    ) {
      return backendImagePath;
    }

    return `${backendOrigin}${
      backendImagePath.startsWith("/") ? "" : "/"
    }${backendImagePath}`;
  }, [backendImagePath, backendOrigin]);

  const imageUrl = useMemo(() => {
    if (screeningId) {
      return `${backendOrigin}/cases/${encodeURIComponent(
        String(screeningId)
      )}/image`;
    }

    return backendImageUrl || localImageUrl;
  }, [
    screeningId,
    backendOrigin,
    backendImageUrl,
    localImageUrl,
  ]);

  /*
    Professional staged presentation.

    The actual inference has already completed on the backend.
    These stages only communicate what the completed pipeline did.
  */
  useEffect(() => {
    if (!hasResult) {
      setStage(0);
      return undefined;
    }

    const timers = [
      setTimeout(() => setStage(1), 450),
      setTimeout(() => setStage(2), 1050),
      setTimeout(() => setStage(3), 1650),
    ];

    return () => timers.forEach(clearTimeout);
  }, [hasResult]);

  const confidenceText =
    confidence === null || confidence === undefined
      ? "—"
      : `${Number(confidence).toFixed(2)}%`;

  const gradeText =
    grade === null || grade === undefined
      ? "—"
      : `Grade ${grade}`;

  const statusClass = isPoor
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : qualityStatus.toUpperCase() === "BORDERLINE"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const canContinue =
    hasResult && !isPoor && stage >= 3;

  return (
    <div className="min-h-screen bg-[#f4f8f8] text-slate-900">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-10 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg tracking-tight">
            RetinaSafe
          </h1>

          <p className="text-xs text-teal-700 uppercase tracking-[0.2em] font-bold mt-1">
            PHC Screening
          </p>
        </div>

        <div className="text-sm text-slate-500">
          Step <b className="text-slate-900">5</b> of 6
        </div>
      </header>

      {/* =========================================================
          PROGRESS
      ========================================================= */}
      <ProgressBar active={4} />

      <main className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12">
        {/* =======================================================
            TITLE
        ======================================================= */}
        <section className="text-center max-w-3xl mx-auto">
          <span className="inline-flex px-4 py-2 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-[0.14em]">
            Step 5 · AI Analysis
          </span>

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-5">
            Retinal AI Analysis
          </h2>

          <p className="text-slate-500 mt-3 leading-relaxed">
            MATLAB has completed the quality-gated ResNet-50 screening
            pipeline for the selected fundus image.
          </p>
        </section>

        {/* =======================================================
            CASE STRIP
        ======================================================= */}
        <section className="mt-8 bg-white border border-slate-200 rounded-3xl shadow-sm p-5 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoTile
              label="Screening ID"
              value={screeningId ? `#${screeningId}` : "Not available"}
            />

            <InfoTile
              label="Eye"
              value={eyeName}
            />

            <InfoTile
              label="Pipeline"
              value="MATLAB → ResNet-50 → Grad-CAM"
            />
          </div>
        </section>

        {/* =======================================================
            PIPELINE STATUS
        ======================================================= */}
        <section className="mt-6 bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-7">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-teal-700 font-bold">
                Analysis pipeline
              </p>

              <h3 className="text-2xl font-bold mt-1">
                {isPoor
                  ? "Automated classification withheld"
                  : stage >= 3
                  ? "Analysis complete"
                  : "Reviewing retinal evidence"}
              </h3>
            </div>

            <div
              className={`px-4 py-2 rounded-full border text-xs font-bold ${statusClass}`}
            >
              {qualityStatus || "PROCESSING"}
            </div>
          </div>

          <div className="space-y-4">
            <PipelineStep
              number="01"
              title="Image quality gate"
              detail={
                qualityStatus
                  ? `${qualityStatus}${
                      qualityScore !== null
                        ? ` · ${Number(qualityScore).toFixed(2)}/100`
                        : ""
                    }`
                  : "Waiting for MATLAB result"
              }
              complete={stage >= 1}
              active={stage === 0}
            />

            <PipelineStep
              number="02"
              title={
                qualityStatus.toUpperCase() === "BORDERLINE"
                  ? "CLAHE enhancement"
                  : "Clinical preprocessing"
              }
              detail={
                analysisResult?.quality?.enhancement?.applied
                  ? analysisResult?.quality?.enhancement?.method ||
                    "Contrast enhancement applied"
                  : "Pipeline preprocessing completed"
              }
              complete={stage >= 2}
              active={stage === 1}
            />

            <PipelineStep
              number="03"
              title="ResNet-50 DR classification"
              detail={
                isPoor
                  ? "Withheld because image quality was inadequate"
                  : "Five-class diabetic retinopathy severity classification"
              }
              complete={!isPoor && stage >= 3}
              active={!isPoor && stage === 2}
              blocked={isPoor}
            />

            <PipelineStep
              number="04"
              title="Explainability"
              detail={
                gradCamPath
                  ? "MATLAB Grad-CAM evidence generated"
                  : "Grad-CAM evidence unavailable"
              }
              complete={!isPoor && Boolean(gradCamPath) && stage >= 3}
              active={!isPoor && stage === 3}
              blocked={isPoor}
            />
          </div>
        </section>

        {/* =======================================================
            RESULT SUMMARY
        ======================================================= */}
        <section className="mt-6 grid lg:grid-cols-[1.05fr_0.95fr] gap-6">
          {/* LEFT */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-teal-700 font-bold">
                  AI output
                </p>

                <h3 className="text-2xl font-bold mt-1">
                  Screening classification
                </h3>
              </div>

              <span
                className={`px-3 py-1.5 rounded-full border text-xs font-bold ${statusClass}`}
              >
                {qualityStatus || "UNKNOWN"}
              </span>
            </div>

            {isPoor ? (
              <div className="mt-7 rounded-2xl bg-rose-50 border border-rose-200 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xl font-bold shrink-0">
                    !
                  </div>

                  <div>
                    <h4 className="font-bold text-rose-900 text-lg">
                      Image not suitable for automated screening
                    </h4>

                    <p className="text-sm text-rose-800 mt-2 leading-relaxed">
                      {clinicalMessage}
                    </p>

                    <p className="text-sm text-rose-700 font-semibold mt-4">
                      Please recapture the fundus image before continuing.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-7 grid sm:grid-cols-2 gap-4">
                  <MetricCard
                    label="DR severity"
                    value={gradeText}
                  />

                  <MetricCard
                    label="Model confidence"
                    value={confidenceText}
                  />
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400 font-bold">
                    Classification
                  </p>

                  <p className="text-xl font-bold text-slate-900 mt-2 leading-snug">
                    {classification}
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
              </>
            )}
          </div>

          {/* RIGHT */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-700 font-bold">
              Clinical evidence
            </p>

            <h3 className="text-2xl font-bold mt-1">
              Fundus evidence
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              Original image and MATLAB-generated Grad-CAM explanation.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <EvidenceImage
                title="Fundus"
                src={imageUrl}
                fallbackSrc={backendImageUrl || localImageUrl}
                emptyText="Fundus image unavailable"
              />

              <EvidenceImage
                title="Grad-CAM"
                src={gradCamUrl}
                emptyText="Grad-CAM unavailable"
              />
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">
                Interpretation note
              </p>

              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Grad-CAM is a coarse visual explanation of image regions
                contributing to the model prediction. It is not a
                pixel-level lesion segmentation.
              </p>
            </div>
          </div>
        </section>

        {/* =======================================================
            SAFETY NOTE
        ======================================================= */}
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
                This prototype supports screening and referral decisions.
                It does not replace comprehensive ophthalmic examination,
                clinical judgment, or professional medical advice.
              </p>
            </div>
          </div>
        </section>

        {/* =======================================================
            NAVIGATION
        ======================================================= */}
        <div className="flex items-center justify-between gap-4 mt-8">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
          >
            ← Back
          </button>

          {isPoor ? (
            <button
              type="button"
              onClick={onBack}
              className="px-7 py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition shadow-sm"
            >
              ← Recapture Image
            </button>
          ) : (
            <button
              type="button"
              disabled={!canContinue}
              onClick={onNext}
              className={`px-7 py-3 rounded-xl font-semibold transition ${
                canContinue
                  ? "bg-slate-950 text-white hover:bg-slate-800 shadow-sm"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Continue to Result →
            </button>
          )}
        </div>
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
    <div className="w-full bg-white border-b border-slate-100 px-5 md:px-8 py-4">
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${
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
   PIPELINE STEP
========================================================= */

function PipelineStep({
  number,
  title,
  detail,
  complete,
  active,
  blocked,
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-4 transition-all duration-500 ${
        blocked
          ? "bg-rose-50 border-rose-200"
          : complete
          ? "bg-emerald-50/60 border-emerald-200"
          : active
          ? "bg-teal-50 border-teal-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
          blocked
            ? "bg-rose-100 text-rose-700"
            : complete
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-teal-600 text-white"
            : "bg-white text-slate-400 border border-slate-200"
        }`}
      >
        {blocked ? "!" : complete ? "✓" : number}
      </div>

      <div className="min-w-0">
        <p className="font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500 mt-0.5 truncate">
          {detail}
        </p>
      </div>

      {active && !blocked && (
        <div className="ml-auto flex gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse [animation-delay:300ms]" />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   INFO TILE
========================================================= */

function InfoTile({ label, value }) {
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
   METRIC CARD
========================================================= */

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">
        {label}
      </p>

      <p className="text-2xl font-bold text-slate-900 mt-2">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   EVIDENCE IMAGE
========================================================= */

function EvidenceImage({
  title,
  src,
  fallbackSrc,
  emptyText,
}) {
  const [activeSrc, setActiveSrc] = useState(src || fallbackSrc || "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActiveSrc(src || fallbackSrc || "");
    setFailed(false);
  }, [src, fallbackSrc]);

  function handleError() {
    if (fallbackSrc && activeSrc !== fallbackSrc) {
      setActiveSrc(fallbackSrc);
      return;
    }

    setFailed(true);
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-[#071a20] border border-slate-200">
      <div className="px-3 py-2 bg-[#071a20] text-white text-xs font-bold">
        {title}
      </div>

      <div className="aspect-square flex items-center justify-center p-2">
        {activeSrc && !failed ? (
          <img
            src={activeSrc}
            alt={title}
            className="w-full h-full object-contain rounded-lg"
            onError={handleError}
          />
        ) : (
          <div className="text-center px-4">
            <div className="text-2xl opacity-50">◌</div>
            <p className="text-xs text-slate-400 mt-2">
              {emptyText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   INFO
========================================================= */

function InfoTileSpacer() {
  return null;
}

export default AIAnalysis;
