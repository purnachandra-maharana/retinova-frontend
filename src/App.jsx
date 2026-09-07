import { useEffect, useMemo, useState } from "react";

import Login from "./pages/auth/Login";

import EyeSelection from "./pages/phc/EyeSelection";
import CaptureImage from "./pages/phc/CaptureImage";
import QualityCheck from "./pages/phc/QualityCheck";
import AIAnalysis from "./pages/phc/AIAnalysis";
import ScreeningResult from "./pages/phc/ScreeningResult";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorCaseReview from "./pages/doctor/DoctorCaseReview";
import ClinicalReport from "./pages/doctor/ClinicalReport";
import {
  createPatient,
  createScreening,
  getCurrentUser,
  getPatients,
  getScreenings,
  logout,
} from "./services/api";


function AnimatedRetinaEye({ size = 44, dark = false }) {
  return (
    <div
      className={`retinova-eye-logo ${dark ? "retinova-eye-logo-dark" : ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="retinova-eye-glow" />
      <svg viewBox="0 0 100 64" className="retinova-eye-svg">
        <path
          className="retinova-eye-upper"
          d="M5 32 C24 6, 76 6, 95 32 C76 20, 24 20, 5 32 Z"
        />
        <path
          className="retinova-eye-lower"
          d="M5 32 C24 58, 76 58, 95 32 C76 44, 24 44, 5 32 Z"
        />
        <ellipse cx="50" cy="32" rx="27" ry="22" className="retinova-eye-sclera" />
        <g className="retinova-eye-blink">
          <circle cx="50" cy="32" r="18" className="retinova-eye-iris-ring" />
          <circle cx="50" cy="32" r="13" className="retinova-eye-iris" />
          <circle cx="50" cy="32" r="6" className="retinova-eye-pupil" />
          <circle cx="46" cy="27" r="2.4" className="retinova-eye-highlight" />
        </g>
        <path d="M12 32 C29 10, 71 10, 88 32" className="retinova-eye-lid-line" />
        <path d="M12 32 C29 54, 71 54, 88 32" className="retinova-eye-lid-line retinova-eye-lid-bottom" />
        <circle cx="50" cy="32" r="27" className="retinova-eye-scan-ring" />
      </svg>
    </div>
  );
}

function RetinovaLogo({ compact = false, dark = false }) {
  return (
    <div className={`flex items-center ${compact ? "gap-2.5" : "gap-3"}`}>
      <AnimatedRetinaEye size={compact ? 40 : 50} dark={dark} />
      <div className="min-w-0">
        <div className={`font-black tracking-[0.06em] leading-none ${compact ? "text-[17px]" : "text-[20px]"} ${dark ? "text-white" : "text-[#0F2742]"}`}>
          Retinova
        </div>
        {!compact && (
          <div className={`text-[8px] uppercase tracking-[0.14em] font-semibold mt-1 ${dark ? "text-[#9AAAB5]" : "text-[#647887]"}`}>
            AI-Powered Diabetic Retinopathy Screening
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   APP
   ========================================================= */

function App() {
  /* =========================================================
     AUTHENTICATION / SESSION
     ========================================================= */

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    getCurrentUser()
      .then((result) => {
        setSession(result.user);
        setRole(String(result.user.role || "").toLowerCase());
      })
      .catch(() => setSession(null))
      .finally(() => setAuthLoading(false));
  }, []);

  /* =========================================================
     GLOBAL STATE
     ========================================================= */

  const [doctorView, setDoctorView] = useState("dashboard");
  const [selectedCase, setSelectedCase] = useState(null);
  const [doctorReview, setDoctorReview] = useState(null);

  /*
    PHC workflow:

    patient
      ↓
    eye
      ↓
    capture
      ↓
    quality
      ↓
    analysis
      ↓
    result
  */

  const [phcStage, setPhcStage] = useState("patient");


  /* =========================================================
     PATIENT + SCREENING INFORMATION
     ========================================================= */

  const [patient, setPatient] = useState({
    /* -------------------------
       Clinic / PHC
    ------------------------- */

    clinicName: "",
    clinicId: "",
    clinicLocation: "",
    clinicPhone: "",


    /* -------------------------
       Patient identity
    ------------------------- */

    patientId: "",
    fullName: "",
    dob: "",
    age: "",
    sex: "",
    phone: "",
    address: "",
    village: "",
    district: "",
    state: "",


    /* -------------------------
       Diabetes history
    ------------------------- */

    diabetesType: "",
    diabetesSince: "",
    treatment: "",
    hba1c: "",
    previousDR: "",
    previousEyeTreatment: "",


    /* -------------------------
       Screening information
    ------------------------- */

    screeningReason: "",


    /* -------------------------
       PHC worker
    ------------------------- */

    workerName: "",
    workerId: "",
    workerDesignation: "",
  });


  /* =========================================================
     SCREENING STATE
     ========================================================= */

  const [selectedEye, setSelectedEye] = useState("");

  const [imageFile, setImageFile] = useState(null);

  const [backendPatientId, setBackendPatientId] = useState(null);
  const [screeningId, setScreeningId] = useState(null);
  const [backendError, setBackendError] = useState("");
  const [savingPatient, setSavingPatient] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);


  /* =========================================================
     AUTHENTICATION HANDLERS
     ========================================================= */

  const handleLogin = (loginSession) => {
    setSession(loginSession);
    setRole(loginSession.role);

    if (loginSession.role === "phc") {
      setPhcStage("patient");
    }

    if (loginSession.role === "doctor") {
      setDoctorView("dashboard");
      setSelectedCase(null);
      setDoctorReview(null);
    }
  };

  const handleLogout = () => {
    logout().catch(() => {});
    setSession(null);
    setRole(null);
    setDoctorView("dashboard");
    setSelectedCase(null);
    setDoctorReview(null);
    setPhcStage("patient");
    setPatient({
      clinicName: "",
      clinicId: "",
      clinicLocation: "",
      clinicPhone: "",
      patientId: "",
      fullName: "",
      dob: "",
      age: "",
      sex: "",
      phone: "",
      address: "",
      village: "",
      district: "",
      state: "",
      diabetesType: "",
      diabetesSince: "",
      treatment: "",
      hba1c: "",
      previousDR: "",
      previousEyeTreatment: "",
      screeningReason: "",
      workerName: "",
      workerId: "",
      workerDesignation: "",
    });
    setSelectedEye("");
    setImageFile(null);
    setBackendPatientId(null);
    setScreeningId(null);
    setAnalysisResult(null);
    setBackendError("");
  };

  /* =========================================================
     SAFE STAGE FALLBACK
     =========================================================

     IMPORTANT:
     This hook must run on EVERY render, including the login
     screen. It cannot be placed below the authentication
     early-return because that would change React hook order
     after login and can cause a blank screen.
     ========================================================= */

  useEffect(() => {
    const validStages = [
      "patient",
      "eye",
      "capture",
      "quality",
      "analysis",
      "result",
    ];

    if (!validStages.includes(phcStage)) {
      setPhcStage("patient");
    }
  }, [phcStage]);

  /* =========================================================
     AUTHENTICATION GUARD
     ========================================================= */

  if (authLoading) {
    return <main className="min-h-screen bg-[#061a1d]" aria-busy="true" />;
  }

  if (!session || !role) {
    return <Login onLogin={handleLogin} />;
  }



  /* =========================================================
     PHC WORKFLOW
     ========================================================= */

  if (role === "phc") {

    /* =======================================================
       STEP 1 — PATIENT REGISTRATION
       ======================================================= */

    if (phcStage === "patient") {
      return (
        <PatientScreen
          patient={patient}
          setPatient={setPatient}
          backendError={backendError}
          savingPatient={savingPatient}
          session={session}
          onLogout={handleLogout}

          onNext={async () => {
            if (backendPatientId) {
              setBackendError("");
              setPhcStage("eye");
              return;
            }

            try {
              setSavingPatient(true);
              setBackendError("");

              const response = await createPatient(patient);

              setBackendPatientId(response.patient.id);
              setPhcStage("eye");
            } catch (error) {
              console.error("Patient registration failed:", error);
              setBackendError(error.message || "Failed to save patient");
            } finally {
              setSavingPatient(false);
            }
          }}

          onBack={() => {
            handleLogout();
          }}
        />
      );
    }


    /* =======================================================
       STEP 2 — EYE SELECTION
       ======================================================= */

    if (phcStage === "eye") {
      return (
        <EyeSelection
          selectedEye={selectedEye}
          setSelectedEye={setSelectedEye}

          onNext={async () => {
            if (!backendPatientId) {
              setBackendError(
                "Patient record is not saved yet. Please go back and save patient screening."
              );
              setPhcStage("patient");
              return;
            }

            if (screeningId) {
              setBackendError("");
              setPhcStage("capture");
              return;
            }

            try {
              setBackendError("");

              const response = await createScreening({
                patientId: backendPatientId,
                patient,
                selectedEye,
              });

              setScreeningId(response.screening.id);
              setPhcStage("capture");
            } catch (error) {
              console.error("Screening creation failed:", error);
              setBackendError(error.message || "Failed to create screening");
            }
          }}

          onBack={() => {
            setPhcStage("patient");
          }}
        />
      );
    }


    /* =======================================================
       STEP 3 — FUNDUS CAPTURE
       ======================================================= */

    if (phcStage === "capture") {
      return (
        <CaptureImage
          selectedEye={selectedEye}
          imageFile={imageFile}
          setImageFile={setImageFile}
          screeningId={screeningId}

          onNext={(result) => {
            console.log("Retinova MATLAB result received:", result);
            setAnalysisResult(result);
            setPhcStage("quality");
          }}

          onBack={() => {
            setPhcStage("eye");
          }}
        />
      );
    }


    /* =======================================================
       STEP 4 — IMAGE QUALITY
       ======================================================= */

    if (phcStage === "quality") {
      return (
        <QualityCheck
          selectedEye={selectedEye}
          imageFile={imageFile}
          analysisResult={analysisResult}

          onNext={() => {
            setPhcStage("analysis");
          }}

          onBack={() => {
            setPhcStage("capture");
          }}
        />
      );
    }


    /* =======================================================
       STEP 5 — AI ANALYSIS
       ======================================================= */

    if (phcStage === "analysis") {
      return (
        <AIAnalysis
          selectedEye={selectedEye}
          imageFile={imageFile}
          analysisResult={analysisResult}
          screeningId={screeningId}

          onNext={() => {
            setPhcStage("result");
          }}

          onBack={() => {
            setPhcStage("quality");
          }}
        />
      );
    }


    /* =======================================================
       STEP 6 — SCREENING RESULT
       ======================================================= */

    if (phcStage === "result") {
      return (
        <ScreeningResult
          patient={patient}
          selectedEye={selectedEye}
          imageFile={imageFile}
          screeningId={screeningId}
          analysisResult={analysisResult}

          onBack={() => {
            setPhcStage("analysis");
          }}

          onRestart={() => {

            setPatient({
              /* Clinic / PHC */
              clinicName: "",
              clinicId: "",
              clinicLocation: "",
              clinicPhone: "",

              /* Patient identity */
              patientId: "",
              fullName: "",
              dob: "",
              age: "",
              sex: "",
              phone: "",
              address: "",
              village: "",
              district: "",
              state: "",

              /* Diabetes */
              diabetesType: "",
              diabetesSince: "",
              treatment: "",
              hba1c: "",
              previousDR: "",
              previousEyeTreatment: "",

              /* Screening */
              screeningReason: "",

              /* PHC worker */
              workerName: "",
              workerId: "",
              workerDesignation: "",
            });

            setSelectedEye("");

            setImageFile(null);
            setBackendPatientId(null);
            setScreeningId(null);
            setAnalysisResult(null);
            setBackendError("");

            setPhcStage("patient");
          }}
        />
      );
    }


    /* =======================================================
       FALLBACK
       ======================================================= */

    return null;
  }


  /* =========================================================
     OPHTHALMOLOGIST
     ========================================================= */

  if (role === "doctor") {
    if (doctorView === "report" && selectedCase) {
      return (
        <ClinicalReport
          caseData={selectedCase}
          review={doctorReview}
          onBack={() => setDoctorView("review")}
          onDashboard={() => {
            setDoctorReview(null);
            setSelectedCase(null);
            setDoctorView("dashboard");
          }}
        />
      );
    }

    if (doctorView === "review" && selectedCase) {
      return (
        <DoctorCaseReview
          caseData={selectedCase}
          onBack={() => {
            setSelectedCase(null);
            setDoctorReview(null);
            setDoctorView("dashboard");
          }}
          onGenerateReport={(reviewData) => {
            setDoctorReview(reviewData);
            setDoctorView("report");
          }}
        />
      );
    }

    return (
      <DoctorDashboard
        session={session}
        onLogout={handleLogout}
        onReviewCase={(caseData) => {
          setSelectedCase(caseData);
          setDoctorView("review");
        }}
        onBack={() => {
          handleLogout();
        }}
      />
    );
  }


  return null;
}


/* =========================================================
   ROLE SELECTION
   ========================================================= */

function RoleSelection({ onSelectRole }) {
  return (
    <main className="min-h-screen bg-[#07151a] text-white relative overflow-hidden flex items-center justify-center px-6 py-12">

      {/* Background atmosphere */}

      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#D9F3F4]/10 blur-3xl" />

      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-3xl" />


      {/* Main */}

      <div className="relative z-10 w-full max-w-6xl">

        {/* BRAND */}

        <div className="text-center mb-14 step-enter">

          <div className="flex justify-center mb-6">

            <div className="role-eye-container">

              <div className="role-eye">

                <div className="role-eye-pupil" />

              </div>

            </div>

          </div>


          <p className="text-xs uppercase tracking-[0.3em] text-[#36C5D8] font-bold">
            Intelligent retinal screening
          </p>


          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mt-3">
            Retina<span className="text-[#36C5D8]">Safe</span>
          </h1>


          <p className="mt-5 text-base sm:text-lg text-[#7A8D9B] max-w-2xl mx-auto leading-relaxed">
            Explainable AI-assisted diabetic retinopathy screening
            designed for connected rural healthcare.
          </p>

        </div>


        {/* ROLE HEADING */}

        <div className="text-center mb-8">

          <p className="text-sm text-[#647887]">
            Secure clinical workspace
          </p>

          <h2 className="text-2xl sm:text-3xl font-bold mt-2">
            Select your role
          </h2>

        </div>


        {/* ROLE CARDS */}

        <div className="grid md:grid-cols-2 gap-6">


          {/* PHC */}

          <button
            type="button"
            onClick={() => onSelectRole("phc")}
            className="group text-left rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-8 sm:p-10 hover:bg-white/[0.08] hover:border-teal-400/30 transition-all duration-500 hover:-translate-y-1"
          >

            <div className="flex items-start justify-between">

              <div className="role-card-icon">
                +
              </div>

              <span className="text-xs font-semibold text-[#647887] group-hover:text-[#36C5D8] transition-colors">
                WORKSPACE 01
              </span>

            </div>


            <h3 className="text-2xl font-bold mt-8">
              PHC Worker
            </h3>


            <p className="mt-3 text-[#7A8D9B] leading-relaxed">
              Register patients, capture fundus images and perform
              AI-assisted retinal screening at the primary health centre.
            </p>


            <div className="mt-8 flex items-center gap-3 text-[#36C5D8] font-semibold">

              <span>
                Start screening
              </span>

              <span className="transition-transform duration-300 group-hover:translate-x-2">
                →
              </span>

            </div>

          </button>


          {/* OPHTHALMOLOGIST */}

          <button
            type="button"
            onClick={() => onSelectRole("doctor")}
            className="group text-left rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-8 sm:p-10 hover:bg-white/[0.08] hover:border-cyan-400/30 transition-all duration-500 hover:-translate-y-1"
          >

            <div className="flex items-start justify-between">

              <div className="role-card-icon">
                ◉
              </div>

              <span className="text-xs font-semibold text-[#647887] group-hover:text-cyan-300 transition-colors">
                WORKSPACE 02
              </span>

            </div>


            <h3 className="text-2xl font-bold mt-8">
              Ophthalmologist
            </h3>


            <p className="mt-3 text-[#7A8D9B] leading-relaxed">
              Review screening cases, inspect AI explanations and
              make the final clinical decision.
            </p>


            <div className="mt-8 flex items-center gap-3 text-cyan-300 font-semibold">

              <span>
                Review cases
              </span>

              <span className="transition-transform duration-300 group-hover:translate-x-2">
                →
              </span>

            </div>

          </button>

        </div>


        {/* FOOTER */}

        <div className="text-center mt-10">

          <p className="text-xs text-[#647887]">
            AI-assisted screening • Human clinical review
          </p>

        </div>

      </div>

    </main>
  );
}


function ClinicalStat({ label, value, hint, tone = "default" }) {
  const toneClass = tone === "success" ? "text-[#20A464] bg-[#E8F7F0]" : tone === "warning" ? "text-[#B77A19] bg-[#FFF5E3]" : tone === "critical" ? "text-[#D9534F] bg-[#FCEBEA]" : "text-[#1E5A7A] bg-[#D9F3F4]";
  return (
    <div className="bg-white border border-[#D8E4EC] rounded-[18px] p-4 shadow-[0_4px_18px_rgba(15,39,66,0.035)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-[#647887]">{label}</p>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${toneClass}`}>•</span>
      </div>
      <p className="text-2xl font-black text-[#0F2742] mt-2">{value}</p>
      <p className="text-[10px] text-[#7A8D9B] mt-1">{hint}</p>
    </div>
  );
}


function DistributionCard({ title, subtitle, children }) {
  return (
    <div className="bg-white border border-[#D8E4EC] rounded-[22px] shadow-[0_6px_24px_rgba(15,39,66,0.04)] p-5">
      <h3 className="text-sm font-bold text-[#172B3A]">{title}</h3>
      <p className="text-[11px] text-[#7A8D9B] mt-1">{subtitle}</p>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function DistributionRow({ label, value, total }) {
  const percent = total ? Math.round((Number(value) / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="font-semibold text-[#647887]">{label}</span>
        <span className="font-bold text-[#172B3A]">{value} <span className="font-medium text-[#9AAAB5]">({percent}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-[#E7F3F5] overflow-hidden"><div className="h-full rounded-full bg-[#159A9C]" style={{ width: `${Math.min(percent, 100)}%` }} /></div>
    </div>
  );
}

function MiniProgress({ label, value, total }) {
  const percent = Math.min(100, Math.round((Number(value) / Math.max(total, 1)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1.5"><span className="text-[#DDE8EF]">{label}</span><span className="font-bold text-white">{value}</span></div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[#36C5D8]" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

/* =========================================================
   PATIENT SCREEN
   ========================================================= */

function PatientScreen({
  patient,
  setPatient,
  backendError,
  savingPatient = false,
  session,
  onLogout,
  onNext,
  onBack,
}) {

  const [section, setSection] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPage, setMenuPage] = useState("workspace");
  const [workspaceMode, setWorkspaceMode] = useState("dashboard");
  const [recentScreenings, setRecentScreenings] = useState([]);
  const [allScreenings, setAllScreenings] = useState([]);

  useEffect(() => {
    let active = true;

    getScreenings()
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.screenings)
            ? response.screenings
            : Array.isArray(response?.data)
              ? response.data
              : [];
        setAllScreenings(rows);
        setRecentScreenings(rows.slice(0, 3));
      })
      .catch(() => {
        if (active) setRecentScreenings([]);
      });

    return () => {
      active = false;
    };
  }, []);


  /* =======================================================
     SECTION DATA
     ======================================================= */

  const sectionTitles = [
    "Patient identity",
    "Diabetes history",
    "PHC & screening",
  ];


  const sectionDescriptions = [
    "Enter the patient's identifying information. These details will be included in the screening record.",
    "Capture the patient's diabetes history to provide clinical context for retinal screening.",
    "Record the healthcare worker and clinic responsible for this screening. These details will appear in the final clinical report.",
  ];

  const screeningStats = useMemo(() => {
    const rows = Array.isArray(allScreenings) ? allScreenings : [];
    const completed = rows.filter((item) => String(item.status || '').toUpperCase() === 'COMPLETED').length;
    const pending = rows.filter((item) => ['PENDING','PROCESSING'].includes(String(item.status || '').toUpperCase())).length;
    const referred = rows.filter((item) => String(item.status || '').toUpperCase() === 'REFERRED').length;

    const gradeCounts = [0, 0, 0, 0, 0];
    const eyeCounts = { right: 0, left: 0, both: 0, unknown: 0 };
    const statusCounts = { completed: 0, pending: 0, reviewed: 0, referred: 0, other: 0 };

    rows.forEach((item) => {
      const status = String(item.status || '').toUpperCase();
      if (status === 'COMPLETED') statusCounts.completed += 1;
      else if (status === 'PENDING' || status === 'PROCESSING') statusCounts.pending += 1;
      else if (status === 'REVIEWED') statusCounts.reviewed += 1;
      else if (status === 'REFERRED') statusCounts.referred += 1;
      else statusCounts.other += 1;

      const eye = String(item.eye || item.selected_eye || '').toUpperCase();
      if (eye === 'RIGHT' || eye === 'OD') eyeCounts.right += 1;
      else if (eye === 'LEFT' || eye === 'OS') eyeCounts.left += 1;
      else if (eye === 'BOTH' || eye === 'OU') eyeCounts.both += 1;
      else eyeCounts.unknown += 1;

      const gradeValue = item.dr_level ?? item.grade ?? item.ai_result?.dr_level ?? item.aiResult?.dr_level;
      const grade = Number(gradeValue);
      if (Number.isInteger(grade) && grade >= 0 && grade <= 4) gradeCounts[grade] += 1;
    });

    const dayLabels = [];
    const dayCounts = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      dayLabels.push(date.toLocaleDateString('en-IN', { weekday: 'short' }));
      const key = date.toISOString().slice(0, 10);
      dayCounts.push(rows.filter((item) => {
        if (!item.created_at) return false;
        const d = new Date(item.created_at);
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
      }).length);
    }

    return { total: rows.length, completed, pending, referred, dayLabels, dayCounts, gradeCounts, eyeCounts, statusCounts };
  }, [allScreenings]);


  /* =======================================================
     UPDATE PATIENT
     ======================================================= */

  const calculateAge = (dobValue) => {
    if (!dobValue) return "";

    const parts = String(dobValue).split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return "";

    const [year, month, day] = parts;
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);

    if (
      birthDate.getFullYear() !== year ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day ||
      birthDate > today
    ) {
      return "";
    }

    let age = today.getFullYear() - year;
    if (
      today.getMonth() < month - 1 ||
      (today.getMonth() === month - 1 && today.getDate() < day)
    ) {
      age -= 1;
    }

    return age >= 0 ? String(age) : "";
  };

  const updatePatient = (field, value) => {
    if (field === "dob") {
      setPatient((previous) => ({
        ...previous,
        dob: value,
        age: calculateAge(value),
      }));
      return;
    }

    setPatient((previous) => ({
      ...previous,
      [field]: value,
    }));
  };


  if (menuPage !== "workspace") {
    return (
      <PHCMenuPage
        page={menuPage}
        session={session}
        onBack={() => setMenuPage("workspace")}
        onLogout={onLogout}
      />
    );
  }


  /* =======================================================
     VALIDATION
     ======================================================= */

  const canContinue = () => {

    /* Section 1 */

    if (section === 0) {
      return (
        patient.fullName.trim() !== "" &&
        patient.patientId.trim() !== "" &&
        patient.age !== "" &&
        patient.sex !== ""
      );
    }


    /* Section 2 */

    if (section === 1) {
      return patient.diabetesType !== "";
    }


    /* Section 3 */

    if (section === 2) {
      return (
        patient.workerName.trim() !== "" &&
        patient.workerId.trim() !== "" &&
        patient.clinicName.trim() !== ""
      );
    }


    return false;
  };


  /* =======================================================
     NEXT
     ======================================================= */

  const handleNext = () => {

    if (!canContinue()) {
      return;
    }


    if (section < 2) {
      setSection((previous) => previous + 1);
    } else {
      onNext();
    }
  };


  /* =======================================================
     PHC DASHBOARD
     ======================================================= */

  if (workspaceMode === "dashboard") {
    return (
      <PHCDashboard
        session={session}
        screenings={allScreenings}
        recentScreenings={recentScreenings}
        onNewScreening={() => {
          setWorkspaceMode("new");
          setSection(0);
          setPhcError("");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onPatients={() => setMenuPage("patients")}
        onHistory={() => setMenuPage("history")}
        onSettings={() => setMenuPage("settings")}
        onHelp={() => setMenuPage("help")}
        onLogout={onLogout}
      />
    );
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#172B3A] relative overflow-hidden">
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[230px] z-[60] bg-[#0F2742] text-white flex-col border-r border-[#173A5B]">
        <div className="px-6 py-6 border-b border-white/10"><RetinovaLogo dark /></div>
        <nav className="px-4 py-5 flex-1 overflow-y-auto">
          <p className="px-3 mb-3 text-[10px] uppercase tracking-[0.2em] text-[#8FA7B8] font-bold">PHC workspace</p>
          <button type="button" onClick={() => { setWorkspaceMode("dashboard"); setMenuPage("workspace"); window.scrollTo({top:0,behavior:"smooth"}); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1E5A7A] text-white text-sm font-semibold mb-1"><span>⌂</span>Dashboard</button>
          <button type="button" onClick={() => { setWorkspaceMode("new"); setMenuPage("workspace"); setSection(0); window.scrollTo({top:0,behavior:"smooth"}); }} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/10 text-sm font-semibold transition"><span>＋</span>New Screening</button>
          <button type="button" onClick={() => setMenuPage("history")} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/10 text-sm font-semibold transition"><span>▤</span>Previous Screenings</button>
          <button type="button" onClick={() => setMenuPage("patients")} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/10 text-sm font-semibold transition"><span>♙</span>Patient Records</button>
          <button type="button" onClick={() => setMenuPage("settings")} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/10 text-sm font-semibold transition"><span>⚙</span>Settings</button>
          <button type="button" onClick={() => setMenuPage("help")} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/10 text-sm font-semibold transition"><span>?</span>Help & Guidance</button>
        </nav>
        <div className="px-4 pb-5">
        <div className="rounded-2xl border border-[#36C5D8]/25 bg-[#071A2D] p-4 mb-3 overflow-hidden relative">
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-[#36C5D8]/10 blur-2xl" />
          <div className="relative flex flex-col items-center">
            <AnimatedRetinaEye size={82} dark />
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#36C5D8] font-bold mt-1">Screening station</p>
            <p className="text-xs text-[#DCEAF1] mt-1 text-center">AI-assisted retinal screening</p>
          </div>
        </div>
        <button type="button" onClick={onLogout} className="w-full rounded-xl border border-[#36C5D8]/30 py-3 text-sm font-semibold text-white hover:bg-white/10 transition">↪ Sign Out</button>
      </div>
      </aside>
      <div className="lg:ml-[230px]">
      <style>{`
        @keyframes retinovaScan { 0%,100%{transform:translateY(-36px);opacity:.15} 50%{transform:translateY(36px);opacity:.95} }
        @keyframes retinovaPulse { 0%,100%{transform:scale(.94);opacity:.7} 50%{transform:scale(1.05);opacity:1} }
        @keyframes retinovaOrbit { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .retinova-eye-core{animation:retinovaPulse 3.2s ease-in-out infinite}
        .retinova-scan-line{animation:retinovaScan 2.6s ease-in-out infinite}
        .retinova-orbit{animation:retinovaOrbit 12s linear infinite}
        @keyframes retinovaGlowPulse { 0%,100%{transform:scale(.92);opacity:.45} 50%{transform:scale(1.08);opacity:1} }
        @keyframes retinovaBlink {
          0%, 43%, 48%, 100% { transform: scaleY(1); }
          45%, 46.5% { transform: scaleY(0.08); }
        }
        @keyframes retinovaIrisPulse {
          0%, 100% { transform: scale(0.96); opacity: .92; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes retinovaScanSweep {
          0% { transform: translateY(-52px); opacity: 0; }
          15% { opacity: .9; }
          75% { opacity: .9; }
          100% { transform: translateY(52px); opacity: 0; }
        }
        @keyframes retinovaRingPulse {
          0%, 100% { transform: scale(.94); opacity: .25; }
          50% { transform: scale(1.04); opacity: .7; }
        }
        .retinova-eye-logo{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:none}
        .retinova-eye-glow{position:absolute;inset:14%;border-radius:999px;background:radial-gradient(circle,rgba(54,197,216,.42) 0%,rgba(54,197,216,.16) 42%,transparent 72%);filter:blur(7px);animation:retinovaGlowPulse 3.2s ease-in-out infinite}
        .retinova-eye-svg{position:relative;width:100%;height:100%;overflow:visible}
        .retinova-eye-sclera{fill:#fff;opacity:1;filter:drop-shadow(0 0 2px rgba(255,255,255,.35))}
        .retinova-eye-upper,.retinova-eye-lower{fill:#0F2742;opacity:.98}
        .retinova-eye-logo-dark .retinova-eye-upper,.retinova-eye-logo-dark .retinova-eye-lower{fill:#F7FCFD}
        .retinova-eye-iris-ring{fill:none;stroke:#36C5D8;stroke-width:3;opacity:.75;animation:retinovaRingPulse 2.6s ease-in-out infinite}
        .retinova-eye-iris{fill:#E96B3B;stroke:#F8B15C;stroke-width:2.5;transform-origin:50px 32px;animation:retinovaIrisPulse 2.8s ease-in-out infinite;filter:drop-shadow(0 0 4px rgba(233,107,59,.45))}
        .retinova-eye-pupil{fill:#071A2D}
        .retinova-eye-highlight{fill:#fff;opacity:.95}
        .retinova-eye-blink{transform-origin:50px 32px;animation:retinovaBlink 6s cubic-bezier(.65,0,.35,1) infinite}
        .retinova-eye-lid-line{fill:none;stroke:#36C5D8;stroke-width:2.2;stroke-linecap:round;opacity:.82}
        .retinova-eye-lid-bottom{opacity:.35}
        .retinova-eye-scan-ring{fill:none;stroke:#159A9C;stroke-width:1.5;stroke-dasharray:3 5;opacity:.55;transform-origin:50px 32px;animation:retinovaRingPulse 4s ease-in-out infinite}
        .retinova-guided-eye{position:relative;width:150px;height:150px;border-radius:999px;background:#071A2D;border:1px solid rgba(54,197,216,.35);display:flex;align-items:center;justify-content:center;overflow:hidden;box-shadow:0 0 45px rgba(54,197,216,.16)}
        .retinova-guided-eye-grid{position:absolute;inset:18px;border-radius:999px;border:1px dashed rgba(54,197,216,.25);animation:retinovaOrbit 14s linear infinite}
        .retinova-guided-scan{position:absolute;left:16px;right:16px;top:50%;height:2px;background:#36C5D8;box-shadow:0 0 14px rgba(54,197,216,.95);animation:retinovaScanSweep 2.8s ease-in-out infinite}
        .retinova-guided-dot{position:absolute;width:6px;height:6px;border-radius:999px;background:#F8B15C;box-shadow:0 0 10px rgba(248,177,92,.75);animation:retinovaIrisPulse 2s ease-in-out infinite}
        .retinova-guided-dot-1{top:28px;left:42px}.retinova-guided-dot-2{right:30px;top:72px;animation-delay:.45s}.retinova-guided-dot-3{bottom:28px;left:62px;animation-delay:.9s}
      `}</style>


      {/* ===================================================
          AMBIENT BACKGROUND
      =================================================== */}

      <div className="absolute top-0 left-0 w-[420px] h-[420px] bg-[#D9F3F4]/70 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-[#D9F3F4]/55 rounded-full blur-3xl pointer-events-none" />


      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="relative z-50 bg-white border-b border-[#D8E4EC] shadow-[0_1px_0_rgba(15,23,42,0.03)]">

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 h-[72px] flex items-center justify-between">


          {/* BRAND */}

          <RetinovaLogo />


          {/* WORKSTATION STATUS */}

          <div className="flex items-center gap-3.5">
            <div className="hidden md:block text-right">
              <p className="text-[11px] text-[#7A8D9B]">Signed in as</p>
              <p className="text-sm font-bold text-[#294152]">
                {session?.username || "phc001"}
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#E8F7F0] border border-[#CBEAD9]">
              <span className="w-2 h-2 rounded-full bg-[#20A464] animate-pulse" />
              <span className="text-xs font-bold text-[#20A464]">System ready</span>
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label="Open PHC worker menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="w-10 h-10 rounded-xl border border-[#D8E4EC] bg-white text-[#647887] flex items-center justify-center text-xl leading-none hover:border-[#36C5D8] hover:bg-[#D9F3F4] hover:text-[#1E5A7A] transition shadow-sm"
              >
                <span aria-hidden="true">⋮</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-64 rounded-2xl border border-[#D8E4EC] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] p-2 z-[100]">
                  <div className="px-3 py-2 border-b border-[#E4EDF2] mb-1">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A8D9B] font-bold">PHC workspace</p>
                    <p className="text-sm font-bold text-[#172B3A] mt-1">{session?.username || "phc001"}</p>
                  </div>
                  <button type="button" onClick={() => { setMenuOpen(false); setWorkspaceMode("dashboard"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">← Back to Dashboard</button>
                  <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("workspace"); setWorkspaceMode("new"); setSection(0); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">New Screening</button>
                  <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("patients"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">Patient Records</button>
                  <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("history"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">Previous Screenings</button>
                  <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("settings"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">Settings</button>
                  <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("help"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">Help & Guidance</button>
                  <div className="my-1 border-t border-[#E4EDF2]" />
                  <button type="button" onClick={() => { setMenuOpen(false); onLogout(); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#D9534F] hover:bg-[#FCEBEA] transition">Sign out</button>
                </div>
              )}
            </div>
          </div>

        </div>

      </header>

      {/* BACK TO PHC DASHBOARD */}
      <div className="relative z-20 bg-[#F4F8FB]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-4">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setWorkspaceMode("dashboard");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D8E4EC] bg-white text-sm font-bold text-[#294152] hover:bg-[#D9F3F4] hover:border-[#36C5D8] hover:text-[#0F2742] transition shadow-sm"
          >
            <span aria-hidden="true">←</span>
            Back to PHC Dashboard
          </button>
        </div>
      </div>

      {/* ===================================================
          GLOBAL SCREENING PROGRESS
      =================================================== */}

      <div className="relative z-10 bg-white border-b border-[#D8E4EC]">

        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-4">


          <div className="flex items-center justify-between mb-5">

            <div>

              <p className="text-[10px] uppercase tracking-[0.2em] text-[#159A9C] font-bold">
                Screening workflow
              </p>

              <p className="text-xs text-[#7A8D9B] mt-1">
                Patient registration
              </p>

            </div>


            <div className="text-right">

              <p className="text-xs text-[#7A8D9B]">
                Progress
              </p>

              <p className="text-sm font-bold text-[#172B3A]">
                01 <span className="text-[#9AAAB5]">/ 06</span>
              </p>

            </div>

          </div>


          <ProgressBar active={0} />

        </div>

      </div>


      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-7">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
            <section className="bg-white rounded-[22px] border border-[#D8E4EC] shadow-[0_10px_30px_rgba(15,39,66,0.06)] overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="mb-7">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#159A9C] font-bold">
                    Patient registration
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2742] mt-2">
                    Patient details
                  </h2>
                  <p className="text-sm text-[#647887] mt-2">
                    Enter the patient's details to begin the retinal screening workflow.
                  </p>
                </div>

      {/* =================================================
                    SECTION 1 — PATIENT IDENTITY
                ================================================= */}

                {section === 0 && (

                  <div
                    key="identity"
                    className="form-section-enter space-y-6"
                  >

                    <AnimatedField
                      number="01"
                      label="Full name"
                      required
                      value={patient.fullName}
                      placeholder="Enter patient's full name"
                      onChange={(value) =>
                        updatePatient("fullName", value)
                      }
                    />


                    <div className="grid sm:grid-cols-2 gap-5">

                      <AnimatedField
                        number="02"
                        label="Patient ID / UHID"
                        required
                        value={patient.patientId}
                        placeholder="e.g. RS-2026-00124"
                        onChange={(value) =>
                          updatePatient("patientId", value)
                        }
                      />


                      <AnimatedField
                        number="03"
                        label="Date of birth"
                        type="date"
                        value={patient.dob}
                        onChange={(value) =>
                          updatePatient("dob", value)
                        }
                      />

                    </div>


                    <div className="grid sm:grid-cols-2 gap-5">

                      <AnimatedField
                        number="04"
                        label="Age"
                        required
                        type="number"
                        value={patient.age}
                        placeholder="Automatically calculated from DOB"
                        readOnly
                        onChange={() => {}}
                      />


                      <AnimatedSelect
                        number="05"
                        label="Sex"
                        required
                        value={patient.sex}
                        onChange={(value) =>
                          updatePatient("sex", value)
                        }
                        options={[
                          ["", "Select sex"],
                          ["female", "Female"],
                          ["male", "Male"],
                          ["other", "Other"],
                        ]}
                      />

                    </div>


                    <AnimatedField
                      number="06"
                      label="Phone number"
                      type="tel"
                      value={patient.phone}
                      placeholder="10-digit mobile number"
                      onChange={(value) =>
                        updatePatient("phone", value)
                      }
                    />


                    <AnimatedField
                      number="07"
                      label="Address"
                      value={patient.address}
                      placeholder="House number / street / locality"
                      onChange={(value) =>
                        updatePatient("address", value)
                      }
                    />


                    <div className="grid sm:grid-cols-3 gap-5">

                      <AnimatedField
                        number="08"
                        label="Village / locality"
                        value={patient.village}
                        placeholder="Village"
                        onChange={(value) =>
                          updatePatient("village", value)
                        }
                      />


                      <AnimatedField
                        number="09"
                        label="District"
                        value={patient.district}
                        placeholder="District"
                        onChange={(value) =>
                          updatePatient("district", value)
                        }
                      />


                      <AnimatedField
                        number="10"
                        label="State"
                        value={patient.state}
                        placeholder="State"
                        onChange={(value) =>
                          updatePatient("state", value)
                        }
                      />

                    </div>

                  </div>
                )}


                {/* =================================================
                    SECTION 2 — DIABETES
                ================================================= */}

                {section === 1 && (

                  <div
                    key="diabetes"
                    className="form-section-enter space-y-6"
                  >

                    <AnimatedSelect
                      number="01"
                      label="Diabetes type"
                      required
                      value={patient.diabetesType}
                      onChange={(value) =>
                        updatePatient("diabetesType", value)
                      }
                      options={[
                        ["", "Select diabetes type"],
                        ["type1", "Type 1 diabetes"],
                        ["type2", "Type 2 diabetes"],
                        ["gestational", "Gestational diabetes"],
                        ["other", "Other / unspecified"],
                      ]}
                    />


                    <div className="grid sm:grid-cols-2 gap-5">

                      <AnimatedField
                        number="02"
                        label="Year diagnosed"
                        type="number"
                        value={patient.diabetesSince}
                        placeholder="e.g. 2018"
                        onChange={(value) =>
                          updatePatient("diabetesSince", value)
                        }
                      />


                      <AnimatedField
                        number="03"
                        label="Latest HbA1c"
                        value={patient.hba1c}
                        placeholder="e.g. 7.2 %"
                        onChange={(value) =>
                          updatePatient("hba1c", value)
                        }
                      />

                    </div>


                    <AnimatedField
                      number="04"
                      label="Current diabetes treatment"
                      value={patient.treatment}
                      placeholder="e.g. Metformin / Insulin / Other"
                      onChange={(value) =>
                        updatePatient("treatment", value)
                      }
                    />


                    <ChoiceField
                      number="05"
                      label="Previous diabetic retinopathy?"
                      value={patient.previousDR}
                      onChange={(value) =>
                        updatePatient("previousDR", value)
                      }
                      options={[
                        ["yes", "Yes"],
                        ["no", "No"],
                        ["unknown", "Unknown"],
                      ]}
                    />


                    <ChoiceField
                      number="06"
                      label="Previous eye treatment?"
                      value={patient.previousEyeTreatment}
                      onChange={(value) =>
                        updatePatient("previousEyeTreatment", value)
                      }
                      options={[
                        ["yes", "Yes"],
                        ["no", "No"],
                        ["unknown", "Unknown"],
                      ]}
                    />

                  </div>
                )}


                {/* =================================================
                    SECTION 3 — PHC
                ================================================= */}

                {section === 2 && (

                  <div
                    key="phc"
                    className="form-section-enter space-y-6"
                  >


                    {/* PHC INFO CARD */}

                    <div className="rounded-2xl bg-[#D9F3F4] border border-[#D8E4EC] p-5 mb-7">

                      <div className="flex gap-4">

                        <div className="w-10 h-10 rounded-xl bg-[#1E5A7A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          PHC
                        </div>


                        <div>

                          <h4 className="font-bold text-[#0F2742]">
                            Screening operator & clinic details
                          </h4>

                          <p className="text-sm text-[#0F2742]/70 mt-1 leading-relaxed">
                            Record who performed the screening and where it
                            was conducted. These details will appear in the
                            final clinical report.
                          </p>

                        </div>

                      </div>

                    </div>


                    <AnimatedField
                      number="01"
                      label="PHC worker full name"
                      required
                      value={patient.workerName}
                      placeholder="Enter health worker's full name"
                      onChange={(value) =>
                        updatePatient("workerName", value)
                      }
                    />


                    <div className="grid sm:grid-cols-2 gap-5">

                      <AnimatedField
                        number="02"
                        label="Worker ID"
                        required
                        value={patient.workerId}
                        placeholder="e.g. HW-024"
                        onChange={(value) =>
                          updatePatient("workerId", value)
                        }
                      />


                      <AnimatedSelect
                        number="03"
                        label="Designation"
                        value={patient.workerDesignation}
                        onChange={(value) =>
                          updatePatient("workerDesignation", value)
                        }
                        options={[
                          ["", "Select designation"],
                          ["asha", "ASHA Worker"],
                          ["anm", "ANM"],
                          ["phc_staff", "PHC Staff"],
                          ["technician", "Screening Technician"],
                          ["other", "Other"],
                        ]}
                      />

                    </div>


                    <div className="grid sm:grid-cols-2 gap-5">

                      <AnimatedField
                        number="04"
                        label="Clinic / PHC name"
                        required
                        value={patient.clinicName}
                        placeholder="Primary Health Centre"
                        onChange={(value) =>
                          updatePatient("clinicName", value)
                        }
                      />


                      <AnimatedField
                        number="05"
                        label="Clinic / PHC ID"
                        value={patient.clinicId}
                        placeholder="e.g. PHC-024"
                        onChange={(value) =>
                          updatePatient("clinicId", value)
                        }
                      />

                    </div>


                    <div className="grid sm:grid-cols-2 gap-5">

                      <AnimatedField
                        number="06"
                        label="Clinic phone"
                        type="tel"
                        value={patient.clinicPhone}
                        placeholder="Clinic contact number"
                        onChange={(value) =>
                          updatePatient("clinicPhone", value)
                        }
                      />


                      <AnimatedField
                        number="07"
                        label="Clinic location"
                        value={patient.clinicLocation}
                        placeholder="Village / district / location"
                        onChange={(value) =>
                          updatePatient("clinicLocation", value)
                        }
                      />

                    </div>


                    <AnimatedSelect
                      number="08"
                      label="Reason for screening"
                      value={patient.screeningReason}
                      onChange={(value) =>
                        updatePatient("screeningReason", value)
                      }
                      options={[
                        ["", "Select screening reason"],
                        ["routine", "Routine diabetic screening"],
                        ["followup", "Follow-up screening"],
                        ["symptoms", "Eye symptoms / concern"],
                        [
                          "referral",
                          "Referral from healthcare provider",
                        ],
                      ]}
                    />

                  </div>
                )}

              </div>


              {/* =================================================
                  FORM FOOTER
              ================================================= */}

              <div className="px-6 sm:px-8 py-4 border-t border-[#E4EDF2] bg-[#F4F8FB] flex items-center justify-between gap-4">


                <button
                  type="button"
                  onClick={() => {

                    if (section > 0) {
                      setSection((previous) => previous - 1);
                    } else {
                      setMenuOpen(false);
                      setWorkspaceMode("dashboard");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }

                  }}
                  className="px-5 py-3 rounded-xl border border-[#D8E4EC] bg-white text-[#647887] font-semibold hover:border-slate-300 hover:bg-[#F4F8FB] transition-all duration-300"
                >
                  ← Back
                </button>


                <div className="flex items-center gap-3.5">

                  <span className="hidden sm:block text-xs text-[#7A8D9B]">
                    {section === 2
                      ? "Ready for eye selection"
                      : "Next section"}
                  </span>


                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canContinue() || savingPatient}
                    className={`px-6 sm:px-7 py-3 rounded-xl font-bold transition-all duration-300 ${
                      canContinue() && !savingPatient
                        ? "bg-[#0F2742] text-white hover:bg-[#1E5A7A] hover:-translate-y-0.5 shadow-lg shadow-slate-900/10"
                        : "bg-slate-200 text-[#7A8D9B] cursor-not-allowed"
                    }`}
                  >
                    {savingPatient
                      ? "Saving patient..."
                      : section === 2
                        ? "Continue to Eye Selection →"
                        : "Continue →"}
                  </button>

                </div>

              </div>

            </section>

          </div>


          {/* =================================================
              RIGHT SIDE INFORMATION PANEL
          ================================================= */}

          <aside className="hidden lg:block lg:sticky lg:top-8">


            <div className="bg-[#0F2742] rounded-[22px] p-6 text-white shadow-[0_14px_40px_rgba(15,39,66,0.16)] overflow-hidden relative">


              {/* Decorative circles */}

              <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-[#36C5D8]/10 blur-2xl" />

              <div className="absolute -left-20 bottom-0 w-40 h-40 rounded-full bg-[#36C5D8]/10 blur-2xl" />


              <div className="relative">


                {/* EYE */}

                <div className="flex items-center gap-4">

                  <div className="eye-animation-card">
                      <div className="retinova-guided-eye">
                        <div className="retinova-guided-eye-grid" />
                        <AnimatedRetinaEye size={118} dark />
                        <div className="retinova-guided-scan" />
                        <span className="retinova-guided-dot retinova-guided-dot-1" />
                        <span className="retinova-guided-dot retinova-guided-dot-2" />
                        <span className="retinova-guided-dot retinova-guided-dot-3" />
                      </div>
                    </div>


                  <div>

                    <p className="text-[10px] text-[#36C5D8] uppercase tracking-[0.2em] font-bold">
                      Retinova
                    </p>

                    <p className="font-semibold mt-1">
                      Guided screening
                    </p>

                  </div>

                </div>


                {/* DESCRIPTION */}

                <p className="text-sm text-[#7A8D9B] leading-relaxed mt-8">

                  The registration process is divided into focused sections
                  so the screening operator can enter information naturally
                  without navigating a long clinical form.

                </p>


                {/* SECTIONS */}

                <div className="mt-8 space-y-2">

                  {sectionTitles.map((title, index) => (

                    <div
                      key={title}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
                        index === section
                          ? "bg-white/10"
                          : ""
                      }`}
                    >

                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                          index < section
                            ? "bg-[#159A9C] text-white"
                            : index === section
                              ? "bg-white text-[#172B3A]"
                              : "bg-white/10 text-[#647887]"
                        }`}
                      >
                        {index < section
                          ? "✓"
                          : index + 1}
                      </div>


                      <span
                        className={`text-sm transition-colors duration-300 ${
                          index === section
                            ? "text-white font-semibold"
                            : "text-[#647887]"
                        }`}
                      >
                        {title}
                      </span>

                    </div>

                  ))}

                </div>


                {/* WORKFLOW */}

                <div className="mt-8 pt-6 border-t border-white/10">

                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#647887] font-bold">
                    Clinical workflow
                  </p>

                  <p className="text-sm text-[#9AAAB5] mt-2">
                    Patient → Eye → Capture → Quality → AI → Result
                  </p>

                </div>


                {/* SECURITY */}

                <div className="mt-6 flex items-center gap-2 text-xs text-[#647887]">

                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

                  Screening data ready for secure processing

                </div>

              </div>

            </div>

          </aside>

        </div>

      </main>

    </div>
    </div>
  );
}


/* =========================================================
   ANIMATED FIELD
   ========================================================= */

function AnimatedField({
  number,
  label,
  value,
  placeholder,
  type = "text",
  required = false,
  readOnly = false,
  onChange,
}) {
  return (
    <div className="field-enter">

      <div className="flex items-center justify-between mb-2">

        <label className="text-sm font-semibold text-[#172B3A]">

          {label}

          {required && (
            <span className="text-[#159A9C] ml-1">
              *
            </span>
          )}

        </label>


        <span className="text-[10px] font-bold text-[#9AAAB5]">
          {number}
        </span>

      </div>


      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="professional-input"
      />

    </div>
  );
}


/* =========================================================
   ANIMATED SELECT
   ========================================================= */

function AnimatedSelect({
  number,
  label,
  value,
  options,
  required = false,
  onChange,
}) {
  return (
    <div className="field-enter">

      <div className="flex items-center justify-between mb-2">

        <label className="text-sm font-semibold text-[#172B3A]">

          {label}

          {required && (
            <span className="text-[#159A9C] ml-1">
              *
            </span>
          )}

        </label>


        <span className="text-[10px] font-bold text-[#9AAAB5]">
          {number}
        </span>

      </div>


      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="professional-input appearance-none"
      >

        {options.map(([optionValue, optionLabel]) => (

          <option
            key={optionValue}
            value={optionValue}
          >
            {optionLabel}
          </option>

        ))}

      </select>

    </div>
  );
}


/* =========================================================
   CHOICE FIELD
   ========================================================= */

function ChoiceField({
  number,
  label,
  value,
  options,
  onChange,
}) {
  return (
    <div className="field-enter">


      <div className="flex items-center justify-between mb-3">

        <label className="text-sm font-semibold text-[#172B3A]">
          {label}
        </label>


        <span className="text-[10px] font-bold text-[#9AAAB5]">
          {number}
        </span>

      </div>


      <div className="grid grid-cols-3 gap-3">

        {options.map(([optionValue, optionLabel]) => (

          <button
            type="button"
            key={optionValue}
            onClick={() => onChange(optionValue)}
            className={`py-3 rounded-xl border font-semibold transition-all duration-300 ${
              value === optionValue
                ? "border-teal-500 bg-[#D9F3F4] text-[#1E5A7A] shadow-sm -translate-y-0.5"
                : "border-[#D8E4EC] bg-white text-[#647887] hover:border-slate-300 hover:bg-[#F4F8FB]"
            }`}
          >

            {value === optionValue && (
              <span className="mr-1">
                ✓
              </span>
            )}

            {optionLabel}

          </button>

        ))}

      </div>

    </div>
  );
}


/* =========================================================
   PROGRESS BAR
   ========================================================= */

function PHCDashboard({ session, screenings, recentScreenings, onNewScreening, onPatients, onHistory, onSettings, onHelp, onLogout }) {
  const rows = Array.isArray(screenings) ? screenings : [];
  const completed = rows.filter((r) => String(r.status || '').toUpperCase() === 'COMPLETED').length;
  const pending = rows.filter((r) => ['PENDING','PROCESSING'].includes(String(r.status || '').toUpperCase())).length;
  const referred = rows.filter((r) => String(r.status || '').toUpperCase() === 'REFERRED').length;
  const reviewed = rows.filter((r) => String(r.status || '').toUpperCase() === 'REVIEWED').length;
  const gradeCounts = [0,0,0,0,0];
  const eyeCounts = { right:0, left:0, both:0 };
  rows.forEach((r) => {
    const g = Number(r.dr_level ?? r.grade ?? r.ai_result?.dr_level ?? r.aiResult?.dr_level);
    if (Number.isInteger(g) && g >= 0 && g <= 4) gradeCounts[g] += 1;
    const eye = String(r.eye || r.selected_eye || '').toUpperCase();
    if (eye === 'RIGHT' || eye === 'OD') eyeCounts.right += 1;
    else if (eye === 'LEFT' || eye === 'OS') eyeCounts.left += 1;
    else if (eye === 'BOTH' || eye === 'OU') eyeCounts.both += 1;
  });
  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-(6-i));
    const key = d.toISOString().slice(0,10);
    return { label:d.toLocaleDateString('en-IN',{month:'short',day:'numeric'}), value:rows.filter(r=>{const x=new Date(r.created_at);return !Number.isNaN(x.getTime())&&x.toISOString().slice(0,10)===key}).length };
  });
  const max7 = Math.max(...last7.map(x=>x.value),1);
  const maxGrade = Math.max(...gradeCounts,1);
  const fmtDate = (v) => v ? new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
  const statusStyle = (status) => {
    const s=String(status||'').toUpperCase();
    if(s==='REFERRED') return 'bg-[#FCEBEA] text-[#D9534F] border-[#F2C8C5]';
    if(s==='REVIEWED' || s==='COMPLETED') return 'bg-[#E8F7F0] text-[#168553] border-[#CBEAD9]';
    return 'bg-[#FFF5E4] text-[#B87916] border-[#F3D6A1]';
  };
  return <div className="min-h-screen bg-[#F4F8FB] text-[#172B3A]">
    <style>{`@keyframes phcRetinaPulse{0%,100%{transform:scale(.96);opacity:.82}50%{transform:scale(1.04);opacity:1}} @keyframes phcScan{0%{transform:translateY(-38px);opacity:.05}50%{transform:translateY(38px);opacity:.95}100%{transform:translateY(-38px);opacity:.05}}`}</style>
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex w-[230px] shrink-0 bg-[#0F2742] text-white flex-col sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-white/10"><RetinovaLogo dark /></div>
        <div className="px-4 py-5 flex-1">
          <div className="px-3 pb-3 text-[10px] uppercase tracking-[.2em] text-[#8FA7B8] font-bold">PHC workspace</div>
          <button onClick={()=>{}} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1E5A7A] text-white text-sm font-semibold mb-1"><span>⌂</span>Dashboard</button>
          <button onClick={onNewScreening} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/[0.08] text-sm font-semibold"><span>＋</span>New Screening</button>
          <button onClick={onHistory} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/[0.08] text-sm font-semibold"><span>▤</span>Previous Screenings</button>
          <button onClick={onPatients} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/[0.08] text-sm font-semibold"><span>♙</span>Patient Records</button>
          <button onClick={onSettings} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/[0.08] text-sm font-semibold"><span>⚙</span>Settings</button>
          <button onClick={onHelp} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[#DCEAF1] hover:bg-white/[0.08] text-sm font-semibold"><span>?</span>Help & Support</button>
        </div>
        <div className="px-4 pb-5">
          <div className="rounded-2xl border border-[#36C5D8]/25 bg-[#071A2D] p-4 mb-3 overflow-hidden relative">
            <div className="absolute -right-6 -bottom-8 w-24 h-24 rounded-full border border-[#36C5D8]/20" />
            <div className="relative mx-auto w-14 h-14 rounded-full border border-[#36C5D8]/30 flex items-center justify-center overflow-hidden bg-[#061624]">
              <div className="w-8 h-8 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd18a_0,#e96b3b_45%,#b83b2f_70%,#0F2742_72%)]" style={{animation:'phcRetinaPulse 3s ease-in-out infinite'}} />
              <div className="absolute left-2 right-2 top-1/2 h-px bg-[#36C5D8]" style={{animation:'phcScan 2.2s ease-in-out infinite'}} />
            </div>
            <p className="text-center text-xs font-semibold mt-3 text-[#DCEAF1]">Retinal screening active</p>
          </div>
          <button onClick={onLogout} className="w-full rounded-xl border border-[#36C5D8]/30 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]">↪ Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="h-[76px] bg-white border-b border-[#D8E4EC] flex items-center justify-between px-5 sm:px-8 xl:px-10 sticky top-0 z-40">
          <div className="lg:hidden"><RetinovaLogo compact /></div>
          <div className="hidden lg:block"><div className="text-[10px] uppercase tracking-[.18em] text-[#159A9C] font-bold">PHC screening centre</div><div className="text-sm text-[#647887] mt-1">Kandhanur PHC · Clinical workstation</div></div>
          <div className="flex items-center gap-3"><div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-[#E8F7F0] border border-[#CBEAD9]"><span className="w-2 h-2 rounded-full bg-[#20A464] animate-pulse"/><span className="text-xs font-bold text-[#168553]">System ready</span></div><div className="w-9 h-9 rounded-full bg-[#D9F3F4] text-[#0F2742] flex items-center justify-center text-xs font-bold">{String(session?.username||'PHC').slice(0,2).toUpperCase()}</div><div className="text-right hidden sm:block"><p className="text-[10px] text-[#7A8D9B]">Signed in as</p><p className="text-xs font-bold">{session?.username||'phc001'}</p></div></div>
        </header>
        <div className="p-5 sm:p-7 xl:p-9 max-w-[1500px] mx-auto">
          <section className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-6"><div><p className="text-[10px] uppercase tracking-[.22em] text-[#159A9C] font-bold">Dashboard</p><h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F2742] mt-2">Welcome, PHC Worker</h1><p className="text-sm text-[#647887] mt-2">Capture, screen and manage patient records with Retinova.</p></div><button onClick={onNewScreening} className="self-start xl:self-auto px-5 py-3 rounded-xl bg-[#159A9C] text-white text-sm font-bold shadow-[0_8px_20px_rgba(21,154,156,.18)] hover:bg-[#1E5A7A] transition">＋ Start New Screening <span className="ml-2">→</span></button></section>
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
            <DashStat label="Total Screenings" value={rows.length} note="All recorded cases" tone="blue" />
            <DashStat label="Completed" value={completed} note="Workflow completed" tone="green" />
            <DashStat label="Pending Review" value={pending} note="Awaiting action" tone="amber" />
            <DashStat label="Referred" value={referred} note="Referral recorded" tone="red" />
          </section>
          <section className="grid xl:grid-cols-[1.2fr_1fr_1fr] gap-4 mb-5">
            <DashPanel title="Screenings — Last 7 Days" subtitle="Number of cases received"><div className="h-44 flex items-end gap-2 pt-4 border-b border-[#E4EDF2]">{last7.map((d,i)=><div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5"><span className="text-[9px] font-bold text-[#647887]">{d.value}</span><div className="w-full max-w-9 bg-[#D9F3F4] rounded-t-md overflow-hidden" style={{height:`${Math.max(8,(d.value/max7)*100)}%`}}><div className="h-full bg-[#159A9C]"/></div><span className="text-[9px] text-[#7A8D9B]">{d.label}</span></div>)}</div></DashPanel>
            <DashPanel title="DR Grade Distribution" subtitle="AI grades available in records"><div className="h-44 flex items-end gap-2 pt-4">{gradeCounts.map((v,g)=><div key={g} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5"><span className="text-[9px] font-bold text-[#647887]">{v}</span><div className="w-full bg-[#EEF5F7] rounded-t-md overflow-hidden" style={{height:`${Math.max(8,(v/maxGrade)*100)}%`}}><div className="h-full bg-[#1E5A7A]"/></div><span className="text-[10px] font-bold text-[#172B3A]">G{g}</span></div>)}</div></DashPanel>
            <DashPanel title="Eye Distribution" subtitle="Selected screening eye"><div className="mt-3 space-y-4"><DashBar label="Right Eye" value={eyeCounts.right} total={Math.max(rows.length,1)} /><DashBar label="Left Eye" value={eyeCounts.left} total={Math.max(rows.length,1)} /><DashBar label="Both Eyes" value={eyeCounts.both} total={Math.max(rows.length,1)} /><div className="pt-2 border-t border-[#E4EDF2] flex justify-between text-xs"><span className="text-[#647887]">Reviewed</span><b className="text-[#0F2742]">{reviewed}</b></div></div></DashPanel>
          </section>
          <section className="grid xl:grid-cols-[1fr_290px] gap-4">
            <div className="bg-white border border-[#D8E4EC] rounded-2xl shadow-[0_5px_20px_rgba(15,39,66,.04)] overflow-hidden"><div className="px-5 py-4 border-b border-[#E4EDF2] flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[.18em] text-[#159A9C] font-bold">Recent activity</p><h2 className="text-lg font-bold text-[#172B3A] mt-1">Recent Screenings</h2></div><button onClick={onHistory} className="text-xs font-bold text-[#1E5A7A]">View all →</button></div><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-[#F4F8FB] border-b border-[#E4EDF2]"><th className="px-4 py-3 text-left text-[9px] uppercase tracking-wider text-[#7A8D9B]">ID</th><th className="px-4 py-3 text-left text-[9px] uppercase tracking-wider text-[#7A8D9B]">Patient</th><th className="px-4 py-3 text-left text-[9px] uppercase tracking-wider text-[#7A8D9B]">Eye</th><th className="px-4 py-3 text-left text-[9px] uppercase tracking-wider text-[#7A8D9B]">Status</th><th className="px-4 py-3 text-left text-[9px] uppercase tracking-wider text-[#7A8D9B]">Date</th><th className="px-4 py-3 text-right text-[9px] uppercase tracking-wider text-[#7A8D9B]">Action</th></tr></thead><tbody>{recentScreenings.length?recentScreenings.map((r,i)=><tr key={r.id||i} className="border-b border-[#EEF4F7] last:border-0"><td className="px-4 py-3 text-xs font-bold text-[#0F2742]">{r.case_id||r.id||'—'}</td><td className="px-4 py-3 text-xs font-semibold text-[#172B3A]">{r.full_name||r.patient_name||'—'}</td><td className="px-4 py-3 text-xs text-[#647887]">{String(r.eye||'—').replace('RIGHT','R').replace('LEFT','L')}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full border text-[9px] font-bold ${statusStyle(r.status)}`}>{r.status||'PENDING'}</span></td><td className="px-4 py-3 text-[10px] text-[#7A8D9B]">{fmtDate(r.created_at)}</td><td className="px-4 py-3 text-right"><button onClick={onHistory} className="px-2.5 py-1.5 rounded-lg border border-[#D8E4EC] text-[10px] font-bold text-[#1E5A7A]">View</button></td></tr>):<tr><td colSpan="6" className="px-4 py-10 text-center text-xs text-[#7A8D9B]">No previous screenings available.</td></tr>}</tbody></table></div></div>
            <div className="space-y-4"><DashPanel title="Quick Actions" subtitle="Common PHC tasks"><button onClick={onNewScreening} className="w-full text-left px-4 py-3 rounded-xl bg-[#159A9C] text-white text-xs font-bold">＋ Start New Screening <span className="float-right">→</span></button><button onClick={onHistory} className="w-full text-left px-4 py-3 rounded-xl bg-[#F4F8FB] border border-[#D8E4EC] text-xs font-semibold text-[#294152] mt-2">▤ View Previous Screenings</button><button onClick={onPatients} className="w-full text-left px-4 py-3 rounded-xl bg-[#F4F8FB] border border-[#D8E4EC] text-xs font-semibold text-[#294152] mt-2">♙ Search Patient Records</button></DashPanel><DashPanel title="System Status" subtitle="Current workstation"><DashStatus label="AI Model" value="Online" /><DashStatus label="Server" value="Connected" /><DashStatus label="Database" value="Connected" /><div className="mt-3 pt-3 border-t border-[#E4EDF2] text-[10px] text-[#7A8D9B]">Data shown from the configured Retinova API.</div></DashPanel></div>
          </section>
          <footer className="mt-6 pt-4 border-t border-[#D8E4EC] flex justify-between text-[10px] text-[#7A8D9B]"><span>Retinova · AI-Powered Diabetic Retinopathy Screening</span><span>Early detection today, brighter tomorrows.</span></footer>
        </div>
      </main>
    </div>
  </div>;
}

function DashStat({label,value,note,tone='blue'}) { const map={blue:'bg-[#E7F4FA] text-[#1E5A7A]',green:'bg-[#E8F7F0] text-[#168553]',amber:'bg-[#FFF5E4] text-[#B87916]',red:'bg-[#FCEBEA] text-[#D9534F]'}; return <div className="bg-white border border-[#D8E4EC] rounded-2xl p-4 shadow-[0_4px_16px_rgba(15,39,66,.035)]"><div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${map[tone]}`}>+</div><div className="text-[11px] text-[#647887] mt-3">{label}</div><div className="text-2xl font-bold text-[#0F2742] mt-1">{value}</div><div className="text-[9px] text-[#7A8D9B] mt-1">{note}</div></div>; }
function DashPanel({title,subtitle,children}) { return <div className="bg-white border border-[#D8E4EC] rounded-2xl shadow-[0_5px_20px_rgba(15,39,66,.04)] p-4"><h3 className="text-sm font-bold text-[#172B3A]">{title}</h3><p className="text-[10px] text-[#7A8D9B] mt-1">{subtitle}</p>{children}</div>; }
function DashBar({label,value,total}) { const pct=total?Math.round(value/total*100):0; return <div><div className="flex justify-between text-[10px] mb-1"><span className="text-[#647887] font-semibold">{label}</span><b>{value} <span className="text-[#9AAAB5]">({pct}%)</span></b></div><div className="h-2 bg-[#EAF2F5] rounded-full overflow-hidden"><div className="h-full bg-[#159A9C] rounded-full" style={{width:`${Math.min(100,pct)}%`}}/></div></div>; }
function DashStatus({label,value}) { return <div className="flex items-center justify-between py-1.5 text-[11px]"><span className="text-[#647887]">{label}</span><span className="flex items-center gap-1.5 font-semibold text-[#168553]"><span className="w-2 h-2 rounded-full bg-[#20A464]"/>{value}</span></div>; }

function PHCMenuPage({ page, session, onBack, onLogout }) {
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(page === "patients" || page === "history");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (page !== "patients" && page !== "history") return;
      try {
        setLoading(true);
        setError("");
        const data =
          page === "patients"
            ? await getPatients()
            : await getScreenings();

        if (!cancelled) {
          if (page === "patients") {
            setRecords(data?.patients || []);
          } else {
            setHistory(data?.screenings || []);
          }
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message || "Unable to load records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page]);

  const title = { patients: "Patient Records", history: "Previous Screenings", settings: "PHC Settings", help: "Help & Guidance" }[page];

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#172B3A]">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[#D8E4EC]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 h-[72px] flex items-center justify-between">
          <RetinovaLogo compact={false} />
          <div className="flex items-center gap-3.5"><div className="hidden sm:block text-right"><p className="text-[11px] text-[#7A8D9B]">Signed in as</p><p className="text-sm font-bold text-[#294152]">{session?.username || "phc001"}</p></div><button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-[#D8E4EC] bg-white text-sm font-bold text-[#294152] hover:bg-[#F4F8FB] hover:border-[#36C5D8] transition">Back to workspace</button></div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-10">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#159A9C] font-bold">PHC workspace</p>
        <h2 className="text-4xl font-bold tracking-tight mt-2 text-[#172B3A]">{title}</h2>
        <p className="text-[#647887] mt-4">{page === "patients" ? "Patient records stored in the Retinova backend." : page === "history" ? "Previous screening records and their workflow status." : page === "settings" ? "Current PHC worker and workstation information." : "Practical guidance for consistent retinal screening."}</p>

        {page === "patients" && <MenuTable loading={loading} error={error} empty="No patient records found." headers={["Patient ID","Name","Age","Sex","Phone","Location"]} rows={records.map((item) => [item.patient_code || item.patientId || item.id || "—", item.full_name || item.fullName || "—", item.age ?? "—", item.sex || "—", item.phone || "—", item.village || item.district || item.state || "—"])} />}
        {page === "history" && <MenuTable loading={loading} error={error} empty="No screening history found." headers={["Case","Patient","Eye","Status","Date"]} rows={history.map((item) => [item.case_id || item.id || "—", item.full_name || item.patient_name || item.patient_code || "—", item.eye || "—", item.status || "—", item.created_at ? new Date(item.created_at).toLocaleString("en-IN", {day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"])} />}
        {page === "settings" && <div className="grid md:grid-cols-2 gap-5 mt-8"><InfoPanel title="Worker profile"><p><b>Username:</b> {session?.username || "phc001"}</p><p><b>Role:</b> PHC Worker</p><p><b>Authentication:</b> Prototype browser session</p></InfoPanel><InfoPanel title="Screening workstation"><p><b>Workstation:</b> PHC-024</p><p><b>Status:</b> System ready</p><p><b>Backend:</b> Connected through configured API</p></InfoPanel></div>}
        {page === "help" && <div className="grid md:grid-cols-2 gap-5 mt-8"><InfoPanel title="Fundus image guidance"><p>Keep the optic disc and macula visible and capture an adequate retinal field.</p><p>Avoid glare, severe blur and poor illumination.</p><p>If the system marks an image ungradable, recapture it.</p></InfoPanel><InfoPanel title="Screening workflow"><p>Patient details → eye selection → image capture → quality → AI analysis → result.</p><p>AI output is a screening aid and does not replace ophthalmologist review.</p></InfoPanel></div>}
        <button type="button" onClick={onLogout} className="mt-8 text-sm font-bold text-[#D9534F] hover:text-rose-700">Sign out</button>
      </main>
    </div>
  );
}

function MenuTable({ loading, error, empty, headers, rows }) {
  return <section className="mt-8 bg-white rounded-[24px] border border-[#D8E4EC] shadow-sm overflow-hidden">{loading ? <div className="p-8 text-sm text-[#647887]">Loading…</div> : error ? <div className="p-8 text-sm text-[#D9534F]">{error}</div> : rows.length === 0 ? <div className="p-8 text-sm text-[#647887]">{empty}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr className="bg-[#F4F8FB] border-b border-[#E4EDF2]">{headers.map((header) => <th key={header} className="text-left px-5 py-4 text-xs font-bold text-[#647887]">{header}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={index} className="border-b border-[#E4EDF2] last:border-0 hover:bg-[#D9F3F4]/30">{row.map((cell,i) => <td key={i} className={`px-5 py-4 text-sm ${i === 0 || i === 1 ? "font-semibold text-[#172B3A]" : "text-[#647887]"}`}>{cell}</td>)}</tr>)}</tbody></table></div>}</section>;
}

function InfoPanel({ title, children }) {
  return <div className="bg-white rounded-[24px] border border-[#D8E4EC] shadow-sm p-6"><h3 className="font-bold text-lg text-[#172B3A]">{title}</h3><div className="mt-4 space-y-3 text-sm text-[#647887] leading-relaxed">{children}</div></div>;
}

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

              {/* STEP */}

              <div className="flex items-center gap-2 shrink-0">

                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${
                    isCompleted
                      ? "bg-[#159A9C] text-white"
                      : isActive
                        ? "bg-[#1E5A7A] text-white shadow-lg shadow-teal-600/20"
                        : "bg-[#EEF4F7] text-[#7A8D9B]"
                  }`}
                >

                  {isCompleted
                    ? "✓"
                    : index + 1}

                </div>


                <span
                  className={`hidden md:block text-xs font-semibold transition-colors duration-500 ${
                    isActive
                      ? "text-[#1E5A7A]"
                      : isCompleted
                        ? "text-[#647887]"
                        : "text-[#7A8D9B]"
                  }`}
                >
                  {step}
                </span>

              </div>


              {/* CONNECTOR */}

              {index < steps.length - 1 && (

                <div className="flex-1 h-px bg-slate-200 mx-2 md:mx-4 relative overflow-hidden">

                  {isCompleted && (

                    <div className="absolute inset-y-0 left-0 w-full bg-[#36C5D8] transition-all duration-700" />

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
   PLACEHOLDER
   ========================================================= */

function Placeholder({
  step,
  title,
  description,
  onBack,
}) {
  return (
    <div className="min-h-screen bg-[#F4F8FB]">

      <header className="h-20 bg-white border-b border-[#D8E4EC] px-6 md:px-10 flex items-center justify-between">

        <div>

          <h1 className="font-bold text-[#172B3A]">
            Retinova
          </h1>

          <p className="text-xs text-[#647887]">
            Clinical Workspace
          </p>

        </div>


        <span className="text-sm text-[#647887]">
          {step}
        </span>

      </header>


      <main className="min-h-[70vh] flex items-center justify-center px-6">

        <div className="text-center max-w-xl step-enter">

          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#D9F3F4] border border-[#D8E4EC] flex items-center justify-center text-[#1E5A7A] text-3xl mb-7">
            ◉
          </div>


          <p className="text-xs uppercase tracking-[0.2em] text-[#159A9C] font-bold">
            Clinical review workspace
          </p>


          <h2 className="text-4xl font-bold text-[#172B3A] mt-3">
            {title}
          </h2>


          <p className="text-[#647887] mt-4 leading-relaxed">
            {description}
          </p>


          <button
            type="button"
            onClick={onBack}
            className="mt-8 px-6 py-3 bg-[#0F2742] text-white rounded-xl font-semibold hover:bg-[#1E5A7A] transition-all duration-300"
          >
            ← Back
          </button>

        </div>

      </main>

    </div>
  );
}


export default App;