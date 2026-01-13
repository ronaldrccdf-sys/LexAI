<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/14uwsMXW-XfHt3WJpAjRK7aZMdoUopAjH

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure frontend + backend environment:
   - Frontend: set `GEMINI_API_KEY` in [.env.local](.env.local).
   - Backend: copy `backend/.env.example` to `backend/.env` and adjust `CORS_ORIGIN` if needed.
3. Install backend dependencies:
   `npm --prefix backend install`
4. Start backend:
   `npm run backend:dev`
5. Run the frontend:
   `VITE_API_URL=http://localhost:4000 npm run dev`
