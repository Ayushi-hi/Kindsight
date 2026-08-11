Kindsight — Detection from Chest X-Rays

An end-to-end AI-assisted radiology review tool for chest X-rays.

Kindsight lets a user upload a chest X-ray and receive a pneumonia likelihood score, an optional 14-condition multi-disease screen, Grad-CAM visual explainability, an AI-generated report grounded in retrieved medical reference material, and follow-up chat — all behind authentication with per-user scan visibility.

MVP scope: one primary disease (pneumonia) and one modality (chest X-ray), with the goal of proving the complete pipeline end to end before expanding the scope.

Important: Kindsight is designed as a triage / second-reader assistant, not an autonomous diagnostic tool. Reports and chat responses include an explicit clinical-correlation caveat.

1. Problem Statement

Radiologists face increasing caseloads, and delayed or missed pneumonia findings on chest X-rays can meaningfully affect patient outcomes, particularly in high-volume or resource-constrained settings. Existing commercial AI triage tools demonstrate that AI-assisted second reads can help flag urgent cases faster, but many are closed, expensive, single-purpose systems.

Kindsight explores whether a single, coherent pipeline — detection, visual explainability, retrieval-grounded report generation, and conversational follow-up — can be built as an open, inspectable system using a widely available public dataset and free/low-cost tooling throughout.

2. What Was Built

Component

Status

Chest X-ray upload (PNG/JPG/DICOM)

✅ Working

Pneumonia detection (EfficientNet-B0, trained from scratch on RSNA data)

✅ Working

14-condition multi-label screening (EfficientNet-B0, NIH ChestX-ray14)

✅ Working

Grad-CAM visual explainability (both pipelines)

✅ Working

Confidence calibration (temperature scaling)

✅ Working

RAG-grounded report generation (LLM + retrieved reference material)

✅ Working

Conversational chat assistant, grounded in the same knowledge base

✅ Working

Real authentication (JWT + bcrypt), email-based password reset

✅ Working

Per-user scan visibility

✅ Working

Reports, Chat Assistant, Knowledge Base, and Settings pages

✅ Working

Next.js frontend, fully wired to live backend

✅ Working

Dockerized deployment (FastAPI + MongoDB + ChromaDB)

✅ Working

3. System Architecture

┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                            │
│                                                                     │
│ Login/Signup │ Dashboard │ Scan Result │ Reports │ Chat Assistant  │
│ Knowledge Base │ Settings                                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                     REST (JSON / multipart)
                         JWT bearer auth
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          FastAPI Backend                             │
│                                                                     │
│ Auth → Upload → Predict → Grad-CAM → Report → Chat                │
│        │          │                 │          │                   │
│        │          └─ Single +       │          └─ RAG + LLM        │
│        │             Multi-label    └─ RAG + LLM                   │
│        │                                                             │
│        └─ All data and operations are scoped to the authenticated   │
│           user                                                       │
└──────────────┬────────────────┬────────────────┬────────────────────┘
               │                │                │
               ▼                ▼                ▼
        ┌────────────┐   ┌────────────┐   ┌────────────────┐
        │  MongoDB   │   │  ChromaDB  │   │ Trained Models │
        │            │   │            │   │                │
        │ users      │   │ 32 curated │   │ checkpoints    │
        │ scans      │   │ pneumonia  │   │ (.pt)          │
        │ predictions│   │ reference  │   │ calibration    │
        │ reports    │   │ chunks     │   │ temperature    │
        │ chat       │   │            │   │ file           │
        └────────────┘   └────────────┘   └────────────────┘
               │
               ▼
        ┌────────────────┐
        │ Local Storage  │
        │ images         │
        │ heatmaps       │
        └────────────────┘

Inference Flow

The uploaded image is saved.

EfficientNet-B0 performs the forward pass.

The model logit is divided by the fitted calibration temperature.

A sigmoid produces the calibrated confidence score.

Grad-CAM performs a backward pass to generate a heatmap overlay.

The report service retrieves the most relevant chunks from ChromaDB based on the prediction.

An LLM (via OpenRouter free-tier models) drafts Findings / Impression / Recommendation using the retrieved context.

The chat assistant reuses the same retrieval + LLM pattern for follow-up questions.

4. Machine Learning Details

Pneumonia Model

Architecture: EfficientNet-B0 (via timm), fine-tuned from ImageNet pretrained weights, with a binary classification head and sigmoid output.

Dataset: RSNA Pneumonia Detection Challenge, approximately 26,700 chest X-rays with a 22.5% pneumonia-positive rate.

Split: 18,678 train / 4,003 validation / 4,003 test, stratified by label.

Preprocessing: CLAHE contrast enhancement, resize to 224×224, and ImageNet normalization.

Augmentation: rotation, brightness/contrast jitter, and Gaussian noise. No horizontal flip is used because chest X-rays have real anatomical laterality.

Training: 9 epochs, early stopping with patience 4, AdamW optimizer, and BCE loss.

14-Condition Multi-Label Model

Architecture: EfficientNet-B0 with a multi-label head containing 14 independent sigmoid outputs.

Dataset: NIH ChestX-ray14, full 112,118-image dataset using NIH's official patient-level split.

Result: Macro AUROC 0.7862, with a per-class range of approximately 0.68 (Infiltration) to approximately 0.91 (Hernia, low sample support).

Runs as a separate pipeline from the pneumonia model, with separate endpoints and MongoDB-tagged records.

Main Result

Pneumonia model held-out test AUROC: 0.8831

The test set was not used for early-stopping decisions, avoiding validation-set leakage into this metric.

Confidence Calibration

Confidence scores are calibrated using temperature scaling (Guo et al., 2017).

A single scalar is fitted on the held-out validation split and divides the model logits before the sigmoid is applied.

Fitted temperature: 1.2893

Validation AUROC: 0.8813 before calibration

Validation AUROC: 0.8813 after calibration

This preserves prediction ranking while changing the confidence magnitude. If the calibration file is missing, the backend falls back to an uncalibrated T=1.0.

Explainability

Grad-CAM heatmaps are generated from the last convolutional block.

They were spot-checked against multiple in-distribution RSNA images. Hot zones generally localized to plausible lung regions, although this was a small sanity check rather than a systematic evaluation.

5. RAG Knowledge Base

Kindsight contains 32 original, curated reference chunks covering pneumonia radiology topics such as:

consolidation

air bronchograms

ground-glass opacities

severity assessment

risk factors

treatment overview

limitations of chest X-ray sensitivity

The material was written specifically for this project rather than scraped from external sources, reducing copyright and licensing risk.

Embeddings are generated with BAAI/bge-small-en-v1.5 and stored in ChromaDB. The knowledge base is browsable from the in-app Knowledge Base page.

Production consideration: A production system would replace or supplement this curated set with properly licensed medical literature, such as PubMed abstracts or licensed clinical guidelines.

6. Tech Stack

Layer

Technology

Frontend

Next.js 14 (App Router), TypeScript, Tailwind CSS

Backend

FastAPI, Python 3.12

Authentication

JWT (PyJWT) + bcrypt

Email

Gmail SMTP

Database

MongoDB

Vector Store

ChromaDB

ML

PyTorch, timm, pytorch-grad-cam, pydicom, OpenCV

LLM

OpenRouter (OpenAI-compatible API), free-tier models

Deployment

Docker Compose

7. Project Structure

Kindsight/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth
│   │   │   ├── upload
│   │   │   ├── predict
│   │   │   ├── predict-multi
│   │   │   ├── report
│   │   │   ├── report-multi
│   │   │   ├── reports
│   │   │   ├── knowledge
│   │   │   └── chat
│   │   ├── services/
│   │   │   ├── inference
│   │   │   ├── gradcam
│   │   │   ├── report
│   │   │   ├── RAG
│   │   │   ├── chat
│   │   │   └── email
│   │   ├── core/
│   │   │   ├── settings/config
│   │   │   ├── JWT security
│   │   │   └── auth dependency
│   │   ├── models/
│   │   │   └── Pydantic schemas
│   │   └── db/
│   │       ├── MongoDB connection
│   │       └── ChromaDB connection
│   │
│   ├── ml_models/
│   │   ├── trained model checkpoints
│   │   └── calibration temperature file
│   │
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── login
│   │   ├── signup
│   │   ├── forgot/reset-password
│   │   ├── dashboard
│   │   ├── scan
│   │   ├── scan-multi
│   │   ├── scans
│   │   ├── reports
│   │   ├── chat
│   │   └── knowledge
│   ├── components/
│   │   ├── AppShell
│   │   ├── Sidebar
│   │   ├── upload
│   │   ├── heatmap viewers
│   │   ├── report card
│   │   └── chat window
│   └── lib/
│       ├── api.ts
│       └── auth.ts
│
├── ml/
│   ├── training/
│   │   ├── dataset
│   │   ├── augmentations
│   │   ├── training script
│   │   └── calibrate.py
│   ├── inference/
│   │   └── standalone prediction / Grad-CAM scripts
│   └── notebooks/
│       └── Colab notebooks for GPU training
│
└── docker-compose.yml

8. Running the Project

See ml/README.md for instructions on training the model from scratch using Colab.

Once a trained checkpoint exists, run the full application as follows.

1. Start the backend and databases

# From the project root
docker compose up --build -d

2. Start the frontend

cd frontend
npm install
npm run dev

3. Open the application

Frontend: http://localhost:3000/login

Backend API docs: http://localhost:8000/docs

Sign up for an account first.

Environment Variables

Create backend/.env with the required configuration:

# Database / RAG
MONGODB_URI=...
CHROMA_HOST=...
CHROMA_PORT=...

# Models
USE_MOCK_MODEL=false
MODEL_PATH=...
USE_MULTILABEL_MODEL=false
MULTILABEL_MODEL_PATH=...

# LLM
OPENROUTER_API_KEY=...

# Authentication
JWT_SECRET_KEY=...
JWT_ALGORITHM=...
ACCESS_TOKEN_EXPIRE_MINUTES=...

# SMTP
SMTP_HOST=...
SMTP_PORT=...
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=...
SMTP_FROM_NAME=...
FRONTEND_BASE_URL=...

SMTP_PASSWORD must be a Gmail App Password, not the account's normal password.

Security: Never commit .env files, API keys, passwords, model secrets, or other credentials to GitHub.

Recalibrating a Retrained Model

To run calibration on a newly retrained pneumonia model, see:

ml/training/calibrate.py

The script writes a _temperature.txt file next to the checkpoint, which the backend automatically picks up after restart.

9. Honest Limitations

Being direct about limitations matters more than pretending they do not exist.

Shared Clinical Workspace

Every scan records an owner_id, and list/detail views are scoped to the requesting user. However, this is a simplification rather than a complete multi-tenant architecture and would require stronger isolation for stricter production environments.

Limited Grad-CAM Evaluation

Grad-CAM was visually verified on a handful of examples rather than through a systematic evaluation across many images or against ground-truth bounding boxes.

Out-of-Distribution Behavior

Out-of-distribution behavior is unreliable. A non-RSNA-distribution test image produced a Grad-CAM heatmap concentrated on an image border rather than lung tissue.

This is a known limitation of a model trained on a single standardized dataset.

Calibration Does Not Improve Accuracy

Temperature scaling improves the reliability of confidence values, not classification accuracy.

The fitted temperature is 1.2893. Calibration changes how confident the model is, but does not change which cases it predicts correctly or incorrectly.

14-Condition Model Performance

The 14-condition model has lower per-class performance than the pneumonia binary model:

Macro AUROC: 0.7862

Some classes, such as Infiltration, are around 0.68

This is a known consequence of the weaker, NLP-derived labels in NIH ChestX-ray14 compared with the RSNA dataset.

RAG Knowledge Base

The current knowledge base is a curated placeholder rather than licensed medical literature. It demonstrates the retrieval-grounded pipeline but is not a substitute for a properly sourced clinical knowledge base.

Email Infrastructure

Password reset currently relies on a single Gmail SMTP account. This is acceptable for a demo or small-scale deployment but would not be appropriate for high-volume production transactional email.

10. Research Angle

The most interesting research component is not pneumonia detection itself, which is already well studied. The stronger research angle is the combination of:

calibrated confidence

Grad-CAM visual explainability

retrieval-grounded report generation

conversational follow-up

evaluation of whether generated report text is consistent with the visual evidence highlighted by Grad-CAM

A useful research question is:

Does the language in an LLM-generated radiology report remain consistent with the visual evidence that the underlying vision model actually attends to?

This consistency check provides a reasonable direction for a research paper or extended project study.

11. Acknowledgments

Datasets: RSNA Pneumonia Detection Challenge (Radiological Society of North America, via Kaggle); NIH ChestX-ray14 (National Institutes of Health Clinical Center)

Base architecture: EfficientNet (Tan & Le, 2019), via the timm library

Grad-CAM: Selvaraju et al., 2017, via the pytorch-grad-cam library

Temperature scaling: Guo et al., 2017, On Calibration of Modern Neural Networks
