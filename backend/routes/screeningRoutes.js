const express = require("express");
const pool = require("../config/db");
const upload = require("../middleware/uploadMiddleware");
const { runRetinaSafe } = require("../services/matlabService");

const fs = require("fs");
const path = require("path");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Paths
|--------------------------------------------------------------------------
*/

const BACKEND_ROOT = path.join(__dirname, "..");

const UPLOADS_DIR = path.join(
  BACKEND_ROOT,
  "uploads"
);

const GRADCAM_DIR = path.join(
  UPLOADS_DIR,
  "gradcam"
);

const MATLAB_PROJECT =
  "D:\\Document\\SIH MATLAB PROJECT\\SIH26038_NEW";

const MATLAB_JSON_DIR = path.join(
  MATLAB_PROJECT,
  "output",
  "final_pipeline",
  "json"
);

const MATLAB_GRADCAM_DIR = path.join(
  MATLAB_PROJECT,
  "output",
  "final_pipeline",
  "gradcam"
);

if (!fs.existsSync(GRADCAM_DIR)) {
  fs.mkdirSync(GRADCAM_DIR, {
    recursive: true,
  });
}

/*
|--------------------------------------------------------------------------
| Helper: convert MATLAB result into database-friendly values
|--------------------------------------------------------------------------
*/

function parseMatlabResult(jsonData) {
  const quality = jsonData?.quality || {};
  const prediction = jsonData?.prediction || {};
  const referral = jsonData?.referral || {};

  const qualityStatus =
    quality.status
      ? String(quality.status)
      : null;

  const qualityScore =
    quality.score !== undefined &&
    quality.score !== null
      ? Number(quality.score)
      : null;

  const drLevel =
    prediction.grade !== undefined &&
    prediction.grade !== null
      ? Number(prediction.grade)
      : null;

  const classification =
    prediction.label
      ? String(prediction.label)
      : null;

  const confidence =
    prediction.confidence !== undefined &&
    prediction.confidence !== null
      ? Number(prediction.confidence)
      : null;

  const probabilities = Array.isArray(prediction.probabilities)
    ? prediction.probabilities
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : null;

  const classLabels = Array.isArray(prediction.classLabels)
    ? prediction.classLabels.map((label) => String(label))
    : [
        "No DR",
        "Mild NPDR",
        "Moderate NPDR",
        "Severe NPDR",
        "Proliferative DR",
      ];

  // MATLAB uses the canonical quality score names below.
  // We normalize them once here so every frontend screen receives the
  // same five clinical quality metrics.
  // MATLAB result files can expose these metrics either directly under
  // `quality` or inside `quality.metrics`. Support both shapes.
  const metricSource =
    quality?.metrics && typeof quality.metrics === "object"
      ? quality.metrics
      : {};

  const firstFinite = (...values) => {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return null;
  };

  const qualityMetrics = {
    illumination: firstFinite(
      quality.brightnessScore,
      quality.brightness,
      metricSource.illumination,
      metricSource.brightnessScore,
      metricSource.brightness
    ),
    contrast: firstFinite(
      quality.contrastScore,
      quality.contrast,
      metricSource.contrast,
      metricSource.contrastScore
    ),
    focus: firstFinite(
      quality.sharpnessScore,
      quality.sharpness,
      metricSource.focus,
      metricSource.sharpnessScore,
      metricSource.sharpness
    ),
    saturation: firstFinite(
      quality.saturationScore,
      quality.saturation,
      metricSource.saturation,
      metricSource.saturationScore
    ),
    fieldOfView: firstFinite(
      quality.retinalCoverageScore,
      quality.retinalCoverage,
      metricSource.fieldOfView,
      metricSource.retinalCoverageScore,
      metricSource.retinalCoverage
    ),
  };

  return {
    qualityStatus,
    qualityScore,
    drLevel,
    classification,
    confidence,
    probabilities,
    classLabels,
    qualityMetrics,
    referral,
    prediction,
    quality,
  };
}

/*
|--------------------------------------------------------------------------
| Helper: find generated MATLAB JSON
|--------------------------------------------------------------------------
*/

function findLatestJsonForImage(imagePath) {
  const imageBaseName =
    path.basename(
      imagePath,
      path.extname(imagePath)
    );

  const expectedJson =
    path.join(
      MATLAB_JSON_DIR,
      `${imageBaseName}_clinical_result.json`
    );

  if (fs.existsSync(expectedJson)) {
    return expectedJson;
  }

  if (!fs.existsSync(MATLAB_JSON_DIR)) {
    return null;
  }

  const files = fs
    .readdirSync(MATLAB_JSON_DIR)
    .filter((file) =>
      file.toLowerCase().endsWith(".json")
    )
    .filter((file) =>
      file.startsWith(imageBaseName)
    );

  if (files.length === 0) {
    return null;
  }

  files.sort((a, b) => {
    const aTime = fs.statSync(
      path.join(MATLAB_JSON_DIR, a)
    ).mtimeMs;

    const bTime = fs.statSync(
      path.join(MATLAB_JSON_DIR, b)
    ).mtimeMs;

    return bTime - aTime;
  });

  return path.join(
    MATLAB_JSON_DIR,
    files[0]
  );
}

/*
|--------------------------------------------------------------------------
| Helper: copy Grad-CAM into backend uploads
|--------------------------------------------------------------------------
*/

function copyGradCam(imagePath) {
  const imageBaseName =
    path.basename(
      imagePath,
      path.extname(imagePath)
    );

  const expectedGradCam =
    path.join(
      MATLAB_GRADCAM_DIR,
      `${imageBaseName}_GradCAM.png`
    );

  if (!fs.existsSync(expectedGradCam)) {
    return null;
  }

  const destinationName =
    `${imageBaseName}_GradCAM.png`;

  const destinationPath =
    path.join(
      GRADCAM_DIR,
      destinationName
    );

  fs.copyFileSync(
    expectedGradCam,
    destinationPath
  );

  return `/uploads/gradcam/${destinationName}`;
}

/*
|--------------------------------------------------------------------------
| CREATE SCREENING
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {
  try {
    const {
      patientId,
      caseId,
      clinicName,
      clinicId,
      clinicLocation,
      clinicPhone,
      workerName,
      workerId,
      workerDesignation,
      eye,
      screeningReason,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    if (!eye) {
      return res.status(400).json({
        success: false,
        message: "Eye selection is required",
      });
    }

    const patientResult = await pool.query(
      `
      SELECT id, patient_code, full_name
      FROM patients
      WHERE id = $1
      `,
      [patientId]
    );

    if (patientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const generatedCaseId =
      caseId ||
      `RS-${Date.now()
        .toString()
        .slice(-8)}`;

    const query = `
      INSERT INTO screenings (
        case_id,
        patient_id,
        clinic_name,
        clinic_id,
        clinic_location,
        clinic_phone,
        worker_name,
        worker_id,
        worker_designation,
        eye,
        screening_reason,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        'PENDING'
      )
      RETURNING *;
    `;

    const values = [
      generatedCaseId,
      patientId,
      clinicName || null,
      clinicId || null,
      clinicLocation || null,
      clinicPhone || null,
      workerName || null,
      workerId || null,
      workerDesignation || null,
      eye,
      screeningReason || null,
    ];

    const result = await pool.query(
      query,
      values
    );

    res.status(201).json({
      success: true,
      message:
        "Screening created successfully",
      screening: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Create screening error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to create screening",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET ALL SCREENINGS
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.*,
        p.patient_code,
        p.full_name,
        p.age,
        p.sex
      FROM screenings s
      JOIN patients p
        ON s.patient_id = p.id
      ORDER BY s.created_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      screenings: result.rows,
    });
  } catch (error) {
    console.error(
      "Get screenings error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to retrieve screenings",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPLOAD IMAGE + RUN MATLAB
|--------------------------------------------------------------------------
|
| POST /api/screenings/:id/image
|
| Form-data:
| image = fundus image
|
|--------------------------------------------------------------------------
*/

router.post(
  "/:id/image",
  upload.single("image"),
  async (req, res) => {
    const { id } = req.params;

    try {
      /*
      |--------------------------------------------------------------------------
      | 1. Verify screening
      |--------------------------------------------------------------------------
      */

      const screeningResult =
        await pool.query(
          `
          SELECT
            id,
            case_id,
            status
          FROM screenings
          WHERE id = $1
          `,
          [id]
        );

      if (
        screeningResult.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message: "Screening not found",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 2. Verify uploaded image
      |--------------------------------------------------------------------------
      */

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image uploaded",
        });
      }

      const imagePath = req.file.path;

      console.log(
        "\n============================================"
      );
      console.log(
        " RetinaSafe Screening Image Received"
      );
      console.log(
        "============================================"
      );

      console.log(
        "Screening ID:",
        id
      );

      console.log(
        "Case ID:",
        screeningResult.rows[0].case_id
      );

      console.log(
        "Image:",
        imagePath
      );

      /*
      |--------------------------------------------------------------------------
      | 3. Save image in database
      |--------------------------------------------------------------------------
      */

      const imageResult =
        await pool.query(
          `
          INSERT INTO screening_images (
            screening_id,
            original_path
          )
          VALUES ($1, $2)
          RETURNING *;
          `,
          [id, imagePath]
        );

      /*
      |--------------------------------------------------------------------------
      | 4. Initialize AI result
      |--------------------------------------------------------------------------
      */

      await pool.query(
        `
        INSERT INTO ai_results (
          screening_id,
          processing_status
        )
        VALUES ($1, 'PROCESSING')
        ON CONFLICT (screening_id)
        DO UPDATE SET
          processing_status = 'PROCESSING',
          updated_at = CURRENT_TIMESTAMP;
        `,
        [id]
      );

      /*
      |--------------------------------------------------------------------------
      | 5. Run MATLAB S10 pipeline
      |--------------------------------------------------------------------------
      */

      console.log(
        "\nStarting MATLAB analysis..."
      );

      let matlabExecution;

      try {
        matlabExecution =
          await runRetinaSafe(
            imagePath
          );
      } catch (matlabError) {
        console.error(
          "MATLAB execution failed:",
          matlabError.message
        );

        await pool.query(
          `
          UPDATE ai_results
          SET
            processing_status = 'FAILED',
            updated_at = CURRENT_TIMESTAMP
          WHERE screening_id = $1
          `,
          [id]
        );

        return res.status(500).json({
          success: false,
          message:
            "MATLAB image analysis failed",
          error: matlabError.message,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 6. Locate MATLAB JSON
      |--------------------------------------------------------------------------
      */

      const jsonPath =
        findLatestJsonForImage(
          imagePath
        );

      if (!jsonPath) {
        await pool.query(
          `
          UPDATE ai_results
          SET
            processing_status = 'FAILED',
            updated_at = CURRENT_TIMESTAMP
          WHERE screening_id = $1
          `,
          [id]
        );

        return res.status(500).json({
          success: false,
          message:
            "MATLAB completed, but the clinical JSON result was not found.",
          matlabExitCode:
            matlabExecution.exitCode,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 7. Read MATLAB JSON
      |--------------------------------------------------------------------------
      */

      let matlabResult;

      try {
        const jsonText =
          fs.readFileSync(
            jsonPath,
            "utf8"
          );

        matlabResult =
          JSON.parse(jsonText);
      } catch (jsonError) {
        console.error(
          "MATLAB JSON parsing error:",
          jsonError
        );

        await pool.query(
          `
          UPDATE ai_results
          SET
            processing_status = 'FAILED',
            updated_at = CURRENT_TIMESTAMP
          WHERE screening_id = $1
          `,
          [id]
        );

        return res.status(500).json({
          success: false,
          message:
            "MATLAB result JSON could not be read.",
          error: jsonError.message,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 8. Parse result
      |--------------------------------------------------------------------------
      */

      const parsed =
        parseMatlabResult(
          matlabResult
        );

      console.log(
        "\nMATLAB Result:"
      );

      console.log(
        "Quality:",
        parsed.qualityStatus
      );

      console.log(
        "Quality Score:",
        parsed.qualityScore
      );

      console.log(
        "DR Grade:",
        parsed.drLevel
      );

      console.log(
        "Classification:",
        parsed.classification
      );

      console.log(
        "Confidence:",
        parsed.confidence
      );

      /*
      |--------------------------------------------------------------------------
      | 9. QUALITY GATE
      |--------------------------------------------------------------------------
      |
      | POOR:
      |   Do NOT classify.
      |   Ask PHC worker to recapture.
      |
      | BORDERLINE:
      |   S10 already applies CLAHE and proceeds.
      |
      | GOOD:
      |   Normal classification.
      |
      |--------------------------------------------------------------------------
      */

      const normalizedQuality =
        parsed.qualityStatus
          ? parsed.qualityStatus
              .toUpperCase()
          : "";

      /*
      |--------------------------------------------------------------------------
      | POOR IMAGE
      |--------------------------------------------------------------------------
      */

      if (
        normalizedQuality === "POOR"
      ) {
        await pool.query(
          `
          UPDATE ai_results
          SET
            quality_status = $1,
            quality_score = $2,
            dr_level = NULL,
            classification = NULL,
            confidence = NULL,
            probabilities = NULL,
            class_labels = NULL,
            quality_metrics = $3::jsonb,
            gradcam_path = NULL,
            processing_status = 'RECAPTURE_REQUIRED',
            updated_at = CURRENT_TIMESTAMP
          WHERE screening_id = $4
          `,
          [
            parsed.qualityStatus,
            parsed.qualityScore,
            JSON.stringify(parsed.qualityMetrics),
            id,
          ]
        );

        await pool.query(
          `
          UPDATE screenings
          SET status = 'RECAPTURE_REQUIRED'
          WHERE id = $1
          `,
          [id]
        );

        console.log(
          "\nIMAGE QUALITY: POOR"
        );

        console.log(
          "Classification withheld."
        );

        return res.json({
          success: true,

          status:
            "RECAPTURE_REQUIRED",

          message:
            "Image quality is insufficient for reliable analysis. Please capture another fundus image.",

          screeningId: Number(id),

          caseId:
            screeningResult.rows[0]
              .case_id,

          quality: {
            status:
              parsed.qualityStatus,

            score:
              parsed.qualityScore,

            details:
              parsed.quality,
          },

          prediction: null,

          gradcam: null,

          referral: null,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | 10. COPY GRAD-CAM
      |--------------------------------------------------------------------------
      */

      let gradcamUrl = null;

      if (
        parsed.drLevel !== null &&
        parsed.drLevel !== undefined
      ) {
        try {
          gradcamUrl =
            copyGradCam(
              imagePath
            );
        } catch (gradcamError) {
          console.error(
            "Grad-CAM copy failed:",
            gradcamError
          );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | 11. Save successful AI result
      |--------------------------------------------------------------------------
      */

      const processingStatus =
        parsed.drLevel !== null &&
        parsed.drLevel !== undefined
          ? "COMPLETED"
          : "COMPLETED_WITHOUT_CLASSIFICATION";

      const updatedAI =
        await pool.query(
          `
          UPDATE ai_results
          SET
            quality_status = $1,
            quality_score = $2,
            dr_level = $3,
            classification = $4,
            confidence = $5,
            probabilities = $6::jsonb,
            class_labels = $7::jsonb,
            quality_metrics = $8::jsonb,
            gradcam_path = $9,
            processing_status = $10,
            updated_at = CURRENT_TIMESTAMP
          WHERE screening_id = $11
          RETURNING *;
          `,
          [
            parsed.qualityStatus,
            parsed.qualityScore,
            parsed.drLevel,
            parsed.classification,
            parsed.confidence,
            parsed.probabilities !== null
              ? JSON.stringify(parsed.probabilities)
              : null,
            JSON.stringify(parsed.classLabels),
            JSON.stringify(parsed.qualityMetrics),
            gradcamUrl,
            processingStatus,
            id,
          ]
        );

      /*
      |--------------------------------------------------------------------------
      | 12. Save clinical findings
      |--------------------------------------------------------------------------
      |
      | We only insert findings if MATLAB provides them.
      |
      |--------------------------------------------------------------------------
      */

      const findings =
        matlabResult?.findings ||
        matlabResult?.clinicalFindings ||
        {};

      if (
        findings &&
        typeof findings === "object" &&
        !Array.isArray(findings)
      ) {
        for (
          const [findingType, findingValue]
          of Object.entries(findings)
        ) {
          if (
            findingValue !== null &&
            findingValue !== undefined &&
            findingValue !== ""
          ) {
            await pool.query(
              `
              INSERT INTO clinical_findings (
                screening_id,
                finding_type,
                finding_value
              )
              VALUES ($1, $2, $3)
              `,
              [
                id,
                findingType,
                typeof findingValue ===
                "object"
                  ? JSON.stringify(
                      findingValue
                    )
                  : String(
                      findingValue
                    ),
              ]
            );
          }
        }
      }

      /*
      |--------------------------------------------------------------------------
      | 13. Keep screening available for doctor workflow
      |--------------------------------------------------------------------------
      */

      await pool.query(
        `
        UPDATE screenings
        SET status = 'PENDING'
        WHERE id = $1
        `,
        [id]
      );

      /*
      |--------------------------------------------------------------------------
      | 14. Return real MATLAB result to frontend
      |--------------------------------------------------------------------------
      */

      console.log(
        "\n============================================"
      );

      console.log(
        " RetinaSafe MATLAB Analysis Completed"
      );

      console.log(
        "============================================"
      );

      res.status(200).json({
        success: true,

        status:
          "ANALYSIS_COMPLETED",

        message:
          "Fundus image analyzed successfully",

        screeningId: Number(id),

        caseId:
          screeningResult.rows[0]
            .case_id,

        image: {
          id:
            imageResult.rows[0].id,

          filename:
            req.file.filename,

          url:
            `/uploads/${req.file.filename}`,

          size:
            req.file.size,

          mimetype:
            req.file.mimetype,
        },

        quality: {
          status: parsed.qualityStatus,
          score: parsed.qualityScore,
          metrics: parsed.qualityMetrics,
          details: parsed.quality,
          enhancement: parsed.quality.enhancement || null,
        },

        prediction: {
          grade: parsed.drLevel,
          label: parsed.classification,
          classification: parsed.classification,
          confidence: parsed.confidence,
          probabilities: parsed.probabilities,
          classLabels: parsed.classLabels,
        },

        referral:
          parsed.referral || null,

        gradcam: gradcamUrl
          ? {
              url: gradcamUrl,
            }
          : null,

        aiResult:
          updatedAI.rows[0],

        matlab: {
          exitCode:
            matlabExecution.exitCode,
        },
      });
    } catch (error) {
      console.error(
        "Image upload / MATLAB integration error:",
        error
      );

      /*
      |--------------------------------------------------------------------------
      | Attempt to mark processing as failed
      |--------------------------------------------------------------------------
      */

      try {
        await pool.query(
          `
          UPDATE ai_results
          SET
            processing_status = 'FAILED',
            updated_at = CURRENT_TIMESTAMP
          WHERE screening_id = $1
          `,
          [id]
        );
      } catch (dbError) {
        console.error(
          "Failed to update AI failure status:",
          dbError
        );
      }

      res.status(500).json({
        success: false,
        message:
          "Image processing failed",
        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET COMPLETE SCREENING
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const screeningResult =
      await pool.query(
        `
        SELECT
          s.*,
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

    if (
      screeningResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "Screening not found",
      });
    }

    const imageResult =
      await pool.query(
        `
        SELECT
          id,
          original_path,
          created_at
        FROM screening_images
        WHERE screening_id = $1
        ORDER BY created_at DESC
        `,
        [id]
      );

    const aiResult =
      await pool.query(
        `
        SELECT *
        FROM ai_results
        WHERE screening_id = $1
        `,
        [id]
      );

    const findingsResult =
      await pool.query(
        `
        SELECT *
        FROM clinical_findings
        WHERE screening_id = $1
        ORDER BY created_at ASC
        `,
        [id]
      );

    const reviewResult =
      await pool.query(
        `
        SELECT *
        FROM doctor_reviews
        WHERE screening_id = $1
        ORDER BY reviewed_at DESC
        `,
        [id]
      );

    res.json({
      success: true,

      screening:
        screeningResult.rows[0],

      images:
        imageResult.rows,

      aiResult:
        aiResult.rows.length > 0
          ? aiResult.rows[0]
          : null,

      clinicalFindings:
        findingsResult.rows,

      doctorReviews:
        reviewResult.rows,
    });
  } catch (error) {
    console.error(
      "Get screening error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to retrieve screening",
      error: error.message,
    });
  }
});

module.exports = router;