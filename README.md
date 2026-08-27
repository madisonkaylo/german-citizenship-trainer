# Einfach Deutschland

A polished, offline-first trainer for the German Einbürgerungstest. Built with React, TypeScript, Vite, Tailwind CSS, and local browser storage.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`, and verify it with `npm test`.

## Content pipeline

The import produces static JSON and local image assets, so the released app does not use AI or require internet access while studying:

```bash
npm run import:data
```

German questions come from the official BAMF catalogue dated 7 May 2025. Correct answers were reconciled with the official BAMF online trainer using the MIT-licensed `vlad-com/leben_in_de` dataset. English translations and explanations are matched from the MIT-licensed `leben-in-deutschland/leben-in-deutschland-app` dataset. See `THIRD_PARTY_NOTICES.md`.

## iPhone installation

Open the deployed app in Safari, tap **Share**, then **Add to Home Screen**. The production service worker caches visited assets for offline use and the UI accounts for iPhone safe areas.

