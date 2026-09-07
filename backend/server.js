require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./config/db");

const patientRoutes = require("./routes/patientRoutes");
const screeningRoutes = require("./routes/screeningRoutes");
const aiRoutes = require("./routes/aiRoutes");
const findingRoutes = require("./routes/findingRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const caseRoutes = require("./routes/caseRoutes");
const reportRoutes = require("./routes/reportRoutes");
const { router: authRoutes } = require("./routes/authRoutes");
const { requireAuth } = require("./middleware/auth");

const app = express();

// ============================================
// PORT
// ============================================

const PORT = Number(process.env.PORT) || 10000;

// ============================================
// MIDDLEWARE
// ============================================

// Allow frontend requests
app.use(cors());

// Parse bounded request bodies
app.use(express.json({ limit: "1mb" }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/auth", authRoutes);

// ============================================
// BASIC ROUTE
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Retinova Backend is running",
    status: "ok",
  });
});

// ============================================
// BACKEND HEALTH CHECK
// ============================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "Retinova Backend",
    status: "healthy",
  });
});

// ============================================
// DATABASE HEALTH CHECK
// ============================================

app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time"
    );

    res.status(200).json({
      success: true,
      database: result.rows[0].database,
      status: "connected",
      serverTime: result.rows[0].time,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      status: "database_connection_failed",
      message: error.message,
    });
  }
});

// ============================================
// API ROUTES
// ============================================

// Patient APIs
app.use("/api/patients", requireAuth, patientRoutes);

// Screening APIs
app.use("/api/screenings", requireAuth, screeningRoutes);

// AI APIs
app.use("/api/ai", requireAuth, aiRoutes);

// Clinical Findings APIs
app.use("/api/findings", requireAuth, findingRoutes);

// Doctor APIs
app.use("/api/doctors", requireAuth, doctorRoutes);

// Complete Case APIs
app.use("/api/cases", requireAuth, caseRoutes);

// Clinical Report APIs
app.use("/api/reports", requireAuth, reportRoutes);

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ============================================
// START SERVER
// ============================================

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Retinova Backend running on port ${PORT}`);
  });
}

module.exports = app;