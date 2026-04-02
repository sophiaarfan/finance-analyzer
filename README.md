# Finance Analyzer

A web app that evaluates companies for investment fit using the Anthropic API. Enter a company name, pick your investment strategy, and get a structured memo with scores, red flags, and key questions + a one-click PDF export.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-F26A8D?style=for-the-badge&logo=google-chrome&logoColor=white)](https://finance-analyzer-nu5ywlskw-sophiaarfans-projects.vercel.app/)

## Stack
| Layer | Tech |
|---|---|
| Frontend | HTML, CSS, vanilla JS |
| AI | Anthropic API (`claude-sonnet-4-20250514`) |
| PDF export | jsPDF (CDN) |
| Hosting | Vercel |
| Serverless | Vercel Edge Functions (`/api/screen.js`) |
 

## Features
- Evaluate any company against private equity, venture capital, private credit, or real estate strategies
- Dimension scoring across 5 categories (strategy alignment, market size, management, financials, competitive moat)
- Auto-generated investment memo with red flags and key questions
- Export results as a formatted PDF
- One-click Gmail draft to share with your team

## Project Structure
```
Finance-Analyzer/
├── index.html        # UI
├── vercel.json       # Routing config
├── css/
│   └── style.css     # Styles
├── js/
│   └── script.js     # Frontend logic + PDF builder
└── api/
    └── screen.js     # Serverless function — calls Anthropic API
```

## How It Works

1. User enters a company name and optional context, and selects an investment strategy
2. The frontend sends a POST request to `/api/screen`
3. The serverless function constructs a prompt and calls the Anthropic API
4. The API responds with structured JSON (scores, memo, fit rating)
5. The frontend renders the results and lets the user export a PDF or draft an email

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key — keep this server-side only |

The key is only ever used in the serverless function (`/api/screen.js`) and never exposed to the client.
