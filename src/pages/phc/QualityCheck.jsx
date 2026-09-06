import { useEffect, useMemo, useState } from "react";

function QualityCheck({
  selectedEye,
  imageFile,
  analysisResult,
  onNext,
  onBack,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
    }, 80);

    return () => clearTimeout(timer);
  }, []);

  /*
   * ---------------------------------------------------------
   * REAL MATLAB RESULT
   * ---------------------------------------------------------
   *
   * The Capture step already uploaded the image and MATLAB
   * already performed the complete pipeline.
   *
   * Therefore this page ONLY PRESENTS the real result.
   * It does NOT run another quality algorithm.
   */

  const quality = analysisResult?.quality || null;

  const qualityStatus = String(
    quality?.status ||
      analysisResult?.aiResult?.quality_status ||
      ""
  ).toUpperCase();

  const qualityScore =
    quality?.score !== undefined &&
    quality?.score !== null
      ? Number(quality.score)
      : analysisResult?.aiResult?.quality_score !== undefined &&
          analysisResult?.aiResult?.quality_score !== null
        ? Number(analysisResult.aiResult.quality_score)
        : null;

  const metrics = quality?.details?.metrics || {};

  const isGood = qualityStatus === "GOOD";
  const isBorderline = qualityStatus === "BORDERLINE";
  const isPoor =
    qualityStatus === "POOR" ||
    qualityStatus === "UNGRADEABLE" ||
    analysisResult?.status === "RECAPTURE_REQUIRED";

  const canProceed =
    !isPoor &&
    (isGood || isBorderline);

  /*
   * ---------------------------------------------------------
   * NORMALIZED METRICS
   * ---------------------------------------------------------
   */

  const metricCards = useMemo(
    () => [
      {
        key: "brightness",
        title: "Illumination",
        description: "Checks whether retinal brightness is suitable.",
        value:
          metrics.brightness !== undefined
            ? Number(metrics.brightness)
            : null,
      },
      {
        key: "contrast",
        title: "Contrast",
        description: "Checks whether retinal structures have sufficient contrast.",
        value:
          metrics.contrast !== undefined
            ? Number(metrics.contrast)
            : null,
      },
      {
        key: "sharpness",
        title: "Focus",
        description: "Checks whether retinal structures are sufficiently sharp.",
        value:
          metrics.sharpness !== undefined
            ? Number(metrics.sharpness)
            : null,
      },
      {
        key: "saturation",
        title: "Saturation",
        description: "Checks whether image color information is usable.",
        value:
          metrics.saturation !== undefined
            ? Number(metrics.saturation)
            : null,
      },
      {
        key: "retinalCoverage",
        title: "Field of View",
        description: "Checks how much of the retinal field is visible.",
        value:
          metrics.retinalCoverage !== undefined
            ? Number(metrics.retinalCoverage)
            : null,
      },
    ],
    [metrics]
  );

  /*
   * ---------------------------------------------------------
   * STATUS UI
   * ---------------------------------------------------------
   */

  const statusConfig = isPoor
    ? {
        label: "Recapture required",
        shortLabel: "Ungradeable",
        description:
          "The captured image does not meet the quality requirements for reliable retinal analysis.",
        className:
          "bg-rose-50 border-rose-200 text-rose-700",
        badgeClass:
          "bg-rose-100 text-rose-700 border-rose-200",
        icon: "!",
      }
    : isBorderline
      ? {
          label: "Borderline image",
          shortLabel: "Borderline",
          description:
            "The image is usable. MATLAB has routed it through the enhancement stage before AI analysis.",
          className:
            "bg-amber-50 border-amber-200 text-amber-800",
          badgeClass:
            "bg-amber-100 text-amber-700 border-amber-200",
          icon: "≈",
        }
      : {
          label: "Image suitable for analysis",
          shortLabel: "Good",
          description:
            "The captured image passed the MATLAB quality gate and can proceed to AI screening.",
          className:
            "bg-emerald-50 border-emerald-200 text-emerald-800",
          badgeClass:
            "bg-emerald-100 text-emerald-700 border-emerald-200",
          icon: "✓",
        };

  /*
   * ---------------------------------------------------------
   * FORMAT HELPERS
   * ---------------------------------------------------------
   */

  const formatMetric = (value) => {
    if (value === null || Number.isNaN(value)) {
      return "—";
    }

    return `${Number(value).toFixed(1)}`;
  };

  const formatScore = () => {
    if (
      qualityScore === null ||
      Number.isNaN(qualityScore)
    ) {
      return "—";
    }

    return Number(qualityScore).toFixed(2);
  };

  /*
   * ---------------------------------------------------------
   * IMAGE PREVIEW
   * ---------------------------------------------------------
   */

  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  /*
   * ---------------------------------------------------------
   * NO RESULT SAFETY STATE
   * ---------------------------------------------------------
   */

  if (!analysisResult) {
    return (
      <div className="min-h-screen bg-[#f4f8f8] text-slate-900">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[76px] flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-slate-950">
                RetinaSafe
              </p>

              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                Image quality assessment
              </p>
            </div>

            <span className="text-xs font-semibold text-slate-400">
              STEP 04 / 06
            </span>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-5 py-16">
          <div className="bg-white rounded-[28px] border border-rose-200 shadow-xl p-8 md:p-10">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-xl font-bold">
              !
            </div>

            <p className="text-xs uppercase tracking-[0.2em] text-rose-600 font-bold mt-6">
              Analysis unavailable
            </p>

            <h1 className="text-3xl font-bold text-slate-950 mt-2">
              Quality result not available
            </h1>

            <p className="text-slate-500 mt-4 leading-relaxed">
              The image analysis result was not returned from the
              screening backend. Please go back and upload the image
              again.
            </p>

            <button
              type="button"
              onClick={onBack}
              className="mt-8 px-6 py-3 rounded-xl bg-slate-950 text-white font-bold hover:bg-teal-700 transition-all"
            >
              ← Back to Capture
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f8f8] text-slate-900 relative overflow-hidden">
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-teal-200/20 blur-3xl pointer-events-none" />

      <div className="absolute bottom-0 -left-32 w-[420px] h-[420px] rounded-full bg-cyan-200/20 blur-3xl pointer-events-none" />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="relative z-10 bg-white/95 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 h-[76px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="eye-logo-small">
              <div className="eye-shape-small">
                <div className="eye-pupil-small" />
              </div>
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950">
                RetinaSafe
              </h1>

              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                PHC Screening
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-[11px] text-slate-400">
                Current step
              </p>

              <p className="text-sm font-bold text-slate-700">
                Image quality
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-50 border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

              <span className="text-xs font-bold text-emerald-700">
                MATLAB result received
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          PROGRESS
      ===================================================== */}

      <div className="relative z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                Screening workflow
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Image quality assessment
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">
                Progress
              </p>

              <p className="text-sm font-bold text-slate-800">
                04 <span className="text-slate-300">/ 06</span>
              </p>
            </div>
          </div>

          <ProgressBar active={3} />
        </div>
      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main
        className={`relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-10 lg:py-14 transition-all duration-700 ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        }`}
      >
        {/* ===================================================
            INTRO
        =================================================== */}

        <section className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />

            STEP 04 · QUALITY
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 mt-5">
            Image Quality Assessment
          </h2>

          <p className="text-slate-500 text-base sm:text-lg leading-relaxed mt-4 max-w-2xl mx-auto">
            MATLAB has evaluated the captured fundus image before
            allowing the screening pipeline to proceed.
          </p>

          {/* Eye */}

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-400 font-semibold">
              Screened eye
            </span>

            <span className="text-sm font-bold text-slate-800">
              {selectedEye === "LEFT"
                ? "Left Eye"
                : selectedEye === "RIGHT"
                  ? "Right Eye"
                  : selectedEye || "Selected eye"}
            </span>
          </div>
        </section>

        {/* ===================================================
            RESULT GRID
        =================================================== */}

        <section className="mt-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
          {/* IMAGE */}

          <div className="bg-white rounded-[28px] border border-slate-200 shadow-[0_24px_70px_rgba(15,23,42,0.07)] overflow-hidden">
            <div className="px-6 sm:px-7 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">
                  Captured image
                </p>

                <h3 className="text-lg font-bold text-slate-950 mt-1">
                  Fundus image
                </h3>
              </div>

              <span className="text-xs font-bold text-slate-400">
                {selectedEye || "Eye"}
              </span>
            </div>

            <div className="p-5 sm:p-7">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Captured fundus"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    Image preview unavailable
                  </div>
                )}

                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                  Original capture
                </div>
              </div>

              {isBorderline &&
                quality?.details?.enhancement?.applied && (
                  <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-100 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                        ✦
                      </div>

                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          Enhancement applied
                        </p>

                        <p className="text-xs text-amber-800/70 mt-1 leading-relaxed">
                          {quality.details.enhancement.method ||
                            "Contrast enhancement has been applied before AI analysis."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* QUALITY RESULT */}

          <div className="space-y-6">
            {/* STATUS CARD */}

            <div
              className={`rounded-[28px] border p-6 sm:p-7 shadow-sm ${statusConfig.className}`}
            >
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/80 border border-current/10 flex items-center justify-center text-xl font-bold shrink-0">
                    {statusConfig.icon}
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">
                      MATLAB quality gate
                    </p>

                    <h3 className="text-2xl font-bold mt-1">
                      {statusConfig.label}
                    </h3>

                    <p className="text-sm mt-2 leading-relaxed opacity-75">
                      {statusConfig.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider shrink-0 ${statusConfig.badgeClass}`}
                >
                  {statusConfig.shortLabel}
                </span>
              </div>

              {/* SCORE */}

              <div className="mt-7 rounded-2xl bg-white/70 border border-current/10 p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold opacity-60">
                      Quality score
                    </p>

                    <p className="text-4xl font-bold mt-1">
                      {formatScore()}
                      <span className="text-lg opacity-40">
                        {" "}
                        / 100
                      </span>
                    </p>
                  </div>

                  <span className="text-xs font-bold opacity-60">
                    {qualityStatus || "UNKNOWN"}
                  </span>
                </div>

                <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-current transition-all duration-1000"
                    style={{
                      width: `${Math.min(
                        Math.max(
                          qualityScore || 0,
                          0
                        ),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* METRICS */}

            <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-6 sm:p-7">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">
                  Quality metrics
                </p>

                <h3 className="text-xl font-bold text-slate-950 mt-1">
                  Image assessment
                </h3>
              </div>

              <div className="mt-5 space-y-3">
                {metricCards.map((metric) => {
                  const value = metric.value;

                  return (
                    <div
                      key={metric.key}
                      className="rounded-2xl bg-slate-50 border border-slate-100 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-800">
                            {metric.title}
                          </p>

                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {metric.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-slate-900">
                            {formatMetric(value)}
                          </p>

                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                            score
                          </p>
                        </div>
                      </div>

                      {value !== null &&
                        !Number.isNaN(value) && (
                          <div className="mt-3 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-teal-500 transition-all duration-1000"
                              style={{
                                width: `${Math.min(
                                  Math.max(value, 0),
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            NEXT ACTION
        =================================================== */}

        <section className="mt-8">
          {isPoor ? (
            <div className="rounded-[28px] bg-rose-50 border border-rose-200 p-6 sm:p-7">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-rose-600 font-bold">
                    Action required
                  </p>

                  <h3 className="text-xl font-bold text-rose-900 mt-1">
                    Please capture another fundus image
                  </h3>

                  <p className="text-sm text-rose-800/70 mt-2 max-w-2xl leading-relaxed">
                    AI classification has been stopped because the
                    image did not pass the quality gate. Improve the
                    capture conditions and try again.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onBack}
                  className="shrink-0 px-7 py-3.5 rounded-xl bg-slate-950 text-white font-bold hover:bg-teal-700 transition-all duration-300 shadow-lg"
                >
                  ← Recapture Image
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] bg-white border border-slate-200 shadow-sm p-6 sm:p-7">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-600 font-bold">
                      Quality gate passed
                    </p>
                  </div>

                  <h3 className="text-xl font-bold text-slate-950 mt-2">
                    Ready for AI retinal analysis
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
                    {isBorderline
                      ? "This borderline image has been enhanced by the MATLAB pipeline and is ready to proceed."
                      : "The image passed the quality assessment and is ready to proceed to AI screening."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canProceed}
                  onClick={() => {
                    if (canProceed && onNext) {
                      onNext();
                    }
                  }}
                  className="shrink-0 px-7 py-3.5 rounded-xl bg-slate-950 text-white font-bold hover:bg-teal-700 hover:-translate-y-0.5 transition-all duration-300 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue to AI Analysis →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===================================================
            FOOTER NAVIGATION
        =================================================== */}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            ← Back
          </button>

          <p className="hidden sm:block text-xs text-slate-400">
            MATLAB quality assessment completed
          </p>
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
    <div className="w-full">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isActive = index === active;
          const isCompleted = index < active;

          return (
            <div
              key={step}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${
                    isCompleted
                      ? "bg-teal-500 text-white"
                      : isActive
                        ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>

                <span
                  className={`hidden md:block text-xs font-semibold transition-colors duration-500 ${
                    isActive
                      ? "text-teal-700"
                      : isCompleted
                        ? "text-slate-600"
                        : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 h-px bg-slate-200 mx-2 md:mx-4 relative overflow-hidden">
                  {isCompleted && (
                    <div className="absolute inset-y-0 left-0 w-full bg-teal-400 transition-all duration-700" />
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

export default QualityCheck;