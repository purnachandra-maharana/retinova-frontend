import { useEffect, useMemo, useState } from "react";
import {
  getCase,
  getCases,
  saveDoctorReview,
  API_BASE_URL,
} from "../../services/api";

function DoctorCaseReview({
  caseData,
  onBack,
  onGenerateReport,
}) {
  const [completeCase, setCompleteCase] = useState(null);
  const [resolvedScreeningId, setResolvedScreeningId] = useState(null);
  const [loadingCase, setLoadingCase] = useState(true);
  const [caseError, setCaseError] = useState("");

  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  /*
   * The dashboard supplies:
   *   screeningId = numeric PostgreSQL screening ID
   *   id          = public case ID such as RS-34010251
   *
   * Prefer the numeric screeningId. If an older dashboard object
   * only has the case ID, resolve it through /api/cases.
   */
  const numericCaseDataId =
    caseData?.id !== undefined &&
    caseData?.id !== null &&
    /^\d+$/.test(String(caseData.id).trim())
      ? Number(caseData.id)
      : null;

  const screeningId =
    caseData?.screeningId ??
    caseData?.screening_id ??
    caseData?.screening?.id ??
    numericCaseDataId ??
    null;

  const caseId = caseData?.id ?? caseData?.case_id ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadCase() {
      setLoadingCase(true);
      setCaseError("");
      setCompleteCase(null);
      setResolvedScreeningId(null);

      try {
        if (
          screeningId !== null &&
          screeningId !== undefined &&
          String(screeningId).trim() !== ""
        ) {
          const response = await getCase(screeningId);

          if (!cancelled) {
            const loadedCase = response?.case || response?.screening || response;
            setCompleteCase(loadedCase);
            setResolvedScreeningId(
              loadedCase?.screeningId ??
              loadedCase?.screening_id ??
              loadedCase?.id ??
              screeningId
            );
          }

          return;
        }

        if (caseId) {
          const response = await getCases();

          const match = (response.cases || []).find(
            (item) => item.case_id === caseId
          );

          if (!match) {
            throw new Error(
              `Case ${caseId} was not found in the RetinaSafe backend.`
            );
          }

          const detail = await getCase(match.id);

          if (!cancelled) {
            const loadedCase = detail?.case || detail?.screening || detail;
            setCompleteCase(loadedCase);
            setResolvedScreeningId(
              match.id ??
              loadedCase?.screeningId ??
              loadedCase?.screening_id ??
              loadedCase?.id ??
              null
            );
          }

          return;
        }

        throw new Error(
          "This case does not contain a screening ID or case ID."
        );
      } catch (error) {
        console.error("Doctor case load failed:", error);

        if (!cancelled) {
          setCaseError(
            error.message ||
              "Unable to load the complete screening case."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCase(false);
        }
      }
    }

    loadCase();

    return () => {
      cancelled = true;
    };
  }, [screeningId, caseId]);

  const item = useMemo(() => {
    if (completeCase) {
      // /api/cases/:id returns the screening row flattened directly
      // into `case`; patient and aiResult are nested objects.
      const screening = completeCase;
      const patient = completeCase.patient || {};
      const ai = completeCase.aiResult || {};

      return {
        screeningId:
          resolvedScreeningId ??
          completeCase.screeningId ??
          completeCase.screening_id ??
          completeCase.id ??
          null,
        id:
          completeCase.caseId ||
          completeCase.case_id ||
          caseId ||
          "—",

        patient: patient.fullName || "Unknown patient",
        patientCode: patient.patientCode || "—",
        age: patient.age ?? "—",
        sex: patient.sex || "—",

        eye: (() => {
          const rawEye =
            screening.eye ??
            screening.selected_eye ??
            screening.screened_eye ??
            screening.screening_eye ??
            completeCase.eye ??
            completeCase.selected_eye ??
            completeCase.screened_eye ??
            caseData?.eye ??
            caseData?.selectedEye ??
            caseData?.selected_eye ??
            "";

          const normalizedEye = String(rawEye).trim().toUpperCase();

          if (normalizedEye === "LEFT" || normalizedEye === "LEFT EYE") {
            return "Left Eye";
          }

          if (normalizedEye === "RIGHT" || normalizedEye === "RIGHT EYE") {
            return "Right Eye";
          }

          return rawEye || "—";
        })(),

        result:
          ai.classification || "Analysis pending",

        confidence:
          ai.confidence === null ||
          ai.confidence === undefined
            ? null
            : Number(ai.confidence) <= 1
              ? Math.round(Number(ai.confidence) * 100)
              : Math.round(Number(ai.confidence)),

        clinic:
          screening.clinicName ||
          screening.clinic_name ||
          completeCase.clinicName ||
          completeCase.clinic_name ||
          caseData?.clinic ||
          "Clinic not recorded",

        worker:
          screening.workerName ||
          screening.worker_name ||
          completeCase.workerName ||
          completeCase.worker_name ||
          caseData?.worker ||
          "—",

        workerId:
          screening.workerId ||
          screening.worker_id ||
          completeCase.workerId ||
          completeCase.worker_id ||
          "—",

        workerDesignation:
          screening.workerDesignation ||
          screening.worker_designation ||
          completeCase.workerDesignation ||
          completeCase.worker_designation ||
          "—",

        date: (screening.createdAt || screening.created_at)
          ? new Date(
              screening.createdAt || screening.created_at
            ).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",

        status: screening.status || completeCase.status || "PENDING",

        images: completeCase.images || [],
        aiResult: ai,
        clinicalFindings:
          completeCase.clinicalFindings || [],
        doctorReviews:
          completeCase.doctorReviews || [],
      };
    }

    return {
      screeningId: resolvedScreeningId ?? screeningId,
      id: caseId || "—",
      patient: caseData?.patient || "Loading patient...",
      patientCode: caseData?.patientCode || "—",
      age: caseData?.age ?? "—",
      sex: caseData?.sex || "—",
      eye: caseData?.eye || "—",
      result: caseData?.result || "Analysis pending",
      confidence:
        caseData?.confidence === null ||
        caseData?.confidence === undefined
          ? null
          : Number(caseData.confidence),
      clinic: caseData?.clinic || "—",
      date: caseData?.date || "—",
      status: caseData?.status || "PENDING",
      images: caseData?.images || [],
      aiResult: caseData?.aiResult || null,
      clinicalFindings:
        caseData?.clinicalFindings || [],
      doctorReviews:
        caseData?.doctorReviews || [],
    };
  }, [completeCase, caseData, screeningId, caseId, resolvedScreeningId]);

  const isReferral =
    String(item.result).toLowerCase().includes("referable") ||
    Number(item.aiResult?.dr_level) >= 2;

  /*
   * Evidence must come from the dedicated backend evidence
   * endpoints. Do not rebuild the Grad-CAM URL from only the
   * filename because Grad-CAM files live in /uploads/gradcam.
   */
  const backendOrigin = API_BASE_URL.replace(/\/api$/, "");

  const evidenceScreeningId =
    item.screeningId ??
    completeCase?.screeningId ??
    completeCase?.screening_id ??
    completeCase?.id ??
    caseData?.screeningId ??
    caseData?.screening_id ??
    null;

  const originalImageUrl = useMemo(() => {
    if (!evidenceScreeningId) return "";

    const image =
      item.images?.[0] ||
      caseData?.images?.[0] ||
      null;
    if (image?.url) {
      const raw = String(image.url);
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith("/api/")) return `${backendOrigin}${raw}`;
      return `${backendOrigin}/${raw.replace(/^\/+/, "")}`;
    }

    return `${backendOrigin}/api/cases/${encodeURIComponent(
      String(evidenceScreeningId)
    )}/image`;
  }, [evidenceScreeningId, item.images, caseData?.images, backendOrigin]);

  const gradCamUrl = useMemo(() => {
    if (!evidenceScreeningId) return "";

    const explicit =
      item.aiResult?.gradcam_url ||
      item.aiResult?.gradcamUrl;

    if (explicit) {
      const raw = String(explicit);
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith("/api/")) return `${backendOrigin}${raw}`;
      return `${backendOrigin}/${raw.replace(/^\/+/, "")}`;
    }

    // The backend evidence route is the authoritative source.
    // Always try it when a valid screening ID exists; the route itself
    // returns 404 when no Grad-CAM file is stored.
    return `${backendOrigin}/api/cases/${encodeURIComponent(
      String(evidenceScreeningId)
    )}/gradcam`;
  }, [evidenceScreeningId, item.aiResult, caseData?.aiResult, backendOrigin]);

  const findings = item.clinicalFindings?.length
    ? item.clinicalFindings.map((finding) => ({
        label:
          finding.finding_type ||
          finding.findingType ||
          "Clinical finding",
        value:
          finding.finding_value ||
          finding.findingValue ||
          "Finding recorded by the screening pipeline.",
      }))
    : [
        {
          label: "AI classification",
          value:
            item.aiResult?.classification ||
            item.result ||
            "AI classification unavailable.",
        },
        {
          label: "Image quality assessment",
          value: item.aiResult?.quality_status
            ? `${item.aiResult.quality_status}${
                item.aiResult.quality_score !== null &&
                item.aiResult.quality_score !== undefined
                  ? ` · ${Number(item.aiResult.quality_score).toFixed(2)}/100`
                  : ""
              }`
            : "Quality assessment unavailable.",
        },
        {
          label: "Referral assessment",
          value:
            Number(item.aiResult?.dr_level) >= 2
              ? "The prototype screening rule recommends ophthalmic referral for this AI severity level."
              : "The prototype screening rule does not recommend ophthalmic referral for this AI severity level.",
        },
      ];


  async function handleSaveDecision() {
    if (!decision || saving || saved) {
      return;
    }

    let usableScreeningId =
      evidenceScreeningId ??
      item.screeningId ??
      completeCase?.screeningId ??
      completeCase?.screening_id ??
      completeCase?.id ??
      null;

    // Last-resort resolution for older dashboard objects that contain only
    // the public case ID (for example RS-43859839).
    if (!usableScreeningId && caseId) {
      try {
        const response = await getCases();
        const match = (response?.cases || []).find(
          (candidate) =>
            candidate?.case_id === caseId ||
            candidate?.caseId === caseId
        );

        if (match?.id) {
          usableScreeningId = match.id;
          setResolvedScreeningId(match.id);
        }
      } catch (error) {
        console.error("Unable to resolve screening ID:", error);
      }
    }

    if (!usableScreeningId) {
      setSaveError(
        "Unable to determine the database screening ID for this case. Return to the dashboard and open the case again."
      );
      return;
    }

    setSaving(true);
    setSaved(false);
    setSaveError("");

    try {
      const response = await saveDoctorReview(
        usableScreeningId,
        {
          reviewerName: "Ophthalmologist",
          decision,
          notes,
          referralStatus:
            decision === "Refer for ophthalmic care"
              ? "REFERRED"
              : "NOT_REFERRED",
        }
      );

      setSaved(true);

      if (onGenerateReport) {
        onGenerateReport({
          decision,
          notes,
          reviewedAt: new Date().toLocaleString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
          screeningId: usableScreeningId,
          screeningStatus: response?.screeningStatus,
          review: response?.review,
        });
      }
    } catch (error) {
      console.error(
        "Doctor review save failed:",
        error
      );

      setSaveError(
        error.message ||
          "Unable to save the clinical decision."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingCase) {
    return (
      <div className="min-h-screen bg-[#f4f8f8]">
        <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-11 h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold"
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
                Clinical review workspace
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-slate-200 border-t-teal-500 animate-spin" />
            <h2 className="text-xl font-bold mt-6">
              Loading screening case
            </h2>
            <p className="text-slate-500 mt-2">
              Fetching the complete case from the
              RetinaSafe backend...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (caseError) {
    return (
      <div className="min-h-screen bg-[#f4f8f8]">
        <header className="h-20 bg-white border-b border-slate-200 px-6 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-11 h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold"
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
                Clinical review workspace
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12">
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-7">
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-rose-600">
              Case loading error
            </p>

            <h2 className="text-2xl font-bold text-rose-900 mt-2">
              Unable to load this screening
            </h2>

            <p className="text-rose-800 mt-3">
              {caseError}
            </p>

            <button
              type="button"
              onClick={onBack}
              className="mt-6 px-5 py-3 rounded-xl bg-slate-950 text-white font-bold"
            >
              ← Back to dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f8f8] text-slate-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold"
            >
              ←
            </button>

            <div className="w-11 h-11 rounded-2xl bg-[#071b20] text-white flex items-center justify-center font-bold">
              RS
            </div>

            <div>
              <h1 className="font-bold text-lg tracking-tight">
                RetinaSafe
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-600 font-bold">
                Clinical review workspace
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">
              Case review
            </p>
            <p className="font-bold">
              {item.id}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 space-y-6">
        <section className="rounded-[28px] bg-[#071b20] text-white p-7 md:p-9 shadow-xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-teal-300 font-bold">
            Clinical review
          </p>

          <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Review screening case
              </h2>

              <p className="text-slate-300 mt-2">
                Inspect patient information, retinal evidence
                and explainability before recording the clinical
                decision.
              </p>
            </div>

            <div
              className={`px-4 py-3 rounded-2xl border ${
                isReferral
                  ? "bg-amber-400/10 border-amber-300/20 text-amber-200"
                  : "bg-teal-400/10 border-teal-300/20 text-teal-200"
              }`}
            >
              <div className="text-xs uppercase tracking-wider font-bold">
                AI assessment
              </div>

              <div className="text-lg font-bold mt-1">
                {item.result} ·{" "}
                {item.confidence ?? "—"}%
              </div>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">
                Patient & screening details
              </h3>

              <span className="text-xs font-bold text-slate-400">
                {item.date}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                ["Patient", item.patient],
                [
                  "Age / Sex",
                  `${item.age} years · ${item.sex}`,
                ],
                ["Screened eye", item.eye],
                ["Case ID", item.id],
                ["PHC / Clinic", item.clinic],
                ["Worker", item.worker],
                [
                  "AI confidence",
                  `${item.confidence ?? "—"}%`,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-slate-50 border border-slate-100 p-4"
                >
                  <p className="text-xs text-slate-400">
                    {label}
                  </p>
                  <p className="font-semibold mt-1">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold">
              AI finding
            </h3>

            <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Classification
              </p>

              <p
                className={`text-2xl font-bold mt-2 ${
                  isReferral
                    ? "text-amber-700"
                    : "text-teal-700"
                }`}
              >
                {item.result}
              </p>

              <p className="text-sm text-slate-500 mt-2">
                Model confidence:{" "}
                {item.confidence ?? "—"}%
              </p>
            </div>

            <div className="mt-4 text-sm text-slate-600 leading-relaxed">
              AI output is decision support and requires
              ophthalmologist review before clinical action.
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold">
                Retinal evidence
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Original image and Grad-CAM evidence supplied by
                the screening pipeline.
              </p>
            </div>

            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-500">
              Evidence panel
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <EvidenceCard
              title="Original fundus image"
              imageUrl={originalImageUrl}
              caseId={evidenceScreeningId}
            />

            <EvidenceCard
              title="Grad-CAM explanation"
              imageUrl={gradCamUrl}
              caseId={evidenceScreeningId}
              pendingText={
                "Grad-CAM will appear after MATLAB XAI integration."
              }
            />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold">
              Clinical observations
            </h3>

            <div className="mt-5 space-y-3">
              {findings.map((finding, index) => (
                <div
                  key={`${finding.label}-${index}`}
                  className="rounded-2xl bg-slate-50 border border-slate-100 p-4"
                >
                  <p className="text-sm font-semibold">
                    {finding.label}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    {finding.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold">
              Clinical decision
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Record the ophthalmologist's final assessment.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={() =>
                  setDecision(
                    "Approve AI assessment"
                  )
                }
                className={`rounded-2xl border p-4 text-left ${
                  decision === "Approve AI assessment"
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-200 hover:border-teal-200"
                }`}
              >
                <p className="font-semibold">
                  Approve AI assessment
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Accept the AI recommendation.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDecision(
                    "Refer for ophthalmic care"
                  )
                }
                className={`rounded-2xl border p-4 text-left ${
                  decision ===
                  "Refer for ophthalmic care"
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-200 hover:border-amber-200"
                }`}
              >
                <p className="font-semibold">
                  Refer for ophthalmic care
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Escalate for clinical follow-up.
                </p>
              </button>
            </div>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Add clinical review notes..."
              className="w-full mt-4 min-h-28 rounded-2xl border border-slate-200 p-4 outline-none focus:border-teal-500"
            />

            {saveError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {saveError}
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveDecision}
              disabled={
                !decision ||
                saving ||
                saved
              }
              className="w-full mt-4 rounded-2xl bg-[#071b20] text-white py-3.5 font-bold disabled:opacity-40"
            >
              {saving
                ? "Saving clinical decision..."
                : saved
                  ? "✓ Clinical decision saved"
                  : "Save clinical decision"}
            </button>

            {saved && (
              <p className="text-xs text-teal-700 mt-3 text-center">
                Decision recorded in the RetinaSafe backend.
              </p>
            )}
          </div>
        </section>

        <footer className="rounded-2xl bg-white border border-slate-200 p-5 text-xs text-slate-500 leading-relaxed">
          RetinaSafe AI is a screening decision-support
          system, not a replacement for clinical judgment.
          Final diagnosis and treatment decisions remain with
          the reviewing ophthalmologist.
        </footer>
      </main>
    </div>
  );
}

function EvidenceCard({
  title,
  imageUrl,
  caseId,
  pendingText = "Image evidence will appear here.",
}) {
  const [failedUrl, setFailedUrl] = useState("");
  const isGradCam = title.toLowerCase().includes("grad-cam");
  const numericId = String(caseId || "").trim();
  const backendOrigin = API_BASE_URL.replace(/\/api$/, "");

  const fallbackUrl =
    numericId && /^\d+$/.test(numericId)
      ? `${backendOrigin}/api/cases/${encodeURIComponent(numericId)}/${
          isGradCam ? "gradcam" : "image"
        }`
      : "";

  const sourceUrl = imageUrl || fallbackUrl;
  const currentUrl =
    failedUrl && failedUrl === sourceUrl && fallbackUrl && sourceUrl !== fallbackUrl
      ? fallbackUrl
      : failedUrl
        ? ""
        : sourceUrl;

  const showPlaceholder = !currentUrl;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200">
      <div className="aspect-[16/10] bg-[#071b20] flex items-center justify-center p-4">
        {!showPlaceholder ? (
          <img
            src={currentUrl}
            alt={title}
            className="w-full h-full object-contain rounded-xl"
            onError={() => {
              if (fallbackUrl && currentUrl !== fallbackUrl) {
                setFailedUrl(currentUrl);
              } else {
                setFailedUrl(currentUrl);
              }
            }}
          />
        ) : (
          <div className="w-40 h-40 rounded-full border border-teal-300/20 bg-teal-300/5 flex items-center justify-center text-center px-5">
            <div>
              <p className="text-teal-200 font-semibold text-sm">
                {title}
              </p>

              <p className="text-slate-400 text-xs mt-2">
                {pendingText}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white">
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-slate-400 mt-1">
          Linked to case {caseId}
        </p>
      </div>
    </div>
  );
}

export default DoctorCaseReview;
