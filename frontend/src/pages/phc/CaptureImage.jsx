import { useEffect, useRef, useState } from "react";
import { uploadScreeningImage } from "../../services/api";

function CaptureImage({
  selectedEye,
  imageFile,
  setImageFile,
  screeningId,
  onNext,
  onBack,
}) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);

  /* =========================================================
     IMAGE PREVIEW
  ========================================================= */

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

  /* =========================================================
     FILE VALIDATION
  ========================================================= */

  function validateFile(file) {
    if (!file) return false;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please select a JPG, JPEG, PNG or WEBP fundus image."
      );
      return false;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError(
        "Image size must be smaller than 15 MB."
      );
      return false;
    }

    setError("");
    return true;
  }

  function handleFile(file) {
    if (!validateFile(file)) return;

    setImageFile(file);
    setError("");
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0];

    if (file) {
      handleFile(file);
    }
  }

  /* =========================================================
     DRAG & DROP
  ========================================================= */

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  }

  /* =========================================================
     REMOVE IMAGE
  ========================================================= */

  function removeImage() {
    setImageFile(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  /* =========================================================
     UPLOAD → BACKEND → MATLAB
  ========================================================= */

  async function handleContinue() {
    if (uploading) return;

    setError("");

    if (!imageFile) {
      setError(
        "Please capture or upload a fundus image before continuing."
      );
      return;
    }

    if (!screeningId) {
      setError(
        "Screening record is not available. Please go back and complete eye selection again."
      );
      return;
    }

    try {
      setUploading(true);

      /*
       * This is the critical integration call.
       *
       * Backend:
       *
       * React
       *   ↓
       * POST /api/screenings/:id/image
       *   ↓
       * Node
       *   ↓
       * MATLAB
       *   ↓
       * JSON result
       */

      console.log(
        "Uploading fundus image...",
        {
          screeningId,
          eye: selectedEye,
          fileName: imageFile.name,
        }
      );

      const response =
        await uploadScreeningImage(
          screeningId,
          imageFile
        );

      console.log(
        "BACKEND / MATLAB RESULT RECEIVED:",
        response
      );

      /*
       * Make absolutely sure a valid response came back.
       */

      if (!response) {
        throw new Error(
          "The screening backend returned an empty response."
        );
      }

      if (response.success === false) {
        throw new Error(
          response.message ||
            "Fundus image analysis failed."
        );
      }

      /*
       * IMPORTANT:
       *
       * Send the COMPLETE backend response to App.jsx.
       *
       * App.jsx stores it in:
       *
       * setAnalysisResult(result)
       */

      if (typeof onNext === "function") {
        onNext(response);
      }
    } catch (err) {
      console.error(
        "Fundus image upload / MATLAB analysis failed:",
        err
      );

      setError(
        err?.message ||
          "Unable to analyze the fundus image. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  /* =========================================================
     DISPLAY HELPERS
  ========================================================= */

  const eyeLabel =
    selectedEye === "LEFT"
      ? "Left Eye"
      : selectedEye === "RIGHT"
        ? "Right Eye"
        : selectedEye || "Selected Eye";

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#f4f8f8] text-slate-900">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 h-[76px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#071b20] text-white flex items-center justify-center font-bold">
              RS
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                RetinaSafe
              </h1>

              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                PHC Screening
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">
              Current step
            </p>

            <p className="text-sm font-bold text-slate-700">
              Fundus Capture
            </p>
          </div>
        </div>
      </header>

      {/* =====================================================
          PROGRESS
      ===================================================== */}

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-5">
          <div className="flex items-center">
            {[
              "Patient",
              "Eye",
              "Capture",
              "Quality",
              "Analysis",
              "Result",
            ].map((step, index) => {
              const active = index === 2;
              const completed = index < 2;

              return (
                <div
                  key={step}
                  className="flex items-center flex-1 last:flex-none"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        completed
                          ? "bg-teal-500 text-white"
                          : active
                            ? "bg-slate-950 text-white"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {completed ? "✓" : index + 1}
                    </div>

                    <span
                      className={`hidden md:block text-xs font-semibold ${
                        active
                          ? "text-slate-950"
                          : completed
                            ? "text-slate-600"
                            : "text-slate-400"
                      }`}
                    >
                      {step}
                    </span>
                  </div>

                  {index < 5 && (
                    <div className="flex-1 h-px bg-slate-200 mx-2 md:mx-4">
                      {completed && (
                        <div className="h-full bg-teal-400" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 lg:py-14">
        {/* INTRO */}

        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-[11px] font-bold">
            STEP 03 · CAPTURE
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mt-5">
            Capture the fundus image
          </h2>

          <p className="text-slate-500 text-base sm:text-lg mt-4 leading-relaxed">
            Capture or upload a clear retinal image for
            automated quality assessment and diabetic
            retinopathy screening.
          </p>

          <div className="inline-flex mt-5 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-400 mr-2">
              Screening:
            </span>

            <span className="text-sm font-bold">
              {eyeLabel}
            </span>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="max-w-4xl mx-auto mt-8 rounded-2xl bg-rose-50 border border-rose-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                !
              </div>

              <div>
                <p className="font-bold text-rose-800">
                  Capture error
                </p>

                <p className="text-sm text-rose-700 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            IMAGE AREA
        =================================================== */}

        <section className="max-w-5xl mx-auto mt-10">
          {!imageFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                inputRef.current?.click()
              }
              className={`cursor-pointer rounded-[30px] border-2 border-dashed p-10 sm:p-16 text-center transition-all duration-300 ${
                dragActive
                  ? "border-teal-500 bg-teal-50 scale-[1.01]"
                  : "border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50/30"
              }`}
            >
              <div className="w-20 h-20 mx-auto rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center text-3xl">
                ◉
              </div>

              <h3 className="text-2xl font-bold mt-6">
                Upload fundus image
              </h3>

              <p className="text-slate-500 mt-3">
                Drag and drop the image here or click to
                browse.
              </p>

              <div className="mt-6 inline-flex px-5 py-3 rounded-xl bg-slate-950 text-white font-bold">
                Select Image
              </div>

              <p className="text-xs text-slate-400 mt-5">
                JPG, JPEG, PNG or WEBP · Maximum 15 MB
              </p>

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="bg-white rounded-[30px] border border-slate-200 shadow-xl overflow-hidden">
              {/* IMAGE HEADER */}

              <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-teal-600 font-bold">
                    Fundus image selected
                  </p>

                  <h3 className="text-xl font-bold mt-1">
                    Ready for analysis
                  </h3>
                </div>

                <span className="px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-xs font-bold">
                  {eyeLabel}
                </span>
              </div>

              {/* IMAGE */}

              <div className="p-5 sm:p-8">
                <div className="relative aspect-[4/3] max-h-[620px] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt={`${eyeLabel} fundus`}
                      className="w-full h-full object-contain"
                    />
                  )}

                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                    Original capture
                  </div>
                </div>

                {/* FILE INFO */}

                <div className="mt-5 grid sm:grid-cols-3 gap-3">
                  <Info
                    label="File"
                    value={imageFile.name}
                  />

                  <Info
                    label="Size"
                    value={`${(
                      imageFile.size /
                      1024 /
                      1024
                    ).toFixed(2)} MB`}
                  />

                  <Info
                    label="Eye"
                    value={eyeLabel}
                  />
                </div>
              </div>

              {/* =================================================
                  ANALYSIS STATE
              ================================================= */}

              {uploading && (
                <div className="mx-5 sm:mx-8 mb-6 rounded-2xl bg-teal-50 border border-teal-100 p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center">
                      <span className="animate-pulse text-lg">
                        ◉
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="font-bold text-teal-900">
                        Analyzing fundus image...
                      </p>

                      <p className="text-xs text-teal-700/70 mt-1">
                        Running MATLAB quality assessment,
                        retinal analysis and DR classification.
                      </p>
                    </div>

                    <div className="hidden sm:block text-xs font-bold text-teal-700">
                      Please wait
                    </div>
                  </div>

                  <div className="mt-4 h-1.5 rounded-full bg-teal-100 overflow-hidden">
                    <div className="h-full w-1/2 bg-teal-500 rounded-full animate-pulse" />
                  </div>
                </div>
              )}

              {/* =================================================
                  ACTIONS
              ================================================= */}

              <div className="px-5 sm:px-8 py-5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={uploading}
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition-all disabled:opacity-40"
                >
                  Remove / Replace
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={uploading}
                  className="px-7 py-3.5 rounded-xl bg-slate-950 text-white font-bold shadow-lg hover:bg-teal-700 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
                >
                  {uploading
                    ? "Analyzing with MATLAB..."
                    : "Continue to Quality Check →"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* =====================================================
            NAVIGATION
        ===================================================== */}

        <div className="max-w-5xl mx-auto mt-7">
          <button
            type="button"
            onClick={onBack}
            disabled={uploading}
            className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold hover:bg-slate-50 transition-all disabled:opacity-40"
          >
            ← Back to Eye Selection
          </button>
        </div>

        {/* =====================================================
            PIPELINE NOTE
        ===================================================== */}

        <div className="max-w-5xl mx-auto mt-8 rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center text-sm font-bold">
              AI
            </div>

            <div>
              <p className="font-bold text-slate-800">
                Automated screening pipeline
              </p>

              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Uploading the image sends it to the RetinaSafe
                backend, which invokes the MATLAB screening
                pipeline. The returned quality, classification,
                referral and explainability data are passed to
                the next screening stages.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   INFO CARD
========================================================= */

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
        {label}
      </p>

      <p className="text-sm font-semibold text-slate-800 mt-1 truncate">
        {value}
      </p>
    </div>
  );
}

export default CaptureImage;