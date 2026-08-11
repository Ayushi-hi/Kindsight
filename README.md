<div align="center">

# 🩺 Kindsight

### AI-Assisted Chest X-Ray Review & Radiology Intelligence

**Detect • Explain • Retrieve • Report • Converse**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-ML-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-RAG-FF6B35)](https://www.trychroma.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Status](https://img.shields.io/badge/Status-MVP-success)](#project-status)

<br/>

> **Kindsight is an AI-assisted radiology review MVP that combines chest X-ray classification, calibrated confidence, Grad-CAM explainability, retrieval-augmented generation (RAG), AI-assisted reporting, and conversational follow-up in one end-to-end application.**

</div>

---

## 📌 Project Banner

<div align="center">

### 🩻 From X-Ray → Prediction → Explanation → Evidence → Report

```text
┌──────────────────┐
│   Chest X-Ray    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ EfficientNet-B0  │
│   Prediction     │
└────────┬─────────┘
         │
         ├──────────────► Confidence Calibration
         │
         ▼
┌──────────────────┐
│    Grad-CAM      │
│ Visual Evidence  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│    ChromaDB      │◄──────►│  Curated Medical │
│   RAG Retrieval  │       │    Knowledge     │
└────────┬─────────┘       └──────────────────┘
         │
         ▼
┌──────────────────┐
│ LLM Report +     │
│ Chat Assistant   │
└──────────────────┘
```

</div>

---

## 🧠 What is Kindsight?

Kindsight is an end-to-end **AI-assisted radiology review system** focused on chest X-rays.

A user can:

1. Upload a chest X-ray in PNG, JPG, or DICOM format.
2. Run a pneumonia prediction.
3. Optionally run a 14-condition multi-label screen.
4. View a calibrated confidence score.
5. See a Grad-CAM heatmap showing where the model focused.
6. Generate a retrieval-grounded radiology-style report.
7. Ask follow-up questions through a conversational assistant.
8. Review scans and reports through an authenticated dashboard.

The project is intentionally positioned as a **triage / second-reader assistant**, not an autonomous diagnostic system.

---

# ✨ Features

| Feature | Description | Status |
|---|---|:---:|
| 🩻 Chest X-Ray Upload | PNG, JPG, and DICOM support | ✅ |
| 🫁 Pneumonia Detection | EfficientNet-B0 binary classifier | ✅ |
| 🔬 Multi-Disease Screening | 14-condition NIH ChestX-ray14 pipeline | ✅ |
| 🔥 Grad-CAM | Visual model explainability | ✅ |
| 🎯 Confidence Calibration | Temperature-scaled confidence scores | ✅ |
| 📚 RAG Knowledge Base | 32 curated medical reference chunks | ✅ |
| 🤖 AI Report Generation | Retrieval-grounded Findings / Impression / Recommendation | ✅ |
| 💬 AI Chat Assistant | Follow-up questions using the same RAG pipeline | ✅ |
| 🔐 Authentication | JWT + bcrypt authentication | ✅ |
| 📧 Password Reset | Email-based reset flow | ✅ |
| 👤 Per-User Scan Visibility | User-scoped scan and report access | ✅ |
| 🖥️ Next.js Dashboard | Frontend wired to the live backend | ✅ |
| 🐳 Docker Deployment | FastAPI + MongoDB + ChromaDB | ✅ |

---

# 🏗️ System Architecture

```text
                              KINDSIGHT
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS FRONTEND                             │
│                                                                      │
│ Login │ Signup │ Dashboard │ Scan │ Reports │ Chat │ Knowledge Base │
│                              Settings                                │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                         REST / JSON / Multipart
                           JWT Bearer Authentication
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          FASTAPI BACKEND                              │
│                                                                      │
│  Authentication                                                      │
│       │                                                              │
│       ▼                                                              │
│  Upload → Prediction → Calibration → Grad-CAM                        │
│                         │                 │                           │
│                         │                 ▼                           │
│                         │            Heatmap                          │
│                         ▼                                             │
│                    RAG Retrieval                                      │
│                         │                                             │
│                         ▼                                             │
│                    LLM Report                                         │
│                         │                                             │
│                         ▼                                             │
│                    Chat Assistant                                    │
└──────────────┬───────────────────┬────────────────────┬──────────────┘
               │                   │                    │
               ▼                   ▼                    ▼
        ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
        │   MongoDB   │     │  ChromaDB   │     │  ML Checkpoints │
        │             │     │             │     │                 │
        │ users       │     │ 32 curated  │     │ EfficientNet-B0 │
        │ scans       │     │ references  │     │ .pt checkpoints │
        │ predictions │     │ embeddings  │     │ calibration     │
        │ reports     │     │             │     │ temperature     │
        │ chat        │     │             │     │                 │
        └─────────────┘     └─────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌────────────────┐
                                               │ Local Storage  │
                                               │ X-rays         │
                                               │ Heatmaps       │
                                               └────────────────┘
```

## 🔄 Inference Pipeline

```text
Chest X-Ray
    │
    ▼
Image Saved
    │
    ▼
EfficientNet-B0 Forward Pass
    │
    ▼
Temperature Scaling
    │
    ▼
Sigmoid Confidence
    │
    ├──────────────► Prediction
    │
    ▼
Grad-CAM Backward Pass
    │
    ▼
Heatmap Overlay
    │
    ▼
ChromaDB Top-K Retrieval
    │
    ▼
LLM + Retrieved Context
    │
    ▼
Findings / Impression / Recommendation
    │
    ▼
Follow-up Chat using the same RAG context
```

---

# 🖥️ Screenshots

> Add your real application screenshots to `docs/screenshots/` and update the filenames below.

### 🔐 Authentication

![Login](docs/screenshots/login.png)

### 📊 Dashboard

![Dashboard](docs/screenshots/dashboard.png)

### 🩻 Scan & Prediction

![Scan Result](docs/screenshots/scan-result.png)

### 🔥 Grad-CAM Explainability

![Grad-CAM](docs/screenshots/gradcam.png)

### 📄 AI-Generated Report

![Report](docs/screenshots/report.png)

### 💬 AI Chat Assistant

![Chat](docs/screenshots/chat.png)

### 📚 Knowledge Base

![Knowledge Base](docs/screenshots/knowledge-base.png)

---

# 🎬 Demo

## Typical User Journey

```text
1. Create account
       ↓
2. Upload chest X-ray
       ↓
3. Run pneumonia / multi-label prediction
       ↓
4. View calibrated confidence
       ↓
5. Inspect Grad-CAM heatmap
       ↓
6. Generate evidence-grounded report
       ↓
7. Ask follow-up questions
       ↓
8. Review scan history and reports
```

> **Demo note:** No public live-demo URL is claimed here because the supplied project documentation does not provide one.

---

# 🧰 Tech Stack

## Frontend

- **Next.js 14** — App Router
- **TypeScript**
- **Tailwind CSS**

## Backend

- **FastAPI**
- **Python 3.12**
- REST API
- JWT authentication
- bcrypt password hashing
- Gmail SMTP password-reset flow

## Machine Learning

- **PyTorch**
- **EfficientNet-B0**
- **timm**
- **pytorch-grad-cam**
- **OpenCV**
- **pydicom**

## Data & Retrieval

- **MongoDB** — users, scans, predictions, reports, chat persistence
- **ChromaDB** — vector storage for the RAG knowledge base
- **BAAI/bge-small-en-v1.5** — embedding model

## Generative AI

- **OpenRouter**
- OpenAI-compatible API
- Free-tier LLM models

## Deployment

- **Docker**
- **Docker Compose**

---

# 🧪 Machine Learning

## 1. Pneumonia Detection

### Model

**EfficientNet-B0**

The pneumonia pipeline uses EfficientNet-B0 with a binary classification head.

### Dataset

**RSNA Pneumonia Detection Challenge**

- Approximately 26,700 chest X-rays
- Approximately 22.5% pneumonia-positive
- Stratified split

### Dataset Split

| Split | Images |
|---|---:|
| Train | 18,678 |
| Validation | 4,003 |
| Test | 4,003 |

### Preprocessing

- CLAHE contrast enhancement
- Resize to `224 × 224`
- ImageNet normalization

### Augmentation

- Rotation
- Brightness / contrast jitter
- Gaussian noise
- No horizontal flip due to anatomical laterality

---

# 📈 ML Results

## Pneumonia Model

| Metric | Result |
|---|---:|
| Test AUROC | **0.8831** |
| Validation AUROC | **0.8813** |
| Calibration Temperature | **1.2893** |

The held-out test set was not used for early-stopping decisions.

## 14-Condition Multi-Label Model

The second pipeline uses EfficientNet-B0 with 14 independent sigmoid outputs on NIH ChestX-ray14.

| Metric | Result |
|---|---:|
| Macro AUROC | **0.7862** |
| Lowest reported class range | ~0.68 |
| Highest reported class range | ~0.91 |

The two model pipelines remain separate, with separate endpoints and MongoDB-tagged records.

---

# 🎯 Confidence Calibration

Kindsight applies **temperature scaling** to improve the reliability of model confidence values.

```text
Raw Logit
   │
   ▼
Logit / Temperature
   │
   ▼
Sigmoid
   │
   ▼
Calibrated Confidence
```

The fitted temperature for the pneumonia model is:

```text
T = 1.2893
```

Calibration does **not** change the prediction ranking. It changes the confidence magnitude.

If the calibration file is unavailable, the backend falls back to:

```text
T = 1.0
```

---

# 🔥 Explainability with Grad-CAM

Kindsight uses **Grad-CAM** to produce visual heatmaps from the model's last convolutional block.

The objective is to provide a visual indication of which regions contributed to the model's prediction.

The current evaluation is a **sanity check**, not a systematic localization benchmark.

---

# 📚 RAG Knowledge Base

Kindsight contains **32 original curated reference chunks** covering topics including:

- Pneumonia radiology
- Consolidation
- Air bronchograms
- Ground-glass opacities
- Severity assessment
- Risk factors
- Treatment overview
- Chest X-ray sensitivity limitations

The knowledge base is embedded using:

```text
BAAI/bge-small-en-v1.5
```

and stored in:

```text
ChromaDB
```

### Report Generation

```text
Prediction
    ↓
Retrieve relevant medical context
    ↓
Combine prediction + retrieved context
    ↓
LLM
    ↓
Findings
Impression
Recommendation
```

> For production use, the current curated knowledge base should be replaced or supplemented with properly licensed medical literature and clinical guidelines.

---

# 🤖 AI Chat Assistant

The chat assistant uses the same retrieval-grounded approach as report generation.

```text
User Question
     ↓
Retrieve relevant knowledge
     ↓
Build grounded context
     ↓
LLM
     ↓
Response
```

This allows follow-up questions to remain connected to the same knowledge base used by the reporting pipeline.

---

# 📁 Project Structure

```text
Kindsight/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── upload/
│   │   │   ├── predict/
│   │   │   ├── predict-multi/
│   │   │   ├── report/
│   │   │   ├── report-multi/
│   │   │   ├── reports/
│   │   │   ├── knowledge/
│   │   │   └── chat/
│   │   │
│   │   ├── services/
│   │   │   ├── inference/
│   │   │   ├── gradcam/
│   │   │   ├── report/
│   │   │   ├── RAG/
│   │   │   ├── chat/
│   │   │   └── email/
│   │   │
│   │   ├── core/
│   │   │   ├── settings/
│   │   │   ├── JWT security/
│   │   │   └── auth dependency/
│   │   │
│   │   ├── models/
│   │   └── db/
│   │
│   ├── ml_models/
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot/reset-password/
│   │   ├── dashboard/
│   │   ├── scan/
│   │   ├── scan-multi/
│   │   ├── scans/
│   │   ├── reports/
│   │   ├── chat/
│   │   └── knowledge/
│   │
│   ├── components/
│   └── lib/
│
├── ml/
│   ├── training/
│   │   ├── dataset/
│   │   ├── augmentations/
│   │   ├── training script/
│   │   └── calibrate.py
│   │
│   ├── inference/
│   └── notebooks/
│
├── docs/
│   └── screenshots/
│
└── docker-compose.yml
```

---

# 🚀 Installation

## Prerequisites

Make sure you have:

- Python 3.12
- Node.js / npm
- Docker
- Docker Compose
- A MongoDB configuration
- An OpenRouter API key if using the LLM pipeline

## 1. Clone the Repository

```bash
git clone https://github.com/Ayushi-hi/Kindsight.git
cd Kindsight
```

## 2. Configure Backend Environment

Create:

```text
backend/.env
```

Example:

```env
MONGODB_URI=...

CHROMA_HOST=...
CHROMA_PORT=...

USE_MOCK_MODEL=false
MODEL_PATH=...
USE_MULTILABEL_MODEL=false
MULTILABEL_MODEL_PATH=...

OPENROUTER_API_KEY=...

JWT_SECRET_KEY=...
JWT_ALGORITHM=...
ACCESS_TOKEN_EXPIRE_MINUTES=...

SMTP_HOST=...
SMTP_PORT=...
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=...
SMTP_FROM_NAME=...

FRONTEND_BASE_URL=...
```

> **Never commit `.env` files or API credentials to GitHub.**

## 3. Start Backend Services

From the project root:

```bash
docker compose up --build -d
```

## 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

## 5. Open Kindsight

Frontend:

```text
http://localhost:3000/login
```

FastAPI documentation:

```text
http://localhost:8000/docs
```

---

# 🧑‍🔬 Training

The ML training pipeline is separate from the running application.

See:

```text
ml/README.md
```

for the Colab-based training workflow.

For temperature calibration:

```text
ml/training/calibrate.py
```

The calibration script writes a `_temperature.txt` file next to the model checkpoint.

---

# ⚠️ Limitations

Kindsight is an MVP research / engineering prototype and has important limitations.

### 1. Not an Autonomous Diagnostic System

Kindsight is intended as a **triage / second-reader assistant** and should not replace professional clinical judgment.

### 2. Limited Grad-CAM Evaluation

Grad-CAM was visually spot-checked on a small number of examples rather than systematically evaluated against ground-truth localization data.

### 3. Out-of-Distribution Behavior

A non-RSNA-distribution test image produced a heatmap concentrated around an image border rather than lung tissue.

This demonstrates the importance of evaluating model behavior outside the training distribution.

### 4. Calibration ≠ Accuracy

Temperature scaling improves confidence calibration but does not improve the underlying classifier's accuracy.

### 5. Multi-Label Performance

The 14-condition model has a macro AUROC of **0.7862**, with some classes around **0.68**.

### 6. Curated RAG Knowledge Base

The current 32-chunk knowledge base is designed to demonstrate the RAG pipeline and is not a replacement for licensed clinical literature.

### 7. Production Data Isolation

The application records `owner_id` and scopes scan visibility to the requesting user, but this is a simplified architecture rather than a complete production-grade multi-tenant isolation model.

### 8. Email Infrastructure

Password reset currently relies on Gmail SMTP and would need production-grade transactional email infrastructure at scale.

---

# 🔬 Research Contribution

The core research direction of Kindsight is **not simply pneumonia classification**.

The project explores the combination of:

```text
Calibrated Prediction
        +
Visual Explainability
        +
Retrieval-Augmented Generation
        +
LLM-Based Reporting
        +
Conversational Follow-Up
```

## Research Question

> **Does an LLM-generated radiology report remain consistent with the visual evidence highlighted by the underlying vision model?**

This creates a potential research direction around **vision-language consistency in medical AI**.

A future study could compare:

1. What the classifier predicts.
2. What regions Grad-CAM highlights.
3. What evidence is retrieved from the knowledge base.
4. What the LLM states in the generated report.
5. Whether the generated report is consistent with the model's visual evidence.

### Potential Future Work

- Systematic Grad-CAM localization evaluation
- Ground-truth bounding-box comparison
- More extensive out-of-distribution testing
- Better calibration evaluation
- Licensed clinical knowledge sources
- Vision-language consistency metrics
- Larger multi-disease evaluation
- Stronger production-grade data isolation

---

# 🔐 Security & Safety

Kindsight handles medical images and authentication data, so security is an important consideration.

The project includes:

- JWT authentication
- bcrypt password hashing
- Authenticated API endpoints
- User-scoped scan visibility
- Environment-based secrets
- Password-reset email flow

### Never Commit Secrets

Do not commit:

```text
.env
API keys
JWT secrets
SMTP passwords
Private credentials
```

Use environment variables instead.

---

# 📊 Project Status

| Area | Status |
|---|:---:|
| Frontend | 🟢 Working |
| Backend API | 🟢 Working |
| Authentication | 🟢 Working |
| Pneumonia Model | 🟢 Working |
| Multi-Label Model | 🟢 Working |
| Grad-CAM | 🟢 Working |
| Calibration | 🟢 Working |
| RAG | 🟢 Working |
| AI Reports | 🟢 Working |
| AI Chat | 🟢 Working |
| MongoDB Persistence | 🟢 Working |
| Docker Deployment | 🟢 Working |
| Production Clinical Validation | 🔴 Not validated |

---

# 🙏 Acknowledgments

- **RSNA Pneumonia Detection Challenge** — Radiological Society of North America, via Kaggle
- **NIH ChestX-ray14** — National Institutes of Health Clinical Center
- **EfficientNet** — Tan & Le, 2019
- **Grad-CAM** — Selvaraju et al., 2017
- **Temperature Scaling** — Guo et al., 2017, *On Calibration of Modern Neural Networks*
- **timm** — PyTorch image models
- **pytorch-grad-cam** — Grad-CAM implementation

---

# 📚 References

- Tan, M., & Le, Q. V. — *EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks*, 2019.
- Selvaraju, R. R. et al. — *Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization*, 2017.
- Guo, C. et al. — *On Calibration of Modern Neural Networks*, 2017.

---

<div align="center">

## 🩺 Kindsight

**AI-assisted radiology intelligence — built as an inspectable end-to-end research MVP.**

<br/>

⭐ If you find the project useful, consider starring the repository.

</div>
