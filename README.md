# Kindsight —  Detection from Chest X-Rays

An end-to-end AI-assisted radiology review tool: upload a chest X-ray, get a
pneumonia likelihood score from a trained CNN, see a Grad-CAM visualization
of what the model focused on, read an AI-generated report grounded in
retrieved medical reference material, and ask follow-up questions through a
chat assistant.

Built as an MVP vertical slice — one disease (pneumonia), one modality
(chest X-ray) — with the explicit goal of proving the full pipeline works
end to end before expanding scope.

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
| Grad-CAM visual explainability | ✅ Working |
| Confidence scoring | ✅ Working |
| RAG-grounded report generation (LLM + retrieved reference material) | ✅ Working |
| Conversational chat assistant, grounded in the same knowledge base | ✅ Working |
| Next.js frontend, fully wired to live backend | ✅ Working |
| Dockerized deployment (FastAPI + MongoDB + ChromaDB) | ✅ Working |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                         │
│   Upload UI │ Result Viewer │ Report Viewer │ Chat Assistant     │
└───────────────────────────┬───────────────────────────────────┘
                             │ REST (JSON, multipart)
┌───────────────────────────▼───────────────────────────────────┐
│                        FastAPI Backend                          │
│  Upload → Predict (EfficientNet-B0) → Grad-CAM → Report (RAG    │
│  + LLM) → Chat (RAG + LLM), all persisted per-scan               │
└───────┬───────────────┬───────────────┬───────────────┬────────┘
        │               │               │               │
   ┌────▼────┐    ┌─────▼─────┐   ┌─────▼─────┐   ┌────▼─────┐
   │ MongoDB │    │ ChromaDB  │   │ Trained   │   │ Local     │
   │ (scans, │    │ (20 curated│  │ model     │   │ file      │
   │ preds,  │    │  pneumonia │  │ checkpoint│   │ storage   │
   │ reports)│    │  reference │  │ (.pt)     │   │ (images,  │
   │         │    │  chunks)   │  │           │   │  heatmaps)│
   └─────────┘    └───────────┘   └───────────┘   └──────────┘
```

**Inference flow per upload:** image saved → EfficientNet-B0 forward pass →
sigmoid confidence score → Grad-CAM backward pass generates a heatmap
overlay → report service retrieves top-k relevant chunks from ChromaDB based
on the prediction → an LLM (via OpenRouter, free-tier models) drafts
Findings/Impression/Recommendation grounded in that retrieved context → chat
assistant reuses the same retrieval + LLM pattern for follow-up questions.

---

## 4. Machine Learning Details

### Model
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

### Result
- **Final held-out test set AUROC: 0.8831**
- Test set was never used for early-stopping decisions, so this number
  isn't optimistically biased by validation-set leakage

### Explainability
Grad-CAM heatmaps generated from the last convolutional block, spot-checked
against multiple in-distribution (RSNA dataset) images — hot zones generally
localized to plausible lung regions, though this was verified on a small
number of examples, not a systematic evaluation (see Limitations).

---

## 5. RAG Knowledge Base

20 original, curated reference chunks covering pneumonia radiology
(consolidation, air bronchograms, ground-glass opacities, severity
assessment, risk factors, treatment overview, limitations of chest X-ray
sensitivity, and more) were written specifically for this project rather
than scraped from external sources, to avoid copyright and licensing risk.
Embedded with `BAAI/bge-small-en-v1.5` and stored in ChromaDB.

**For a production system**, this would be replaced or supplemented with
properly licensed medical literature (PubMed abstracts, licensed clinical
guidelines) — the current set exists to make the RAG pipeline functionally
complete and demonstrable for this MVP.

---

## 6. Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python 3.12
- **Database:** MongoDB (scan/prediction/report/chat persistence)
- **Vector store:** ChromaDB (RAG knowledge base)
- **ML:** PyTorch, `timm` (EfficientNet), `pytorch-grad-cam`, `pydicom`,
  OpenCV
- **LLM:** OpenRouter (OpenAI-compatible API), free-tier models
  (Llama 3.3 70B / auto-router)
- **Deployment:** Docker Compose (backend + MongoDB containers)

---

## 7. Project Structure

```
radintel-AI/
├── backend/            FastAPI app, Dockerized
│   ├── app/
│   │   ├── api/         upload, predict, report, chat endpoints
│   │   ├── services/    inference, gradcam, report, RAG, chat logic
│   │   ├── scripts/     RAG knowledge base + ingestion script
│   │   ├── models/      Pydantic schemas
│   │   ├── db/          MongoDB + ChromaDB connections
│   │   └── core/        settings/config
│   ├── ml_models/       trained model checkpoint lives here
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            Next.js app
│   ├── app/              dashboard, scan result pages
│   ├── components/       upload, heatmap viewer, report card, chat
│   └── lib/api.ts         typed API client
├── ml/                  training pipeline (separate from the running app)
│   ├── training/          dataset, augmentations, training script
│   ├── inference/          standalone prediction/Grad-CAM scripts
│   └── notebooks/           Colab notebook for training on GPU
└── docker-compose.yml
```

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

Visit `http://localhost:3000/dashboard`. Backend API docs at
`http://localhost:8000/docs`.

Environment variables needed in `backend/.env`: MongoDB URI, ChromaDB
settings, `USE_MOCK_MODEL` (true/false), `MODEL_PATH`, and
`OPENROUTER_API_KEY` (free tier available at openrouter.ai).

---

## 9. Honest Limitations

Being direct about these matters more than pretending they don't exist:

- **Single disease, single modality.** This detects pneumonia on chest
  X-rays only — not the 9-disease, 5-modality vision from the original
  concept. That was a deliberate scope decision for a working MVP, not a
  shortfall.
- **Grad-CAM sanity checks were limited.** Verified visually on a handful
  of examples, not a systematic evaluation across many images or against
  ground-truth bounding boxes (which the RSNA dataset actually provides,
  and which segmentation/localization work could use in a future phase).
- **Out-of-distribution behavior is unreliable.** A non-RSNA-distribution
  test image produced a Grad-CAM heatmap that concentrated on an image
  border rather than lung tissue — a known and expected limitation of a
  model trained on a single, standardized dataset, not a contradiction of
  the in-distribution test results.
- **Confidence scores are not calibrated.** The sigmoid output is used
  directly as a "confidence" value; a calibration step (e.g., temperature
  scaling) was identified as a natural next improvement but not implemented.
- **RAG knowledge base is a curated placeholder**, not licensed medical
  literature — sufficient to demonstrate the retrieval-grounded pipeline
  works, not a substitute for a properly sourced clinical knowledge base.
- **No authentication or multi-user support.** Deliberately out of scope
  for an MVP demo.

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

- Dataset: RSNA Pneumonia Detection Challenge (Radiological Society of
  North America, via Kaggle)
- Base architecture: EfficientNet (Tan & Le, 2019), via the `timm` library
- Grad-CAM: Selvaraju et al., 2017, via the `pytorch-grad-cam` library