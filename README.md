# Kindsight — Detection from Chest X-Rays

An end-to-end AI-assisted radiology review tool: upload a chest X-ray, get a
pneumonia likelihood score (and, optionally, a 14-condition multi-disease
screen) from a trained CNN, see a Grad-CAM visualization of what the model
focused on, read an AI-generated report grounded in retrieved medical
reference material, and ask follow-up questions through a chat assistant —
behind a real login system, with per-user data separation.

Built as an MVP vertical slice — one primary disease (pneumonia), one
modality (chest X-ray) — with the explicit goal of proving the full
pipeline works end to end before expanding scope.

---

## 1. Problem Statement

Radiologists face increasing caseloads, and delayed or missed pneumonia
findings on chest X-rays can meaningfully affect patient outcomes,
particularly in high-volume or resource-constrained settings. Existing
commercial AI triage tools (Aidoc, Qure.ai, Lunit, and similar) demonstrate
that AI-assisted second reads can help flag urgent cases faster, but most are
closed, expensive, single-purpose systems.

Kindsight explores whether a single, coherent pipeline — detection,
visual explainability, retrieval-grounded report generation, and
conversational follow-up — can be built as an open, inspectable system,
using a widely available public dataset and free/low-cost tooling
throughout.

**Important framing:** this system is designed and positioned as a
**triage/second-reader assistant**, not an autonomous diagnostic tool. Every
report and chat response includes an explicit clinical-correlation caveat.
This matches how real deployed radiology AI products are positioned, and is
a deliberate scope decision, not an omission.

---

## 2. What Was Built

| Component | Status |
|---|---|
| Chest X-ray upload (PNG/JPG/**DICOM**) | ✅ Working |
| Pneumonia detection (EfficientNet-B0, trained from scratch on RSNA data) | ✅ Working |
| 14-condition multi-label screening (EfficientNet-B0, NIH ChestX-ray14) | ✅ Working |
| Grad-CAM visual explainability (both pipelines) | ✅ Working |
| Confidence calibration (temperature scaling) | ✅ Working |
| RAG-grounded report generation (LLM + retrieved reference material) | ✅ Working |
| Conversational chat assistant, grounded in the same knowledge base | ✅ Working |
| Real authentication (JWT + bcrypt), email-based password reset | ✅ Working |
| Per-user scan visibility | ✅ Working |
| Reports, Chat Assistant, Knowledge Base, and Settings pages | ✅ Working |
| Next.js frontend, fully wired to live backend | ✅ Working |
| Dockerized deployment (FastAPI + MongoDB + ChromaDB) | ✅ Working |

---

## 3. System Architecture
┌─────────────────────────────────────────────────────────────────┐
│ Next.js Frontend │
│ Login/Signup │ Dashboard │ Scan Result │ Reports │ Chat │
│ Assistant │ Knowledge Base │ Settings │
└───────────────────────────┬───────────────────────────────────┘
│ REST (JSON, multipart), JWT bearer auth
┌───────────────────────────▼───────────────────────────────────┐
│ FastAPI Backend │
│ Auth (register/login/reset) → Upload → Predict (single + │
│ multi-label) → Grad-CAM → Report (RAG + LLM) → Chat (RAG + │
│ LLM), all scoped to the authenticated user │
└───────┬───────────────┬───────────────┬───────────────┬────────┘
│ │ │ │
┌────▼────┐ ┌─────▼─────┐ ┌─────▼─────┐ ┌────▼─────┐
│ MongoDB │ │ ChromaDB │ │ Trained │ │ Local │
│ (users, │ │ (32 curated│ │ model │ │ file │
│ scans, │ │ pneumonia │ │ checkpoints│ │ storage │
│ preds, │ │ reference │ │ (.pt) + │ │ (images, │
│ reports)│ │ chunks) │ │ calibration│ │ heatmaps)│
│ │ │ │ │ temp file │ │ │
└─────────┘ └───────────┘ └───────────┘ └──────────┘

**Inference flow per upload:** image saved → EfficientNet-B0 forward pass →
logit divided by a fitted calibration temperature → sigmoid confidence score
→ Grad-CAM backward pass generates a heatmap overlay → report service
retrieves top-k relevant chunks from ChromaDB based on the prediction → an
LLM (via OpenRouter, free-tier models) drafts Findings/Impression/
Recommendation grounded in that retrieved context → chat assistant reuses
the same retrieval + LLM pattern for follow-up questions.

---

## 4. Machine Learning Details

### Pneumonia model
- **Architecture:** EfficientNet-B0 (via `timm`), fine-tuned from ImageNet
  pretrained weights, binary classification head (sigmoid output)
- **Dataset:** [RSNA Pneumonia Detection Challenge](https://www.kaggle.com/c/rsna-pneumonia-detection-challenge)
  (Kaggle), ~26,700 chest X-rays, 22.5% pneumonia-positive rate
- **Split:** 18,678 train / 4,003 validation / 4,003 test, stratified by
  label
- **Preprocessing:** CLAHE contrast enhancement, resize to 224×224,
  ImageNet normalization
- **Augmentation:** rotation, brightness/contrast jitter, Gaussian noise —
  deliberately **no horizontal flip**, since chest X-rays have real
  anatomical laterality and flipping would teach the model on anatomy that
  doesn't occur in real patients
- **Training:** 9 epochs (early stopping, patience 4), AdamW optimizer,
  BCE loss

### 14-condition multi-label model
- **Architecture:** EfficientNet-B0, multi-label head (14 independent
  sigmoid outputs)
- **Dataset:** NIH ChestX-ray14, full 112,118-image dataset, NIH's own
  official patient-level split
- **Result:** Macro AUROC 0.7862, per-class range ~0.68 (Infiltration) to
  ~0.91 (Hernia, low sample support)
- Runs as a fully separate pipeline from the pneumonia model — separate
  endpoints, separate MongoDB-tagged records — so neither can break the
  other

### Result
- **Pneumonia model, held-out test set AUROC: 0.8831.** Test set was never
  used for early-stopping decisions, so this number isn't optimistically
  biased by validation-set leakage.

### Confidence calibration
Confidence scores are calibrated via temperature scaling (Guo et al.,
2017): a single scalar, fitted on the held-out validation split, divides
the model's logits before the sigmoid is applied. This does not change
which class is predicted (ranking is preserved) — only how confident the
model claims to be. Fitted temperature: **1.2893**. Validation AUROC was
0.8813 both before and after calibration, confirming the fit didn't
distort the model's discrimination, only its confidence magnitude. If the
calibration file is ever missing, the backend falls back gracefully to an
uncalibrated T=1.0 rather than failing.

### Explainability
Grad-CAM heatmaps generated from the last convolutional block, spot-checked
against multiple in-distribution (RSNA dataset) images — hot zones generally
localized to plausible lung regions, though this was verified on a small
number of examples, not a systematic evaluation (see Limitations).

---

## 5. RAG Knowledge Base

32 original, curated reference chunks covering pneumonia radiology
(consolidation, air bronchograms, ground-glass opacities, severity
assessment, risk factors, treatment overview, limitations of chest X-ray
sensitivity, and more) were written specifically for this project rather
than scraped from external sources, to avoid copyright and licensing risk.
Embedded with `BAAI/bge-small-en-v1.5` and stored in ChromaDB. Browsable
in-app via the Knowledge Base page.

**For a production system**, this would be replaced or supplemented with
properly licensed medical literature (PubMed abstracts, licensed clinical
guidelines) — the current set exists to make the RAG pipeline functionally
complete and demonstrable for this MVP.

---

## 6. Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python 3.12
- **Auth:** JWT (PyJWT) + bcrypt password hashing, custom-built
- **Email:** Gmail SMTP, for password reset and account verification
- **Database:** MongoDB (users/scan/prediction/report/chat persistence)
- **Vector store:** ChromaDB (RAG knowledge base)
- **ML:** PyTorch, `timm` (EfficientNet), `pytorch-grad-cam`, `pydicom`,
  OpenCV
- **LLM:** OpenRouter (OpenAI-compatible API), free-tier models
  (Llama 3.3 70B / auto-router)
- **Deployment:** Docker Compose (backend + MongoDB containers)

---

## 7. Project Structure
Kindsight/
├── backend/ FastAPI app, Dockerized
│ ├── app/
│ │ ├── api/ auth, upload, predict(-multi), report(-multi),
│ │ │ reports (list), knowledge, chat endpoints
│ │ ├── services/ inference, gradcam, report, RAG, chat,
│ │ │ email logic
│ │ ├── core/ settings/config, JWT security, auth dependency
│ │ ├── models/ Pydantic schemas
│ │ └── db/ MongoDB + ChromaDB connections
│ ├── ml_models/ trained model checkpoints + calibration
│ │ temperature file live here
│ ├── Dockerfile
│ └── requirements.txt
├── frontend/ Next.js app
│ ├── app/ login, signup, forgot/reset-password,
│ │ dashboard, scan/scan-multi result pages,
│ │ scans (recent), reports, chat, knowledge
│ ├── components/ AppShell (auth guard), Sidebar, upload,
│ │ heatmap viewers, report card, chat window
│ └── lib/ api.ts (typed API client), auth.ts (session)
├── ml/ training pipeline (separate from the running app)
│ ├── training/ dataset, augmentations, training script,
│ │ calibrate.py (temperature-scaling fit script)
│ ├── inference/ standalone prediction/Grad-CAM scripts
│ └── notebooks/ Colab notebooks for training on GPU
└── docker-compose.yml
---

## 8. Running the Project

See `ml/README.md` for training the model from scratch (Colab-based), and
the setup steps below for running the full application once a trained
checkpoint exists.

```bash
# from the project root
docker compose up --build -d

# frontend
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000/login` (sign up for an account first). Backend
API docs at `http://localhost:8000/docs`.

Environment variables needed in `backend/.env`:
- MongoDB URI, ChromaDB settings
- `USE_MOCK_MODEL` (true/false), `MODEL_PATH`, `USE_MULTILABEL_MODEL`,
  `MULTILABEL_MODEL_PATH`
- `OPENROUTER_API_KEY` (free tier available at openrouter.ai)
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`,
  `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `FRONTEND_BASE_URL` — required for
  password reset emails; `SMTP_PASSWORD` must be a Gmail **App Password**,
  not the account's normal password (see
  [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))

To run calibration on a newly retrained pneumonia model, see
`ml/training/calibrate.py` — it writes a `_temperature.txt` file next to the
checkpoint, which the backend picks up automatically on restart if present.

---

## 9. Honest Limitations

Being direct about these matters more than pretending they don't exist:

- **Shared clinical workspace, not full per-user isolation.** Every scan
  records an `owner_id` and list/detail views are scoped to the requesting
  user, but this is a simplification, not a full multi-tenant model — worth
  knowing if this were ever adapted for a setting with stricter data
  separation requirements between users.
- **Grad-CAM sanity checks were limited.** Verified visually on a handful
  of examples, not a systematic evaluation across many images or against
  ground-truth bounding boxes (which the RSNA dataset actually provides,
  and which segmentation/localization work could use in a future phase).
- **Out-of-distribution behavior is unreliable.** A non-RSNA-distribution
  test image produced a Grad-CAM heatmap that concentrated on an image
  border rather than lung tissue — a known and expected limitation of a
  model trained on a single, standardized dataset, not a contradiction of
  the in-distribution test results.
- **Calibration improves confidence honesty, not accuracy.** Temperature
  scaling was fit and applied (fitted T = 1.2893), so displayed confidence
  values are better-calibrated than the raw sigmoid output — but this
  doesn't change which cases the model gets right or wrong, only how
  trustworthy its stated confidence is on the cases it already predicts.
- **14-condition model has meaningfully lower per-class performance** than
  the pneumonia binary model (macro AUROC 0.7862, with some classes like
  Infiltration around 0.68) — a known consequence of NIH ChestX-ray14's
  weaker, NLP-derived labels compared to RSNA's radiologist-reviewed ones.
- **RAG knowledge base is a curated placeholder**, not licensed medical
  literature — sufficient to demonstrate the retrieval-grounded pipeline
  works, not a substitute for a properly sourced clinical knowledge base.
- **Password reset relies on a single Gmail SMTP account**, which is fine
  for a demo/small-scale deployment but isn't how a production system would
  send transactional email at any real volume or reliability requirement.

---

## 10. Research Angle

The most novel piece of this system isn't pneumonia detection itself (a
well-studied problem) — it's the **combination**: calibrated confidence +
Grad-CAM + retrieval-grounded report generation, with an explicit
evaluation of whether the generated report text is factually consistent
with what the Grad-CAM heatmap actually highlights. That consistency
check — does the language in the LLM-generated report match the visual
evidence the model is actually attending to — is a genuine, current
research gap in medical vision-language systems, and a reasonable basis
for a short paper or research report section extending this project.

---

## 11. Acknowledgments

- Datasets: RSNA Pneumonia Detection Challenge (Radiological Society of
  North America, via Kaggle); NIH ChestX-ray14 (National Institutes of
  Health Clinical Center)
- Base architecture: EfficientNet (Tan & Le, 2019), via the `timm` library
- Grad-CAM: Selvaraju et al., 2017, via the `pytorch-grad-cam` library
- Temperature scaling: Guo et al., 2017 (*On Calibration of Modern Neural
  Networks*)
