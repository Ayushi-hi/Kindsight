# RadIntel AI — ML Training

This folder is separate from `backend/` on purpose: training happens on a GPU
(Colab, most likely, given a student budget), while the backend runs the
already-trained model for inference. You don't need GPU access to run the
backend in mock mode — only to actually produce the `.pt` checkpoint file.

## Folder structure

```
ml/
├── training/
│   ├── dataset.py              PyTorch Dataset for RSNA DICOM images
│   ├── augmentations.py        train/eval transform pipelines
│   ├── train_efficientnet.py   main training script
│   └── configs/
│       └── pneumonia_effnet_b0.yaml
├── inference/
│   ├── predict.py              run the trained model on one image (CLI)
│   └── gradcam.py              generate a Grad-CAM heatmap (CLI)
├── notebooks/
│   └── eda_and_baseline.ipynb  Colab notebook: download data, EDA, train, sanity-check
├── saved_models/               trained checkpoints land here (.pt files)
└── requirements-ml.txt
```

## Recommended path: Google Colab

1. Get an RSNA Pneumonia Detection Challenge Kaggle API token: https://www.kaggle.com/settings → API → "Create New Token"
2. Open `notebooks/eda_and_baseline.ipynb` in Colab (`Runtime → Change runtime type → GPU`)
3. Upload the `training/` folder's contents into the Colab session (or mount Google Drive and keep the project there permanently — recommended, since Colab sessions reset and you'd otherwise re-upload every time)
4. Run the notebook top to bottom
5. Download the resulting checkpoint from `saved_models/efficientnet_b0_pneumonia.pt`

## Running locally instead (if you have a GPU)

```bash
cd ml
pip install -r requirements-ml.txt
# Also install torch matching your CUDA version: https://pytorch.org/get-started/locally/

cd training
python train_efficientnet.py --config configs/pneumonia_effnet_b0.yaml
```

Before running, edit `configs/pneumonia_effnet_b0.yaml` to point `images_dir` and `labels_csv` at wherever you downloaded the RSNA dataset.

## After training: connect it to the backend

1. Copy `saved_models/efficientnet_b0_pneumonia.pt` into `backend/ml_models/` (create that folder if it doesn't exist)
2. In `backend/.env`, set:
   ```
   USE_MOCK_MODEL=false
   MODEL_PATH=./ml_models/efficientnet_b0_pneumonia.pt
   ```
3. If running the backend via Docker, uncomment the ML dependencies section in `backend/requirements.txt` (torch, torchvision, timm, pillow, opencv, grad-cam) and rebuild — mock mode was deliberately avoiding these to keep the image small, but the real model needs them
4. Restart the backend and test `/predict/{scan_id}` — it should now return real predictions instead of randomized mock ones

## What "good" looks like before you trust this model

- **Test set AUROC above ~0.85** is a reasonable target for this baseline architecture/dataset combination — the training script reports this automatically at the end of the run
- **Grad-CAM heatmaps actually highlight lung regions**, not corners, borders, or text/marker overlays on the X-ray — always spot-check several examples, don't just trust the AUROC number in isolation
- **Confidence scores are calibrated**, not just raw sigmoid output — this baseline doesn't add calibration yet (temperature scaling), which is a good next improvement once the base model is working, since an uncalibrated "89% confidence" doesn't actually mean what it sounds like it means

## Note on scope

This trains a **classifier** (pneumonia vs. normal), not a **segmentation** model — it tells you pneumonia is likely present, and Grad-CAM gives an approximate visual region, but it doesn't draw a precise boundary around the affected area the way a U-Net-based segmentation model would. That's a reasonable, deliberate scope limit for the MVP — segmentation is real additional work for a later phase, not something to bolt on here.
