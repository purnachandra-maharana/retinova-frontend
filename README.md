\# Retinova



\## Explainable AI-Assisted Diabetic Retinopathy Screening Platform



Retinova is an AI-assisted diabetic retinopathy screening platform designed to support connected rural healthcare workflows.



The system enables:



\- Patient registration and screening

\- Fundus image capture and upload

\- Retinal image quality assessment

\- Diabetic retinopathy classification

\- MATLAB-based retinal analysis

\- Grad-CAM based explainability

\- Ophthalmologist review

\- Clinical findings and referral workflow

\- Clinical report generation



\## System Workflow



PHC Worker

↓

Patient Registration

↓

Fundus Image Capture

↓

Image Quality Assessment

↓

MATLAB Retinal Analysis

↓

DR Classification

↓

Grad-CAM Explainability

↓

Screening Result

↓

Ophthalmologist Review

↓

Clinical Decision

↓

Clinical Report



\## Technology Stack



\### Frontend

\- React

\- Vite

\- Tailwind CSS



\### Backend

\- Node.js

\- Express.js

\- PostgreSQL



\### AI / Image Analysis

\- MATLAB

\- Diabetic Retinopathy Classification

\- Grad-CAM Explainability



\### Deployment

\- Vercel — Frontend

\- Render — Backend



\## Project Structure



```text

SIH MATLAB PROJECT/

├── frontend/

├── backend/

├── MATLAB/

└── README.md
```

## Deployment hardening

MATLAB portability, GPU/CPU fallback, model and Grad-CAM checks, output
privacy, Simulink safety, and generated-artifact cleanup are documented in
[`docs/DEPLOYMENT_HARDENING.md`](docs/DEPLOYMENT_HARDENING.md).
