function EyeSelection({
  selectedEye,
  setSelectedEye,
  onNext,
  onBack,
}) {
  const selectEye = (eye) => {
    setSelectedEye(eye);
  };

  const handleContinue = () => {
    if (!selectedEye) {
      return;
    }

    onNext();
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ================= HEADER ================= */}

      <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-10 flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center">
            <span className="text-xl">
              👁️
            </span>
          </div>

          <div>
            <h1 className="font-bold text-slate-900">
              RetinaSafe
            </h1>

            <p className="text-xs text-slate-500">
              PHC Screening
            </p>
          </div>

        </div>

        <div className="text-sm text-slate-500">
          Step <b className="text-slate-900">2</b> of 6
        </div>

      </header>


      {/* ================= PROGRESS ================= */}

      <ProgressBar active={1} />


      {/* ================= MAIN ================= */}

      <main className="max-w-3xl mx-auto px-6 py-12">

        <div className="text-center">

          <div className="text-6xl mb-6">
            👁️
          </div>


          <span className="inline-flex px-3 py-2 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            STEP 2 · EYE
          </span>


          <h2 className="text-4xl font-bold text-slate-900 mt-5">
            Select eye to screen
          </h2>


          <p className="text-slate-500 mt-3">
            Choose which eye you want to examine first.
          </p>


          {/* ================= EYE CARDS ================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10">

            <EyeCard
              name="Left Eye"
              selected={selectedEye === "left"}
              onClick={() => selectEye("left")}
            />

            <EyeCard
              name="Right Eye"
              selected={selectedEye === "right"}
              onClick={() => selectEye("right")}
            />

          </div>


          {/* ================= SELECTED MESSAGE ================= */}

          {selectedEye && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm">

              <span>
                ✓
              </span>

              {selectedEye === "left"
                ? "Left eye selected"
                : "Right eye selected"}

            </div>
          )}


          {/* ================= NAVIGATION ================= */}

          <div className="flex items-center justify-center gap-4 mt-10">

            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            >
              <span>←</span>
              Back
            </button>


            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedEye}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition ${
                selectedEye
                  ? "bg-slate-950 text-white hover:bg-slate-800"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Continue
              <span>→</span>
            </button>

          </div>


          {!selectedEye && (
            <p className="mt-4 text-sm text-slate-400">
              Select an eye to continue.
            </p>
          )}

        </div>

      </main>

    </div>
  );
}


/* ================================================= */
/* EYE CARD */
/* ================================================= */

function EyeCard({
  name,
  selected,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-8 rounded-3xl border-2 bg-white transition-all duration-200 ${
        selected
          ? "border-slate-950 shadow-lg scale-[1.02]"
          : "border-slate-200 hover:border-slate-400 hover:shadow-md"
      }`}
    >

      {/* Selected badge */}

      {selected && (
        <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center text-sm font-bold">
          ✓
        </div>
      )}


      <div className="text-5xl">
        👁️
      </div>


      <h3 className="text-xl font-semibold text-slate-900 mt-5">
        {name}
      </h3>


      <p className="text-sm text-slate-500 mt-2">
        Select for screening
      </p>

    </button>
  );
}


/* ================================================= */
/* PROGRESS BAR */
/* ================================================= */

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
    <div className="bg-white border-b border-slate-200 px-6 py-5">

      <div className="max-w-5xl mx-auto flex items-center">

        {steps.map((step, index) => (

          <div
            key={step}
            className="flex items-center flex-1"
          >

            <div className="flex items-center gap-2">

              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  index <= active
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {index + 1}
              </div>


              <span
                className={`hidden sm:block text-xs font-semibold ${
                  index <= active
                    ? "text-slate-900"
                    : "text-slate-400"
                }`}
              >
                {step}
              </span>

            </div>


            {index < steps.length - 1 && (
              <div className="flex-1 h-px bg-slate-200 mx-3" />
            )}

          </div>

        ))}

      </div>

    </div>
  );
}


export default EyeSelection;