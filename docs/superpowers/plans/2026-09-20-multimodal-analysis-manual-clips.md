# Multimodal Analysis and Manual Clips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add analysis mode metadata, manual clip creation, per-clip music mixing, and independent caption timing without changing the stable main branch.

**Architecture:** Keep clip data in React state and extend the existing render payload. Add small server services/routes for music listing and FFmpeg audio mixing. Preserve the existing Whisper/Gemini path and fall back to a declared mode when transcript evidence is weak.

**Tech Stack:** React, Express, fluent-ffmpeg, local filesystem, Gemini JSON response.

**Spec:** `docs/superpowers/specs/2026-09-20-multimodal-analysis-manual-clips.md`

## Global Constraints

- All media remains local; no database is introduced.
- Original video audio is preserved and mixed with optional background music.
- Manual clips use the same preview, caption, render, and download flow as AI clips.
- Existing `main` remains untouched.

## Review Focus

- Manual times outside the source duration are rejected by both client and server.
- A missing or invalid music file returns a clear API error.
- Music shorter than a clip loops and longer music is trimmed.
- Caption timing never renders outside the clip duration.
- No-audio and music-only inputs do not fail only because Whisper has no text.

### Task 1: Clip model and manual clip API

Modify `client/src/App.jsx` and `server/src/services/geminiService.js`; add tests for validation and manual creation behavior. Add a manual clip form and mode metadata.

### Task 2: Caption timing

Modify `client/src/App.jsx`, `client/src/styles.css`, and `server/src/services/titleCardService.js` to support per-layer start/end offsets in preview and rendered HTML.

### Task 3: Local music library and mixing

Modify `server/src/server.js`, `server/src/routes/render.js`, and `server/src/services/renderService.js`; add `server/music/.gitkeep` and a music listing endpoint. Mix selected music with source audio using FFmpeg.

### Task 4: Analysis mode fallback

Modify `server/src/routes/analyze.js` and add a local audio classification helper. Return `analysisMode` and preserve the current Gemini flow for speech while allowing music/silent fallback candidates.

### Task 5: UI and verification

Update the React UI for mode labels, manual clips, music controls, and caption timing. Run client build, server tests, and a render smoke test.
