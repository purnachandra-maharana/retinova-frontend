const express = require("express");
const pool = require("../config/db");

const router = express.Router();


// ============================================
// CREATE / INITIALIZE AI RESULT
// POST /api/ai/:screeningId
// ============================================

router.post("/:screeningId", async (req, res) => {
  try {
    const { screeningId } = req.params;

    // ------------------------------------------
    // Check screening exists
    // ------------------------------------------

    const screeningResult = await pool.query(
      `
      SELECT id, case_id, status
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

    // ------------------------------------------
    // Check if AI result already exists
    // ------------------------------------------

    const existingResult = await pool.query(
      `
      SELECT *
      FROM ai_results
      WHERE screening_id = $1
      `,
      [screeningId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: "AI result already exists",
        aiResult: existingResult.rows[0],
      });
    }

    // ------------------------------------------
    // Create pending AI result
    // ------------------------------------------

    const result = await pool.query(
      `
      INSERT INTO ai_results (
        screening_id,
        processing_status
      )
      VALUES ($1, 'PENDING')
      RETURNING *;
      `,
      [screeningId]
    );

    res.status(201).json({
      success: true,
      message: "AI analysis initialized",
      aiResult: result.rows[0],
    });

  } catch (error) {
    console.error("Initialize AI result error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to initialize AI analysis",
      error: error.message,
    });
  }
});


// ============================================
// GET AI RESULT
// GET /api/ai/:screeningId
// ============================================

router.get("/:screeningId", async (req, res) => {
  try {
    const { screeningId } = req.params;

    const result = await pool.query(
      `
      SELECT
        ar.*,
        s.case_id,
        s.eye,
        p.patient_code,
        p.full_name
      FROM ai_results ar
      JOIN screenings s
        ON ar.screening_id = s.id
      JOIN patients p
        ON s.patient_id = p.id
      WHERE ar.screening_id = $1
      `,
      [screeningId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "AI result not found",
      });
    }

    res.json({
      success: true,
      aiResult: result.rows[0],
    });

  } catch (error) {
    console.error("Get AI result error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve AI result",
      error: error.message,
    });
  }
});


// ============================================
// UPDATE AI RESULT
// PUT /api/ai/:screeningId
// ============================================
//
// This endpoint is designed for the future
// MATLAB pipeline.
//
// MATLAB will eventually provide:
// - quality status
// - quality score
// - DR level
// - classification
// - confidence
// - Grad-CAM path
// - processing status
//

router.put("/:screeningId", async (req, res) => {
  try {
    const { screeningId } = req.params;

    const {
      qualityStatus,
      qualityScore,
      drLevel,
      classification,
      confidence,
      gradcamPath,
      processingStatus,
    } = req.body;

    // ------------------------------------------
    // Check screening exists
    // ------------------------------------------

    const screeningResult = await pool.query(
      `
      SELECT id
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

    // ------------------------------------------
    // Check AI result exists
    // ------------------------------------------

    const existingResult = await pool.query(
      `
      SELECT id
      FROM ai_results
      WHERE screening_id = $1
      `,
      [screeningId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "AI result has not been initialized for this screening",
      });
    }

    // ------------------------------------------
    // Update AI result
    // ------------------------------------------

    const result = await pool.query(
      `
      UPDATE ai_results
      SET
        quality_status = COALESCE($1, quality_status),
        quality_score = COALESCE($2, quality_score),
        dr_level = COALESCE($3, dr_level),
        classification = COALESCE($4, classification),
        confidence = COALESCE($5, confidence),
        gradcam_path = COALESCE($6, gradcam_path),
        processing_status = COALESCE($7, processing_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE screening_id = $8
      RETURNING *;
      `,
      [
        qualityStatus ?? null,
        qualityScore ?? null,
        drLevel ?? null,
        classification ?? null,
        confidence ?? null,
        gradcamPath ?? null,
        processingStatus ?? null,
        screeningId,
      ]
    );

    res.json({
      success: true,
      message: "AI result updated successfully",
      aiResult: result.rows[0],
    });

  } catch (error) {
    console.error("Update AI result error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update AI result",
      error: error.message,
    });
  }
});


module.exports = router;