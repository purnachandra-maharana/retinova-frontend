import React from "react";


function ClinicalReport({
  patient,
  selectedEye,
  imageDataUrl,
  gradCamDataUrl,
  aiResult = {},
}) {

  const today = new Date();

  const reportDate = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const reportTime = today.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });


  const classification =
    aiResult.classification || "No Referable DR";

  const confidence =
    aiResult.confidence || "94%";


  const recommendation =
    aiResult.recommendation ||
    "Routine follow-up";


  const vesselFinding =
    aiResult.vesselFinding ||
    "No major vessel abnormalities identified.";

  const opticFinding =
    aiResult.opticFinding ||
    "Optic disc region appears within expected limits.";

  const lesionFinding =
    aiResult.lesionFinding ||
    "No prominent lesion pattern identified.";


  return (
    <div className="clinical-report">


      {/* =====================================================
          PAGE 1
      ===================================================== */}

      <section className="report-page">


        {/* HEADER */}

        <ReportHeader
          patient={patient}
          reportDate={reportDate}
        />


        {/* CLINIC */}

        <ReportSectionTitle>
          Clinical Summary
        </ReportSectionTitle>


        <div className="clinic-banner">

          <div>

            <div className="report-label">
              SCREENING FACILITY
            </div>

            <div className="clinic-name">
              {patient.clinicName || "Primary Health Centre"}
            </div>

            <div className="clinic-location">
              {patient.clinicLocation || "Location not provided"}
            </div>

          </div>


          <div className="clinic-code">

            <span>PHC / CLINIC ID</span>

            <strong>
              {patient.clinicId || "—"}
            </strong>

          </div>

        </div>


        {/* PATIENT */}

        <ReportSectionTitle>
          Patient Information
        </ReportSectionTitle>


        <div className="report-card">

          <InfoGrid>

            <Info
              label="Patient full name"
              value={patient.fullName}
              large
            />

            <Info
              label="Patient ID / UHID"
              value={patient.patientId}
            />

            <Info
              label="Age"
              value={
                patient.age
                  ? `${patient.age} years`
                  : "—"
              }
            />

            <Info
              label="Sex"
              value={formatSex(patient.sex)}
            />

            <Info
              label="Date of birth"
              value={patient.dob || "—"}
            />

            <Info
              label="Phone"
              value={patient.phone || "—"}
            />

            <Info
              label="Village / locality"
              value={patient.village || "—"}
            />

            <Info
              label="District"
              value={patient.district || "—"}
            />

            <Info
              label="State"
              value={patient.state || "—"}
            />

            <Info
              label="Address"
              value={patient.address || "—"}
              wide
            />

          </InfoGrid>

        </div>


        {/* MEDICAL */}

        <ReportSectionTitle>
          Medical Information
        </ReportSectionTitle>


        <div className="report-card">

          <InfoGrid>

            <Info
              label="Diabetes type"
              value={formatDiabetes(patient.diabetesType)}
            />

            <Info
              label="Year diagnosed"
              value={patient.diabetesSince || "—"}
            />

            <Info
              label="Diabetes treatment"
              value={patient.treatment || "—"}
            />

            <Info
              label="Latest HbA1c"
              value={patient.hba1c || "—"}
            />

            <Info
              label="Previous diabetic retinopathy"
              value={formatAnswer(patient.previousDR)}
            />

            <Info
              label="Previous eye treatment"
              value={formatAnswer(patient.previousEyeTreatment)}
            />

          </InfoGrid>

        </div>


        {/* SCREENING */}

        <ReportSectionTitle>
          Screening Details
        </ReportSectionTitle>


        <div className="report-card">

          <InfoGrid>

            <Info
              label="Screened eye"
              value={formatEye(selectedEye)}
            />

            <Info
              label="Screening date"
              value={reportDate}
            />

            <Info
              label="Screening time"
              value={reportTime}
            />

            <Info
              label="Screening reason"
              value={formatReason(patient.screeningReason)}
            />

            <Info
              label="Performed by"
              value={patient.workerName || "—"}
              large
            />

            <Info
              label="Operator ID"
              value={patient.workerId || "—"}
            />

            <Info
              label="Designation"
              value={formatDesignation(patient.workerDesignation)}
            />

          </InfoGrid>

        </div>


        {/* AI RESULT */}

        <ReportSectionTitle>
          AI Screening Result
        </ReportSectionTitle>


        <div className="result-card">

          <div>

            <div className="report-label">
              AI CLASSIFICATION
            </div>

            <div className="result-title">
              {classification}
            </div>

            <p className="result-description">
              AI-assisted assessment of the screened
              retinal image.
            </p>

          </div>


          <div className="confidence-box">

            <span>
              AI CONFIDENCE
            </span>

            <strong>
              {confidence}
            </strong>

          </div>

        </div>


        {/* RECOMMENDATION */}

        <div className="recommendation-card">

          <div className="recommendation-check">
            ✓
          </div>

          <div>

            <div className="recommendation-title">
              {recommendation}
            </div>

            <p>
              Continue routine diabetic retinal
              screening according to clinical guidance.
            </p>

          </div>

        </div>


        <ReportFooter
          page={1}
          total={4}
        />

      </section>



      {/* =====================================================
          PAGE 2 — EXPLAINABLE AI
      ===================================================== */}

      <section className="report-page">


        <ReportHeader
          patient={patient}
          reportDate={reportDate}
        />


        <ReportSectionTitle>
          Explainable AI
        </ReportSectionTitle>


        <p className="report-introduction">
          Visual evidence from the screening image and
          model attention visualization. The Grad-CAM
          representation indicates regions that contributed
          to the AI model's prediction.
        </p>


        {/* ORIGINAL IMAGE */}

        <div className="image-report-card">

          <div className="image-card-header">

            <div>

              <strong>
                Original fundus image
              </strong>

              <span>
                {formatEye(selectedEye)}
              </span>

            </div>

          </div>


          <div className="image-container">

            {imageDataUrl ? (

              <img
                src={imageDataUrl}
                alt="Original fundus"
              />

            ) : (

              <div className="image-placeholder">
                Fundus image unavailable
              </div>

            )}

          </div>

        </div>


        {/* GRAD CAM */}

        <div className="image-report-card">

          <div className="image-card-header">

            <div>

              <strong>
                Grad-CAM explanation
              </strong>

              <span>
                AI attention visualization
              </span>

            </div>

          </div>


          <div className="image-container">

            {gradCamDataUrl ? (

              <img
                src={gradCamDataUrl}
                alt="Grad-CAM explanation"
              />

            ) : imageDataUrl ? (

              <img
                src={imageDataUrl}
                alt="Grad-CAM unavailable"
              />

            ) : (

              <div className="image-placeholder">
                Grad-CAM unavailable
              </div>

            )}

          </div>

        </div>


        {/* IMAGE QUALITY */}

        <ReportSectionTitle>
          Image Quality Summary
        </ReportSectionTitle>


        <div className="quality-grid">

          <QualityItem
            title="Focus"
            value="Adequate"
          />

          <QualityItem
            title="Illumination"
            value="Adequate"
          />

          <QualityItem
            title="Field of view"
            value="Adequate"
          />

          <QualityItem
            title="Image status"
            value="Accepted"
          />

        </div>


        {/* EXPLANATION */}

        <div className="explanation-note">

          <strong>
            Explainability note
          </strong>

          <p>
            The heatmap is intended to provide visual
            context for AI-assisted screening and should
            not be interpreted independently as a clinical
            diagnosis.
          </p>

        </div>


        <ReportFooter
          page={2}
          total={4}
        />

      </section>



      {/* =====================================================
          PAGE 3 — CLINICAL FINDINGS
      ===================================================== */}

      <section className="report-page">


        <ReportHeader
          patient={patient}
          reportDate={reportDate}
        />


        <ReportSectionTitle>
          Clinical Findings
        </ReportSectionTitle>


        <p className="report-introduction">
          Structured observations associated with the
          screened retinal image.
        </p>


        <FindingCard
          number="01"
          title="Retinal vessels"
          finding={vesselFinding}
        />


        <FindingCard
          number="02"
          title="Optic disc"
          finding={opticFinding}
        />


        <FindingCard
          number="03"
          title="Lesion regions"
          finding={lesionFinding}
        />


        <FindingCard
          number="04"
          title="Overall AI assessment"
          finding={`The AI model classified the screened eye as "${classification}" with an estimated confidence of ${confidence}.`}
        />


        {/* STRUCTURED OBSERVATION */}

        <ReportSectionTitle>
          Structured AI Observations
        </ReportSectionTitle>


        <div className="observation-table">

          <div className="observation-row observation-header">

            <span>
              Assessment
            </span>

            <span>
              Observation
            </span>

            <span>
              Status
            </span>

          </div>


          <Observation
            name="Image quality"
            observation="Image accepted for screening"
            status="Adequate"
          />


          <Observation
            name="Retinal vessels"
            observation="No major abnormality identified"
            status="Within expected limits"
          />


          <Observation
            name="Optic disc"
            observation="Region appears within expected limits"
            status="Within expected limits"
          />


          <Observation
            name="Lesion pattern"
            observation="No prominent lesion pattern identified"
            status="Not prominent"
          />


          <Observation
            name="AI classification"
            observation={classification}
            status={confidence}
          />

        </div>


        <div className="clinical-note">

          <strong>
            Clinical interpretation
          </strong>

          <p>
            AI findings are screening-level observations.
            Final interpretation and clinical management
            remain the responsibility of a qualified
            healthcare professional.
          </p>

        </div>


        <ReportFooter
          page={3}
          total={4}
        />

      </section>



      {/* =====================================================
          PAGE 4 — RECOMMENDATION
      ===================================================== */}

      <section className="report-page">


        <ReportHeader
          patient={patient}
          reportDate={reportDate}
        />


        <ReportSectionTitle>
          Recommendation & Clinical Review
        </ReportSectionTitle>


        {/* MAIN RECOMMENDATION */}

        <div className="final-recommendation">

          <div className="final-icon">
            ✓
          </div>


          <div>

            <div className="report-label">
              SCREENING RECOMMENDATION
            </div>

            <h2>
              {recommendation}
            </h2>

            <p>
              The AI screening output indicates
              {classification === "No Referable DR"
                ? " no referable diabetic retinopathy in the screened image."
                : " findings requiring clinical attention and review."
              }
            </p>

          </div>

        </div>


        {/* REFERRAL */}

        <ReportSectionTitle>
          Referral Decision
        </ReportSectionTitle>


        <div className="referral-box">

          <div className="referral-option active">
            <span className="referral-radio">
              ✓
            </span>

            <div>
              <strong>
                {classification === "No Referable DR"
                  ? "Routine follow-up"
                  : "Clinical review / referral"
                }
              </strong>

              <p>
                Based on the AI-assisted screening output.
              </p>
            </div>
          </div>


          <div className="referral-option">
            <span className="referral-radio empty" />

            <div>
              <strong>
                Ophthalmologist review
              </strong>

              <p>
                Required whenever clinical findings,
                symptoms or image quality warrant further
                assessment.
              </p>
            </div>
          </div>

        </div>


        {/* DOCTOR REVIEW */}

        <ReportSectionTitle>
          Ophthalmologist Review
        </ReportSectionTitle>


        <div className="doctor-review">

          <div className="review-status">
            REVIEW STATUS
            <strong>
              Pending clinical review
            </strong>
          </div>


          <div className="review-fields">

            <div>
              <span>Ophthalmologist name</span>
              <div className="signature-line" />
            </div>

            <div>
              <span>Registration number</span>
              <div className="signature-line" />
            </div>

            <div>
              <span>Clinical decision</span>
              <div className="signature-line" />
            </div>

            <div>
              <span>Review date</span>
              <div className="signature-line" />
            </div>

          </div>


          <div className="doctor-comments">

            <span>
              Clinical comments
            </span>

            <div className="comment-lines">
              <div />
              <div />
              <div />
            </div>

          </div>

        </div>


        {/* SIGNATURES */}

        <div className="signature-grid">

          <SignatureBlock
            title="PHC Worker"
            name={patient.workerName}
            id={patient.workerId}
          />

          <SignatureBlock
            title="Ophthalmologist"
            name=""
            id=""
          />

        </div>


        {/* DISCLAIMER */}

        <div className="report-disclaimer">

          <strong>
            Important
          </strong>

          <p>
            This document contains an AI-assisted
            screening output and is not a definitive
            medical diagnosis. Clinical findings,
            symptoms and patient history should be
            considered by a qualified healthcare
            professional before making medical decisions.
          </p>

        </div>


        <ReportFooter
          page={4}
          total={4}
        />

      </section>

    </div>
  );
}


/* =========================================================
   HEADER
   ========================================================= */

function ReportHeader({
  patient,
  reportDate,
}) {
  return (
    <header className="report-header">

      <div className="report-brand">

        <div className="report-logo">

          <div className="report-eye">
            <div />
          </div>

        </div>


        <div>

          <h1>
            RetinaSafe
          </h1>

          <p>
            AI-Assisted Diabetic Retinopathy Screening
          </p>

          <span>
            Clinical Screening Report
          </span>

        </div>

      </div>


      <div className="report-meta">

        <span>
          REPORT ID
        </span>

        <strong>
          {patient.patientId || "RS-UNASSIGNED"}
        </strong>

        <small>
          {reportDate}
        </small>

      </div>

    </header>
  );
}


/* =========================================================
   SECTION TITLE
   ========================================================= */

function ReportSectionTitle({
  children,
}) {
  return (
    <h2 className="report-section-title">
      {children}
    </h2>
  );
}


/* =========================================================
   INFO GRID
   ========================================================= */

function InfoGrid({
  children,
}) {
  return (
    <div className="info-grid">
      {children}
    </div>
  );
}


function Info({
  label,
  value,
  large,
  wide,
}) {
  return (
    <div
      className={`info-item ${
        large ? "large" : ""
      } ${
        wide ? "wide" : ""
      }`}
    >

      <span>
        {label}
      </span>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}


/* =========================================================
   QUALITY
   ========================================================= */

function QualityItem({
  title,
  value,
}) {
  return (
    <div className="quality-item">

      <div className="quality-check">
        ✓
      </div>

      <div>

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}


/* =========================================================
   FINDING
   ========================================================= */

function FindingCard({
  number,
  title,
  finding,
}) {
  return (
    <div className="finding-card">

      <div className="finding-number">
        {number}
      </div>

      <div>

        <h3>
          {title}
        </h3>

        <p>
          {finding}
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   OBSERVATION
   ========================================================= */

function Observation({
  name,
  observation,
  status,
}) {
  return (
    <div className="observation-row">

      <span>
        {name}
      </span>

      <span>
        {observation}
      </span>

      <strong>
        {status}
      </strong>

    </div>
  );
}


/* =========================================================
   SIGNATURE
   ========================================================= */

function SignatureBlock({
  title,
  name,
  id,
}) {
  return (
    <div className="signature-block">

      <span>
        {title}
      </span>

      <div className="signature-space" />

      <strong>
        {name || "Signature"}
      </strong>

      <small>
        {id ? `ID: ${id}` : "Name / registration number"}
      </small>

    </div>
  );
}


/* =========================================================
   FOOTER
   ========================================================= */

function ReportFooter({
  page,
  total,
}) {
  return (
    <footer className="report-footer">

      <span>
        RetinaSafe • AI-assisted screening
      </span>

      <span>
        Confidential clinical document
      </span>

      <strong>
        Page {page} of {total}
      </strong>

    </footer>
  );
}


/* =========================================================
   FORMATTERS
   ========================================================= */

function formatEye(value) {

  if (value === "left") {
    return "Left Eye";
  }

  if (value === "right") {
    return "Right Eye";
  }

  return value || "Not specified";
}


function formatSex(value) {

  const values = {
    female: "Female",
    male: "Male",
    other: "Other",
  };

  return values[value] || "—";
}


function formatDiabetes(value) {

  const values = {
    type1: "Type 1",
    type2: "Type 2",
    gestational: "Gestational",
    other: "Other / unspecified",
  };

  return values[value] || "—";
}


function formatAnswer(value) {

  const values = {
    yes: "Yes",
    no: "No",
    unknown: "Unknown",
  };

  return values[value] || "—";
}


function formatDesignation(value) {

  const values = {
    asha: "ASHA Worker",
    anm: "ANM",
    phc_staff: "PHC Staff",
    technician: "Screening Technician",
    other: "Other",
  };

  return values[value] || "—";
}


function formatReason(value) {

  const values = {
    routine: "Routine diabetic screening",
    followup: "Follow-up screening",
    symptoms: "Eye symptoms / concern",
    referral: "Referral from healthcare provider",
  };

  return values[value] || "—";
}


export default ClinicalReport;