import { useState } from "react";
import {
  UserRound,
  ArrowRight,
  ArrowLeft,
  MapPin,
} from "lucide-react";

function PatientDetails({ patient, setPatient, onNext, onBack }) {
  const [error, setError] = useState("");

  const updateField = (field, value) => {
    setPatient({
      ...patient,
      [field]: value,
    });

    setError("");
  };

  const handleContinue = () => {
    if (!patient.patientId.trim()) {
      setError("Please enter the patient ID.");
      return;
    }

    if (!patient.age) {
      setError("Please enter the patient's age.");
      return;
    }

    if (!patient.sex) {
      setError("Please select the patient's sex.");
      return;
    }

    onNext();
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-10 flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center">
            <span className="text-white text-lg">👁</span>
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

        <span className="text-sm text-slate-500">
          Step <b className="text-slate-900">1</b> of 6
        </span>

      </header>


      {/* Progress */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">

        <div className="max-w-5xl mx-auto flex items-center">

          {[
            "Patient",
            "Eye",
            "Capture",
            "Quality",
            "Analysis",
            "Result",
          ].map((step, index) => (

            <div
              key={step}
              className="flex items-center flex-1"
            >

              <div className="flex items-center gap-2">

                <div
                  className={
                    index === 0
                      ? "w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center text-xs font-bold"
                      : "w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold"
                  }
                >
                  {index + 1}
                </div>

                <span
                  className={
                    index === 0
                      ? "hidden sm:block text-xs font-semibold text-slate-900"
                      : "hidden sm:block text-xs text-slate-400"
                  }
                >
                  {step}
                </span>

              </div>

              {index < 5 && (
                <div className="flex-1 h-px bg-slate-200 mx-3" />
              )}

            </div>

          ))}

        </div>

      </div>


      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-10">

        <div className="mb-8">

          <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-full text-xs font-medium text-slate-600">

            <UserRound className="w-4 h-4" />

            Step 1 · Patient

          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mt-5">
            Patient information
          </h2>

          <p className="text-slate-500 mt-2">
            Enter the patient's basic information to begin screening.
          </p>

        </div>


        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">

          {/* Patient ID */}
          <div className="mb-6">

            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Patient ID
            </label>

            <input
              type="text"
              value={patient.patientId}
              onChange={(e) =>
                updateField("patientId", e.target.value)
              }
              placeholder="e.g. P-2026-001"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none focus:border-slate-900"
            />

            <p className="text-xs text-slate-400 mt-2">
              Enter the ID used by your health centre.
            </p>

          </div>


          {/* Age + Sex */}
          <div className="grid md:grid-cols-2 gap-5 mb-6">

            <div>

              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Age
              </label>

              <input
                type="number"
                min="1"
                max="120"
                value={patient.age}
                onChange={(e) =>
                  updateField("age", e.target.value)
                }
                placeholder="Enter age"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 outline-none focus:border-slate-900"
              />

            </div>


            <div>

              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Sex
              </label>

              <select
                value={patient.sex}
                onChange={(e) =>
                  updateField("sex", e.target.value)
                }
                className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900"
              >

                <option value="">
                  Select sex
                </option>

                <option value="female">
                  Female
                </option>

                <option value="male">
                  Male
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </div>

          </div>


          {/* Location */}
          <div className="mb-6">

            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Screening location
            </label>

            <div className="relative">

              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

              <input
                type="text"
                value={patient.location}
                onChange={(e) =>
                  updateField("location", e.target.value)
                }
                placeholder="e.g. Rural PHC"
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 outline-none focus:border-slate-900"
              />

            </div>

          </div>


          {/* Diabetes */}
          <div>

            <label className="block text-sm font-semibold text-slate-800 mb-3">
              Known diabetes?
            </label>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  updateField("diabetes", "yes")
                }
                className={
                  patient.diabetes === "yes"
                    ? "py-3 rounded-xl bg-slate-950 text-white font-medium"
                    : "py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                }
              >
                Yes
              </button>

              <button
                type="button"
                onClick={() =>
                  updateField("diabetes", "no")
                }
                className={
                  patient.diabetes === "no"
                    ? "py-3 rounded-xl bg-slate-950 text-white font-medium"
                    : "py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                }
              >
                No
              </button>

            </div>

          </div>


          {/* Error */}
          {error && (
            <div className="mt-6 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

        </div>


        {/* Buttons */}
        <div className="flex items-center justify-between mt-6">

          <button
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-slate-600 hover:bg-white border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>


          <button
            onClick={handleContinue}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>

      </main>

    </div>
  );
}

export default PatientDetails;