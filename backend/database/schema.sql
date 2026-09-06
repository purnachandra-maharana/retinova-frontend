-- ============================================
-- RetinaSafe Database Schema
-- ============================================

CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    dob DATE,
    age INTEGER,
    sex VARCHAR(20),
    phone VARCHAR(30),
    address TEXT,
    village VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),

    diabetes_type VARCHAR(50),
    diabetes_since VARCHAR(50),
    treatment TEXT,
    hba1c NUMERIC(4,1),
    previous_dr VARCHAR(100),
    previous_eye_treatment TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE screenings (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) UNIQUE NOT NULL,

    patient_id INTEGER NOT NULL
        REFERENCES patients(id)
        ON DELETE CASCADE,

    clinic_name VARCHAR(150),
    clinic_id VARCHAR(50),
    clinic_location TEXT,
    clinic_phone VARCHAR(30),

    worker_name VARCHAR(150),
    worker_id VARCHAR(50),
    worker_designation VARCHAR(100),

    eye VARCHAR(20) NOT NULL,
    screening_reason TEXT,

    status VARCHAR(30) DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE screening_images (
    id SERIAL PRIMARY KEY,

    screening_id INTEGER NOT NULL
        REFERENCES screenings(id)
        ON DELETE CASCADE,

    original_path TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE ai_results (
    id SERIAL PRIMARY KEY,

    screening_id INTEGER UNIQUE NOT NULL
        REFERENCES screenings(id)
        ON DELETE CASCADE,

    quality_status VARCHAR(50),
    quality_score NUMERIC(5,2),

    dr_level INTEGER,
    classification VARCHAR(100),
    confidence NUMERIC(5,4),

    gradcam_path TEXT,

    processing_status VARCHAR(30) DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE clinical_findings (
    id SERIAL PRIMARY KEY,

    screening_id INTEGER NOT NULL
        REFERENCES screenings(id)
        ON DELETE CASCADE,

    finding_type VARCHAR(80) NOT NULL,
    finding_value TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE doctor_reviews (
    id SERIAL PRIMARY KEY,

    screening_id INTEGER NOT NULL
        REFERENCES screenings(id)
        ON DELETE CASCADE,

    reviewer_name VARCHAR(150),
    decision VARCHAR(100) NOT NULL,
    notes TEXT,
    referral_status VARCHAR(50),

    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);