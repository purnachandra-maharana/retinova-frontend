const express = require("express");
const pool = require("../config/db");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET CLINICAL REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/:screeningId
|
| Returns the complete clinical report for one screening:
| - Case information
| - Patient information
| - Clinic information
| - Screening reason
| - Fundus image
| - AI result
| - Probability distribution
| - Class labels
| - Clinical findings
| - Latest ophthalmologist review
|
|--------------------------------------------------------------------------
*/

router.get("/:screeningId", async (req, res) => {
  try {
    const { screeningId } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate screening ID
    |--------------------------------------------------------------------------
    */

    if (!screeningId || !Number.isInteger(Number(screeningId))) {
      return res.status(400).json({
        success: false,
        message: "A valid screening ID is required.",
      });
    }

    const numericScreeningId = Number(screeningId);

    /*
    |--------------------------------------------------------------------------
    | GET SCREENING + PATIENT + CLINIC INFORMATION
    |--------------------------------------------------------------------------
    */

    const screeningResult = await pool.query(
      `
      SELECT
        s.id,
        s.case_id,
        s.eye,
        s.status,
        s.created_at,
        s.clinic_name,
        s.clinic_id,
        s.clinic_location,
        s.clinic_phone,
        s.worker_name,
        s.worker_id,
        s.worker_designation,
        s.screening_reason,

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
        p.previous_eye_treatment

      FROM screenings s

      JOIN patients p
        ON s.patient_id = p.id

      WHERE s.id = $1
      `,
      [numericScreeningId]
    );

    /*
    |--------------------------------------------------------------------------
    | SCREENING NOT FOUND
    |--------------------------------------------------------------------------
    */

    if (screeningResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Screening not found.",
      });
    }

    const screening = screeningResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | GET SCREENING IMAGE
    |--------------------------------------------------------------------------
    |
    | The most recently uploaded fundus image is returned.
    |
    */

    const imageResult = await pool.query(
      `
      SELECT
        id,
        original_path,
        created_at
      FROM screening_images
      WHERE screening_id = $1
      ORDER BY created_at DESC
      `,
      [numericScreeningId]
    );

    /*
    |--------------------------------------------------------------------------
    | GET AI RESULT
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | probabilities and class_labels were added here.
    |
    */

    const aiResult = await pool.query(
      `
      SELECT
        id,
        quality_status,
        quality_score,
        dr_level,
        classification,
        confidence,
        probabilities,
        class_labels,
        gradcam_path,
        processing_status,
        created_at,
        updated_at
      FROM ai_results
      WHERE screening_id = $1
      `,
      [numericScreeningId]
    );

    /*
    |--------------------------------------------------------------------------
    | GET CLINICAL FINDINGS
    |--------------------------------------------------------------------------
    */

    const findingsResult = await pool.query(
      `
      SELECT
        id,
        screening_id,
        finding_type,
        finding_value,
        created_at
      FROM clinical_findings
      WHERE screening_id = $1
      ORDER BY created_at ASC
      `,
      [numericScreeningId]
    );

    /*
    |--------------------------------------------------------------------------
    | GET LATEST DOCTOR REVIEW
    |--------------------------------------------------------------------------
    |
    | A screening can potentially have multiple reviews.
    | The latest review is used for the clinical report.
    |
    */

    const reviewResult = await pool.query(
      `
      SELECT
        id,
        screening_id,
        reviewer_name,
        decision,
        notes,
        referral_status,
        reviewed_at
      FROM doctor_reviews
      WHERE screening_id = $1
      ORDER BY reviewed_at DESC
      LIMIT 1
      `,
      [numericScreeningId]
    );

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE AI RESULT
    |--------------------------------------------------------------------------
    |
    | PostgreSQL JSONB is normally returned by node-postgres as a
    | JavaScript array/object. We still normalize it defensively so
    | the frontend receives predictable data.
    |
    */

    let normalizedAIResult = null;

    if (aiResult.rows.length > 0) {
      const ai = aiResult.rows[0];

      let probabilities = ai.probabilities;

      if (typeof probabilities === "string") {
        try {
          probabilities = JSON.parse(probabilities);
        } catch (error) {
          probabilities = null;
        }
      }

      let classLabels = ai.class_labels;

      if (typeof classLabels === "string") {
        try {
          classLabels = JSON.parse(classLabels);
        } catch (error) {
          classLabels = null;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize probability values
      |--------------------------------------------------------------------------
      */

      if (Array.isArray(probabilities)) {
        probabilities = probabilities.map((value) => {
          const numberValue = Number(value);

          return Number.isFinite(numberValue)
            ? numberValue
            : 0;
        });
      } else {
        probabilities = null;
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize class labels
      |--------------------------------------------------------------------------
      |
      | Fallback labels correspond to the five MATLAB DR classes.
      |
      */

      if (!Array.isArray(classLabels) || classLabels.length === 0) {
        classLabels = [
          "No DR",
          "Mild NPDR",
          "Moderate NPDR",
          "Severe NPDR",
          "Proliferative DR",
        ];
      } else {
        classLabels = classLabels.map((label) =>
          String(label)
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Return AI result
      |--------------------------------------------------------------------------
      */

      normalizedAIResult = {
        id: ai.id,

        quality_status: ai.quality_status,
        quality_score:
          ai.quality_score !== null &&
          ai.quality_score !== undefined
            ? Number(ai.quality_score)
            : null,

        dr_level:
          ai.dr_level !== null &&
          ai.dr_level !== undefined
            ? Number(ai.dr_level)
            : null,

        classification:
          ai.classification || null,

        confidence:
          ai.confidence !== null &&
          ai.confidence !== undefined
            ? Number(ai.confidence)
            : null,

        /*
        |--------------------------------------------------------------------------
        | NEW FIELDS
        |--------------------------------------------------------------------------
        */

        probabilities,
        class_labels: classLabels,

        gradcam_path:
          ai.gradcam_path || null,

        processing_status:
          ai.processing_status || null,

        created_at: ai.created_at,
        updated_at: ai.updated_at,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | AI REFERRAL RECOMMENDATION
    |--------------------------------------------------------------------------
    |
    | Grades 2-4 are considered referable by the current prototype
    | workflow.
    |
    | This is kept separate from the ophthalmologist's final decision.
    |
    */

    let aiReferralRecommended = null;

    if (
      normalizedAIResult &&
      normalizedAIResult.dr_level !== null
    ) {
      aiReferralRecommended =
        normalizedAIResult.dr_level >= 2;
    }

    /*
    |--------------------------------------------------------------------------
    | BUILD REPORT
    |--------------------------------------------------------------------------
    */

    const report = {
      /*
      |--------------------------------------------------------------------------
      | REPORT METADATA
      |--------------------------------------------------------------------------
      */

      reportId: `RPT-${screening.case_id}`,

      generatedAt: new Date().toISOString(),

      /*
      |--------------------------------------------------------------------------
      | CASE
      |--------------------------------------------------------------------------
      */

      case: {
        screeningId: screening.id,
        caseId: screening.case_id,
        eye: screening.eye,
        status: screening.status,
        screeningDate: screening.created_at,
      },

      /*
      |--------------------------------------------------------------------------
      | PATIENT
      |--------------------------------------------------------------------------
      */

      patient: {
        id: screening.patient_id,
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

        diabetesType: screening.diabetes_type,
        diabetesSince: screening.diabetes_since,
        treatment: screening.treatment,
        hba1c: screening.hba1c,
        previousDR: screening.previous_dr,
        previousEyeTreatment:
          screening.previous_eye_treatment,
      },

      /*
      |--------------------------------------------------------------------------
      | CLINIC / PHC
      |--------------------------------------------------------------------------
      */

      clinic: {
        name: screening.clinic_name,
        id: screening.clinic_id,
        location: screening.clinic_location,
        phone: screening.clinic_phone,

        workerName: screening.worker_name,
        workerId: screening.worker_id,
        workerDesignation:
          screening.worker_designation,
      },

      /*
      |--------------------------------------------------------------------------
      | SCREENING REASON
      |--------------------------------------------------------------------------
      */

      screeningReason:
        screening.screening_reason || null,

      /*
      |--------------------------------------------------------------------------
      | IMAGE EVIDENCE
      |--------------------------------------------------------------------------
      */

      images: imageResult.rows.map((image) => ({
        id: image.id,
        original_path: image.original_path,
        created_at: image.created_at,
      })),

      /*
      |--------------------------------------------------------------------------
      | AI RESULT
      |--------------------------------------------------------------------------
      */

      aiResult: normalizedAIResult,

      /*
      |--------------------------------------------------------------------------
      | AI REFERRAL RECOMMENDATION
      |--------------------------------------------------------------------------
      */

      aiReferralRecommended,

      /*
      |--------------------------------------------------------------------------
      | CLINICAL FINDINGS
      |--------------------------------------------------------------------------
      */

      clinicalFindings:
        findingsResult.rows || [],

      /*
      |--------------------------------------------------------------------------
      | OPHTHALMOLOGIST REVIEW
      |--------------------------------------------------------------------------
      */

      doctorReview:
        reviewResult.rows.length > 0
          ? reviewResult.rows[0]
          : null,
    };

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error(
      "Get clinical report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate clinical report.",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| EXPORT ROUTER
|--------------------------------------------------------------------------
*/

module.exports = router;