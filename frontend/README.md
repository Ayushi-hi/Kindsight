# RadIntel AI — Frontend (MVP v1)

Next.js 14 (App Router) + TypeScript + Tailwind. Dark "reading room" theme
modeled on real radiology workstation software (PACS/DICOM viewers).

## Setup

```bash
npm install
cp .env.example .env.local   # point at your FastAPI backend
npm run dev
```

Runs on http://localhost:3000.

## Notes

- **Demo mode:** every API call in `lib/api.ts` falls back to realistic mock
  data if the FastAPI backend isn't reachable, so the UI is fully clickable
  and demoable even before the backend is wired up. Remove `safeFetch`'s
  mock fallback once the real backend is stable, if you want hard failures
  instead.
- **Sample images:** demo mode references `/demo/sample-cxr.png` and
  `/demo/sample-gradcam.png` — drop two sample images into `public/demo/`
  (any chest X-ray + a heatmap-overlaid version) so the offline demo has
  something to render.
- Pages: `/login`, `/dashboard` (worklist), `/upload`, `/scan/[id]` (result +
  report), `/chat/[scanId]` (RAG assistant).
- Design tokens live in `tailwind.config.ts` — change colors/fonts there,
  not inline, to keep the theme consistent as you add pages.
