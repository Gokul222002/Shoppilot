# Price Forecaster Model Backtest & Benchmark Report (Phase E)

## Executive Summary
- **Evaluation Set:** 50 canonical products across 8 categories with 365-day historical price points.
- **Held-Out Test Horizon:** 7-day and 30-day forecast windows (350 evaluation points).
- **Benchmark Target:** Naive Persistence Baseline ("Tomorrow Equals Today" $\hat{y}_{t+k} = y_t$).
- **Beats Baseline:** **NO ✗ (Fallback active)**
- **Improvement over Baseline:** **-95.65% lower error**

## Quantitative Metrics Table
| Metric | ShopPilot ML Forecaster | Naive Baseline (Tomorrow = Today) | Improvement |
| :--- | :--- | :--- | :--- |
| **MAE (Mean Absolute Error)** | **₹1,953.83** | ₹998.65 | **-95.65%** |
| **MAPE (Mean Absolute % Error)** | **5.91%** | 2.84% | **-3.07% lower** |
| **Festival Sale Dip Capture** | Active (Calendar + Mean Reversion) | Zero (Lagging) | Proactive Alert |
| **Day-of-Week Modulation** | Active (Fri-Sun Flash Discount Multiplier) | Zero (Static) | Dynamic |

## Decision Logic & Fallback Policy
1. When historical tracking has **fewer than 30 days**, the system returns `"Not enough data yet"` to prevent misleading advice.
2. The model accounts for major Indian festival sales (Big Billion Days, Great Indian Festival, Diwali Mega Sale, Republic Day Sale, Independence Day Sale) by projecting seasonal discount dips prior to start dates.
3. If the model does not beat the baseline on any category segment, ShopPilot automatically falls back to rolling 30-day median rule-based advice.
