const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const router = express.Router();

const BACKEND_ROOT = path.join(__dirname, "..");
const UPLOADS_DIR = path.resolve(
  BACKEND_ROOT,
  "uploads"
);

/* =========================================================
   HELPERS
   ========================================================= */

function resolveUploadFile(storedPath) {
  if (!storedPath) return null;

  const normalized = String(storedPath)
    .trim()
    .replace(/\\/g, "/");

  if (!normalized) return null;

  /*
   * Stored paths may be:
   *
   * C:/.../backend/uploads/file.png
   * /uploads/file.png
   * uploads/file.png
   * gradcam/file.png
   * file.png
   */

  const lower = normalized.toLowerCase();
  const marker = "/uploads/";
  const markerIndex = lower.lastIndexOf(marker);

  let relativePath;

  if (markerIndex !== -1) {
    relativePath = normalized.substring(
      markerIndex + marker.length
    );
  } else {
    relativePath = normalized
      .replace(/^\/+/, "")
      .replace(/^uploads\//i, "");
  }

  if (!relativePath) return null;

  const absolutePath = path.resolve(
    UPLOADS_DIR,
    relativePath
  );

  /*
   * Security: never allow a stored DB value to escape
   * the backend/uploads directory.
   */
  const rootWithSeparator =
    `${UPLOADS_DIR}${path.sep}`;

  if (
    absolutePath !== UPLOADS_DIR &&
    !absolutePath.startsWith(rootWithSeparator)
  ) {
    return null;
  }

  return absolutePath;
}

function sendStoredFile(res, storedPath, label) {
  const absolutePath =
    resolveUploadFile(storedPath);

  if (!absolutePath) {
    return res.status(404).json({
      success: false,
      message: `${label} path is not available.`,
    });
  }

  if (!fs.existsSync(absolutePath)) {
    console.error(
      `${label} file does not exist:`,
      absolutePath
    );

    return res.status(404).json({
      success: false,
      message: `${label} file does not exist on the server.`,
      path: absolutePath,
    });
  }

  return res.sendFile(absolutePath);
}

/* =========================================================
   GET ALL CASES
   GET /api/cases
   ========================================================= */

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.case_id,
        s.eye,
        s.status,
        s.clinic_name,
        s.clinic_id,
        s.clinic_location,
        s.clinic_phone,
        s.worker_name,
        s.worker_id,
        s.worker_designation,
        s.screening_reason,
        s.created_at,

        p.id AS patient_id,
        p.patient_code,
        p.full_name,
        p.dob,
        p.age,
        p.sex,
        p.phone,
        p.address,
        p.village,
        p.district,
        p.state,
        p.diabetes_type,
        p.diabetes_since,
        p.treatment,
        p.hba1c,
        p.previous_dr,
        p.previous_eye_treatment,

        ar.quality_status,
        ar.quality_score,
        ar.dr_level,
        ar.classification,
        ar.confidence,
        ar.probabilities,
        ar.class_labels,
        ar.gradcam_path,
        ar.processing_status

      FROM screenings s

      JOIN patients p
        ON s.patient_id = p.id

      LEFT JOIN ai_results ar
        ON s.id = ar.screening_id

      ORDER BY s.created_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      cases: result.rows,
    });
  } catch (error) {
    console.error(
      "Get cases error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to retrieve cases",
      error: error.message,
    });
  }
});

/* =========================================================
   GET ORIGINAL FUNDUS IMAGE
   GET /api/cases/:id/image

   IMPORTANT:
   These evidence routes are deliberately defined BEFORE
   GET /:id so Express resolves them correctly.
   ========================================================= */

router.get("/:id/image", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT original_path
      FROM screening_images
      WHERE screening_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No fundus image is recorded for this screening.",
      });
    }

    return sendStoredFile(
      res,
      result.rows[0].original_path,
      "Fundus image"
    );
  } catch (error) {
    console.error(
      "Serve fundus image error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve fundus image.",
      error: error.message,
    });
  }
});

/* =========================================================
   GET GRAD-CAM IMAGE
   GET /api/cases/:id/gradcam
   ========================================================= */

router.get("/:id/gradcam", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT gradcam_path
      FROM ai_results
      WHERE screening_id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "AI result is not available for this screening.",
      });
    }

    return sendStoredFile(
      res,
      result.rows[0].gradcam_path,
      "Grad-CAM image"
    );
  } catch (error) {
    console.error(
      "Serve Grad-CAM error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to retrieve Grad-CAM image.",
      error: error.message,
    });
  }
});

/* =========================================================
   GET COMPLETE CASE
   GET /api/cases/:id
   ========================================================= */

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(String(id))) {
      return res.status(400).json({
        success: false,
        message:
          "Screening ID must be a numeric database ID.",
      });
    }

    const screeningResult = await pool.query(
      `
      SELECT
        s.*,

        p.id AS patient_db_id,
        p.patient_code,
        p.full_name,
        p.dob,
        p.age,
        p.sex,
        p.phone,
        p.address,
        p.village,
        p.district,
        p.state,
        p.diabetes_type,
        p.diabetes_since,
        p.treatment,
        p.hba1c,
        p.previous_dr,
        p.previous_eye_treatment

      FROM screenings s

      JOIN patients p
        ON s.patient_id = p.id

      WHERE s.id = $1
      `,
      [id]
    );

    if (screeningResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Screening not found",
      });
    }

    const imageResult = await pool.query(
      `
      SELECT
        id,
        screening_id,
        original_path,
        created_at
      FROM screening_images
      WHERE screening_id = $1
      ORDER BY created_at DESC
      `,
      [id]
    );

    const aiResult = await pool.query(
      `
      SELECT
        id,
        screening_id,
        quality_status,
        quality_score,
        dr_level,
        classification,
        confidence,
        probabilities,
        class_labels,
        quality_metrics,
        gradcam_path,
        processing_status,
        created_at,
        updated_at
      FROM ai_results
      WHERE screening_id = $1
      LIMIT 1
      `,
      [id]
    );

    const findingsResult = await pool.query(
      `
      SELECT *
      FROM clinical_findings
      WHERE screening_id = $1
      ORDER BY created_at ASC
      `,
      [id]
    );

    const reviewResult = await pool.query(
      `
      SELECT *
      FROM doctor_reviews
      WHERE screening_id = $1
      ORDER BY reviewed_at DESC
      `,
      [id]
    );

    const screening =
      screeningResult.rows[0];

    const ai =
      aiResult.rows.length > 0
        ? aiResult.rows[0]
        : null;

    /*
     * Return both the original DB representation and
     * browser-ready evidence URLs.
     */
    const images =
      imageResult.rows.map((image) => ({
        ...image,
        url:
          `/api/cases/${encodeURIComponent(
            String(id)
          )}/image`,
      }));

    const aiWithEvidence = ai
      ? {
          ...ai,
          gradcam_url:
            ai.gradcam_path
              ? `/api/cases/${encodeURIComponent(
                  String(id)
                )}/gradcam`
              : null,
        }
      : null;

    res.json({
      success: true,

      case: {
        ...screening,
        screeningId: screening.id,
        caseId: screening.case_id,

        patient: {
          id: screening.patient_db_id,
          patientCode: screening.patient_code,
          fullName: screening.full_name,
          dob: screening.dob,
          age: screening.age,
          sex: screening.sex,
          phone: screening.phone,
          address: screening.address,
          village: screening.village,
          district: screening.district,
          state: screening.state,
          diabetesType:
            screening.diabetes_type,
          diabetesSince:
            screening.diabetes_since,
          treatment: screening.treatment,
          hba1c: screening.hba1c,
          previousDR:
            screening.previous_dr,
          previousEyeTreatment:
            screening.previous_eye_treatment,
        },

        images,

        aiResult: aiWithEvidence,

        clinicalFindings:
          findingsResult.rows,

        doctorReviews:
          reviewResult.rows,
      },

      /*
       * Compatibility with the older frontend shape.
       */
      screening,
      aiResult: aiWithEvidence,
      clinicalFindings:
        findingsResult.rows,
      doctorReviews:
        reviewResult.rows,
    });
  } catch (error) {
    console.error(
      "Get complete case error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to retrieve complete case",
      error: error.message,
    });
  }
});

module.exports = router;
