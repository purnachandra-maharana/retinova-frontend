const express = require("express");
const pool = require("../config/db");

const router = express.Router();


// ============================================
// CREATE PATIENT
// POST /api/patients
// ============================================

router.post("/", async (req, res) => {
  try {
    const {
      patientCode,
      fullName,
      dob,
      age,
      sex,
      phone,
      address,
      village,
      district,
      state,
      diabetesType,
      diabetesSince,
      treatment,
      hba1c,
      previousDR,
      previousEyeTreatment,
    } = req.body;

    if (!patientCode || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Patient code and full name are required",
      });
    }

    const query = `
      INSERT INTO patients (
        patient_code,
        full_name,
        dob,
        age,
        sex,
        phone,
        address,
        village,
        district,
        state,
        diabetes_type,
        diabetes_since,
        treatment,
        hba1c,
        previous_dr,
        previous_eye_treatment
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *;
    `;

    const values = [
      patientCode,
      fullName,
      dob || null,
      age || null,
      sex || null,
      phone || null,
      address || null,
      village || null,
      district || null,
      state || null,
      diabetesType || null,
      diabetesSince || null,
      treatment || null,
      hba1c || null,
      previousDR || null,
      previousEyeTreatment || null,
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: "Patient created successfully",
      patient: result.rows[0],
    });
  } catch (error) {
    console.error("Create patient error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create patient",
      error: error.message,
    });
  }
});


// ============================================
// GET ALL PATIENTS
// GET /api/patients
// ============================================

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM patients
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      patients: result.rows,
    });
  } catch (error) {
    console.error("Get patients error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve patients",
      error: error.message,
    });
  }
});


// ============================================
// GET PATIENT BY ID
// GET /api/patients/:id
// ============================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM patients
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    res.json({
      success: true,
      patient: result.rows[0],
    });
  } catch (error) {
    console.error("Get patient error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve patient",
      error: error.message,
    });
  }
});


module.exports = router;