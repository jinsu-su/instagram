# Reach ER Capping and AI Report Error Fix

## Goal Description

The user reported two issues on the Instagram AI dashboard:
1. The **Reach ER** metric displays values exceeding 100% (e.g., 1075.0%). This is confusing for users because an engagement rate should be capped at 100%.
2. The **AI performance report** sometimes fails with an error message like "AI 분석 리포트 중단" and shows a subscription‑limit warning.

We need to:
- Ensure the Reach ER calculation never exceeds 100% and displays a user‑friendly value.
- Investigate the cause of the AI report generation error, improve error handling, and provide clearer UI feedback.

## User Review Required

> [!IMPORTANT]
> The plan includes modifications to both the frontend (`Dashboard.js`) and the backend API (`internal_tasks.py`). Please confirm that you want these changes applied. If you have any preferences for how the error messages should be displayed or logged, let us know.

## Proposed Changes

---
### Frontend (React)

#### [MODIFY] [Dashboard.js](file:///Users/su/Downloads/instagram%20%EB%B3%B5%EC%82%AC%EB%B3%B8%204/instagram-auth-service/frontend/src/pages/Dashboard.js)
- Update the Reach ER calculation to use `Math.min(..., 100)` and format the value.
- Add a tooltip or label explaining that the metric is capped at 100%.
- Refactor the error UI for `performanceReport?.error` to show a more detailed message and a retry button.
- Ensure the stale/limit warning includes a link to the subscription page.

---
### Backend (Python FastAPI)

#### [MODIFY] [internal_tasks.py](file:///Users/su/Downloads/instagram%20%EB%B3%B5%EC%82%AC%EB%B3%B8%204/instagram-auth-service/app/routers/internal_tasks.py)
- Review the endpoint that generates the AI performance report.
- Add explicit handling for subscription‑limit errors (e.g., raise `HTTPException(status_code=403, detail="Subscription limit exceeded"`).
- Log any unexpected exceptions with stack traces for easier debugging.
- Return a consistent JSON shape: `{ success: bool, data?: ..., error?: string }`.

## Open Questions

- Do you prefer the Reach ER value to be shown as a percentage string (e.g., `99.9%`) or as a numeric value?
- Should the AI report error UI include an automatic retry after a short delay, or just a manual "Refresh" button?
- Is there any existing subscription‑checking logic we should integrate with, or should we add a new utility function?

## Verification Plan

### Automated Tests
- Run the existing frontend test suite (`npm test`) to ensure no regressions.
- Add a unit test for the Reach ER calculation function (if extracted) to verify the 100% cap.
- Use `pytest` to run backend tests and confirm the new error handling returns the expected status code.

### Manual Verification
- Open the dashboard in a browser, simulate a post with `reach` > `engagement` to verify the displayed ER is capped at 100%.
- Trigger the AI report generation with a free‑plan account to reproduce the error, then confirm the new UI displays a clear message and a functional retry button.
- Check the server logs for proper error entries.
