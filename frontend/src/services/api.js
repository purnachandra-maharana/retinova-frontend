const API_BASE_URL =
  (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

/* =========================================================
   GENERIC REQUEST HELPER
   ========================================================= */

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : {
            "Content-Type": "application/json",
          }),
      ...(options.headers || {}),
    },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

export async function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getCurrentUser() {
  return request("/auth/me");
}

export async function logout() {
  return request("/auth/logout", { method: "POST" });
}


/* =========================================================
   HEALTH
   ========================================================= */

export async function checkBackendHealth() {
  return request("/health");
}


/* =========================================================
   PATIENTS
   ========================================================= */

export async function createPatient(patient) {
  return request("/patients", {
    method: "POST",

    body: JSON.stringify({
      patientCode: patient.patientId,
      fullName: patient.fullName,
      dob: patient.dob || null,
      age: patient.age || null,
      sex: patient.sex || null,
      phone: patient.phone || null,
      address: patient.address || null,
      village: patient.village || null,
      district: patient.district || null,
      state: patient.state || null,

      diabetesType: patient.diabetesType || null,
      diabetesSince: patient.diabetesSince || null,
      treatment: patient.treatment || null,
      hba1c: patient.hba1c || null,
      previousDR: patient.previousDR || null,
      previousEyeTreatment:
        patient.previousEyeTreatment || null,
    }),
  });
}


export async function getPatient(patientId) {
  return request(`/patients/${patientId}`);
}


export async function getPatients() {
  return request("/patients");
}


/* =========================================================
   SCREENINGS
   ========================================================= */

export async function createScreening({
  patientId,
  caseId,
  patient,
  selectedEye,
}) {
  return request("/screenings", {
    method: "POST",

    body: JSON.stringify({
      patientId,
      caseId,

      clinicName: patient.clinicName || null,
      clinicId: patient.clinicId || null,
      clinicLocation: patient.clinicLocation || null,
      clinicPhone: patient.clinicPhone || null,

      workerName: patient.workerName || null,
      workerId: patient.workerId || null,
      workerDesignation:
        patient.workerDesignation || null,

      eye:
        selectedEye === "left"
          ? "LEFT"
          : selectedEye === "right"
          ? "RIGHT"
          : selectedEye,

      screeningReason:
        patient.screeningReason || null,
    }),
  });
}


export async function getScreenings() {
  return request("/screenings");
}


export async function getScreening(screeningId) {
  return request(`/screenings/${screeningId}`);
}


/* =========================================================
   FUNDUS IMAGE UPLOAD
   ========================================================= */

export async function uploadScreeningImage(
  screeningId,
  imageFile
) {
  const formData = new FormData();

  formData.append("image", imageFile);

  return request(`/screenings/${screeningId}/image`, {
    method: "POST",
    body: formData,
  });
}


/* =========================================================
   AI ANALYSIS
   ========================================================= */

export async function initializeAIAnalysis(
  screeningId
) {
  return request(`/ai/${screeningId}`, {
    method: "POST",
  });
}


export async function getAIResult(screeningId) {
  return request(`/ai/${screeningId}`);
}


export async function updateAIResult(
  screeningId,
  aiResult
) {
  return request(`/ai/${screeningId}`, {
    method: "PUT",

    body: JSON.stringify({
      qualityStatus:
        aiResult.qualityStatus ?? null,

      qualityScore:
        aiResult.qualityScore ?? null,

      drLevel:
        aiResult.drLevel ?? null,

      classification:
        aiResult.classification ?? null,

      confidence:
        aiResult.confidence ?? null,

      gradcamPath:
        aiResult.gradcamPath ?? null,

      processingStatus:
        aiResult.processingStatus ?? null,
    }),
  });
}


/* =========================================================
   CLINICAL FINDINGS
   ========================================================= */

export async function addClinicalFinding(
  screeningId,
  findingType,
  findingValue
) {
  return request(`/findings/${screeningId}`, {
    method: "POST",

    body: JSON.stringify({
      findingType,
      findingValue,
    }),
  });
}


export async function getClinicalFindings(
  screeningId
) {
  return request(`/findings/${screeningId}`);
}


/* =========================================================
   DOCTOR WORKFLOW
   ========================================================= */

export async function sendScreeningToDoctor(
  screeningId
) {
  return request(`/doctors/send/${screeningId}`, {
    method: "POST",
  });
}


export async function saveDoctorReview(
  screeningId,
  review
) {
  return request(`/doctors/reviews/${screeningId}`, {
    method: "POST",

    body: JSON.stringify({
      reviewerName:
        review.reviewerName || null,

      decision: review.decision,

      notes:
        review.notes || null,

      referralStatus:
        review.referralStatus || null,
    }),
  });
}


export async function getDoctorReviews(
  screeningId
) {
  return request(`/doctors/reviews/${screeningId}`);
}


export async function getPendingDoctorCases() {
  return request("/doctors/pending");
}


/* =========================================================
   COMPLETE CASE
   ========================================================= */

export async function getCase(screeningId) {
  return request(`/cases/${screeningId}`);
}


export async function getCases() {
  return request("/cases");
}


/* =========================================================
   CLINICAL REPORT
   ========================================================= */

export async function getClinicalReport(
  screeningId
) {
  return request(`/reports/${screeningId}`);
}


/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

export default {
  login,
  getCurrentUser,
  logout,
  checkBackendHealth,

  createPatient,
  getPatient,
  getPatients,

  createScreening,
  getScreenings,
  getScreening,

  uploadScreeningImage,

  initializeAIAnalysis,
  getAIResult,
  updateAIResult,

  addClinicalFinding,
  getClinicalFindings,

  sendScreeningToDoctor,

  saveDoctorReview,
  getDoctorReviews,
  getPendingDoctorCases,

  getCase,
  getCases,

  getClinicalReport,
};