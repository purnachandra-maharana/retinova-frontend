const express = require("express");
const pool = require("../config/db");

const router = express.Router();

/* =========================================================
   SEND SCREENING TO OPHTHALMOLOGIST
   ========================================================= */

router.post("/send/:screeningId", async (req, res) => {
  try {
    const { screeningId } = req.params;

    const screeningResult = await pool.query(
      `
      SELECT
        s.id,
        s.case_id,
        s.status,
        s.eye,

        p.patient_code,
        p.full_name,

        ar.processing_status,
        ar.classification,
        ar.confidence

      FROM screenings s

      JOIN patients p
        ON s.patient_id = p.id

      LEFT JOIN ai_results ar
        ON s.id = ar.screening_id

      WHERE s.id = $1
      `,
      [screeningId]
    );

    if (screeningResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Screening not found",
      });
    }

    const screening = screeningResult.rows[0];

    /* -------------------------------------------------------
       AI ANALYSIS MUST BE COMPLETED FIRST
       ------------------------------------------------------- */

    if (
      screening.processing_status &&
      screening.processing_status !== "COMPLETED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "AI analysis is not completed. The screening cannot be sent to the ophthalmologist yet.",
      });
    }

    /* -------------------------------------------------------
       PREVENT DUPLICATE SUBMISSION
       ------------------------------------------------------- */

    if (
      screening.status === "PENDING" ||
      screening.status === "REVIEWED" ||
      screening.status === "REFERRED"
    ) {
      return res.json({
        success: true,
        message:
          "Screening is already in the doctor workflow",

        screening: {
          id: screening.id,
          caseId: screening.case_id,
          eye: screening.eye,
          status: screening.status,

          patientCode: screening.patient_code,
          patientName: screening.full_name,

          classification:
            screening.classification || null,

          confidence:
            screening.confidence !== null &&
            screening.confidence !== undefined
              ? Number(screening.confidence)
              : null,
        },
      });
    }

    /* -------------------------------------------------------
       CHANGE STATUS TO PENDING
       ------------------------------------------------------- */

    const result = await pool.query(
      `
      UPDATE screenings
      SET status = 'PENDING'
      WHERE id = $1
      RETURNING
        id,
        case_id,
        eye,
        status,
        clinic_name,
        created_at;
      `,
      [screeningId]
    );

    res.json({
      success: true,

      message:
        "Screening sent to ophthalmologist successfully",

      screening: {
        ...result.rows[0],

        patientCode:
          screening.patient_code,

        patientName:
          screening.full_name,

        classification:
          screening.classification || null,

        confidence:
          screening.confidence !== null &&
          screening.confidence !== undefined
            ? Number(screening.confidence)
            : null,
      },
    });
  } catch (error) {
    console.error(
      "Send screening to ophthalmologist error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to send screening to ophthalmologist",

      error: error.message,
    });
  }
});


/* =========================================================
   SAVE DOCTOR REVIEW
   ========================================================= */

router.post("/reviews/:screeningId", async (req, res) => {
  try {
    const { screeningId } = req.params;

    const {
      reviewerName,
      decision,
      notes,
      referralStatus,
    } = req.body;

    /* -------------------------------------------------------
       VALIDATION
       ------------------------------------------------------- */

    if (!decision) {
      return res.status(400).json({
        success: false,
        message: "Doctor decision is required",
      });
    }

    /* -------------------------------------------------------
       CHECK SCREENING
       ------------------------------------------------------- */

    const screeningResult = await pool.query(
      `
      SELECT
        id,
        case_id,
        status
      FROM screenings
      WHERE id = $1
      `,
      [screeningId]
    );

    if (screeningResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Screening not found",
      });
    }

    /* -------------------------------------------------------
       SAVE REVIEW
       ------------------------------------------------------- */

    const reviewResult = await pool.query(
      `
      INSERT INTO doctor_reviews (
        screening_id,
        reviewer_name,
        decision,
        notes,
        referral_status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `,
      [
        screeningId,
        reviewerName || null,
        decision,
        notes || null,
        referralStatus || null,
      ]
    );

    /* -------------------------------------------------------
       UPDATE SCREENING STATUS
       ------------------------------------------------------- */

    let screeningStatus = "REVIEWED";

    if (
      referralStatus &&
      referralStatus.toUpperCase() === "REFERRED"
    ) {
      screeningStatus = "REFERRED";
    }

    await pool.query(
      `
      UPDATE screenings
      SET status = $1
      WHERE id = $2
      `,
      [
        screeningStatus,
        screeningId,
      ]
    );

    /* -------------------------------------------------------
       RESPONSE
       ------------------------------------------------------- */

    res.status(201).json({
      success: true,

      message:
        "Doctor review saved successfully",

      review:
        reviewResult.rows[0],

      screeningStatus,
    });
  } catch (error) {
    console.error(
      "Create doctor review error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to save doctor review",

      error: error.message,
    });
  }
});


/* =========================================================
   GET DOCTOR REVIEWS
   ========================================================= */

router.get("/reviews/:screeningId", async (req, res) => {
  try {
    const { screeningId } = req.params;

    /* -------------------------------------------------------
       CHECK SCREENING
       ------------------------------------------------------- */

    const screeningResult = await pool.query(
      `
      SELECT
        id,
        case_id
      FROM screenings
      WHERE id = $1
      `,
      [screeningId]
    );

    if (screeningResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Screening not found",
      });
    }

    /* -------------------------------------------------------
       GET REVIEWS
       ------------------------------------------------------- */

    const result = await pool.query(
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
      `,
      [screeningId]
    );

    res.json({
      success: true,

      count:
        result.rows.length,

      reviews:
        result.rows,
    });
  } catch (error) {
    console.error(
      "Get doctor reviews error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to retrieve doctor reviews",

      error: error.message,
    });
  }
});


/* =========================================================
   GET PENDING DOCTOR CASES
   ========================================================= */

router.get("/pending", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        s.id,
        s.case_id,
        s.eye,
        s.status,
        s.clinic_name,
        s.created_at,

        p.patient_code,
        p.full_name,
        p.age,
        p.sex,

        ar.classification,
        ar.confidence,
        ar.processing_status

      FROM screenings s

      JOIN patients p
        ON s.patient_id = p.id

      LEFT JOIN ai_results ar
        ON s.id = ar.screening_id

      WHERE s.status = 'PENDING'

      ORDER BY s.created_at DESC
      `
    );

    res.json({
      success: true,

      count:
        result.rows.length,

      cases:
        result.rows,
    });
  } catch (error) {
    console.error(
      "Get pending doctor cases error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Failed to retrieve pending cases",

      error: error.message,
    });
  }
});


/* =========================================================
   EXPORT ROUTER
   ========================================================= */

module.exports = router;