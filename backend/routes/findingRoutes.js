const express = require("express");
const pool = require("../config/db");

const router = express.Router();


// ============================================
// ADD CLINICAL FINDING
// POST /api/findings/:screeningId
// ============================================

router.post("/:screeningId", async (req, res) => {
  try {
    const { screeningId } = req.params;

    const {
      findingType,
      findingValue,
    } = req.body;

    // ------------------------------------------
    // Validation
    // ------------------------------------------

    if (!findingType) {
      return res.status(400).json({
        success: false,
        message: "Finding type is required",
      });
    }

    // ------------------------------------------
    // Check screening exists
    // ------------------------------------------

    const screeningResult = await pool.query(
      `
      SELECT id, case_id
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
    // Insert finding
    // ------------------------------------------

    const result = await pool.query(
      `
      INSERT INTO clinical_findings (
        screening_id,
        finding_type,
        finding_value
      )
      VALUES ($1, $2, $3)
      RETURNING *;
      `,
      [
        screeningId,
        findingType,
        findingValue || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Clinical finding added successfully",
      finding: result.rows[0],
    });

  } catch (error) {
    console.error("Add clinical finding error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add clinical finding",
      error: error.message,
    });
  }
});


// ============================================
// GET CLINICAL FINDINGS
// GET /api/findings/:screeningId
// ============================================

router.get("/:screeningId", async (req, res) => {
  try {
    const { screeningId } = req.params;

    // ------------------------------------------
    // Check screening exists
    // ------------------------------------------

    const screeningResult = await pool.query(
      `
      SELECT id, case_id
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
    // Get findings
    // ------------------------------------------

    const result = await pool.query(
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
      [screeningId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      findings: result.rows,
    });

  } catch (error) {
    console.error("Get clinical findings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve clinical findings",
      error: error.message,
    });
  }
});


// ============================================
// DELETE CLINICAL FINDING
// DELETE /api/findings/:id
// ============================================

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM clinical_findings
      WHERE id = $1
      RETURNING *;
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Clinical finding not found",
      });
    }

    res.json({
      success: true,
      message: "Clinical finding deleted successfully",
      finding: result.rows[0],
    });

  } catch (error) {
    console.error("Delete clinical finding error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete clinical finding",
      error: error.message,
    });
  }
});


module.exports = router;