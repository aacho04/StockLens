# 📊 Stock Market Prediction Engine Module

This directory contains the decoupled **Python ML Microservice** that powers the AI-driven stock forecasting and pattern recognition features in our StockLens application. It communicates directly with our central Node.js/Express API layer via lightweight HTTP REST endpoints.

---

## 🏗️ Architectural Placement

```
                  ┌────────────────────────────────────────┐
                  │          React Frontend UI             │
                  └────────────────────────────────────────┘
                                       │
                                       ▼ (HTTPS REST / WebSockets)
                  ┌────────────────────────────────────────┐
                  │       Node.js / Express Backend        │
                  └────────────────────────────────────────┘
                                       │
                                       ▼ (Internal HTTP: Port 8000)
┌──────────────────────────────────────────────────────────────────────────────┐
│                  PYTHON ML MICROSERVICE (This Module)                        │
│                                                                              │
│  ┌──────────────────────┐    ┌──────────────────────┐    ┌────────────────┐  │
│  │   FastAPI Web Layer  │───>│ Feature Engineering  │───>│ PyTorch / LSTM │  │
│  └──────────────────────┘    └──────────────────────┘    └────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Features Included
1. **Dynamic Data Pulling**: Real-time extraction of time-series closing prices via the Yahoo Finance API (supports NSE and global symbols).
2. **Feature Engineering Pipeline**: Computation of rolling technical indicators (e.g., Simple Moving Averages, Exponential Moving Averages, Daily Volatility, RSI, MACD).
3. **Sequential Modeling**: Generates multi-day future price bands using a trained Time-Series Regression model.
4. **FastAPI Wrapper**: Extremely fast asynchronous Python framework hosting the prediction loop with automatic Swagger documentation.

---

## 🛠️ Step-by-Step Production Setup

### 1. Prerequisites
Ensure you have Python 3.9+ installed along with pip. 

### 2. Environment Setup
From within this directory, create and activate an isolated python virtual environment:
```bash
# Create the virtual environment
python -m venv venv

# Activate on Mac/Linux:
source venv/bin/activate

# Activate on Windows:
.\venv\Scripts\activate
```

### 3. Install Machine Learning Dependencies
Install the highly optimized computational and API frameworks required to compute predictions:
```bash
pip install -r requirements.txt
```

### 4. Running the Local Server
Boot up the prediction engine locally. It will watch for file changes and run on port `8000`:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🔌 API Documentation (Node.js Interface Contract)

### Fetch Next-5-Day Stock Forecast
* **Endpoint**: `GET /api/predict/{ticker}`
* **Access Level**: Internal Network Only

#### Example JSON Response Vector:
```json
{
  "ticker": "AAPL",
  "current_price": 175.42,
  "next_5_days_predicted": [
    176.10,
    176.85,
    177.32,
    176.90,
    178.15
  ],
  "confidence_score": 0.89,
  "timestamp": "2026-09-28T16:05:00Z"
}
```

---

## ⚠️ Core Production Guardrails
* **Never Run Real-time Predictions on HTTP Request**: Running a neural network inference sequentially inside an open client request is slow and will block your server. In production, set up a cron job or worker queue (`Celery` + `Redis`) to generate predictions every day exactly 30 minutes after market close, and store the array in the database. Built-in TTL caching ensures sub-millisecond responses on repeated queries.
* **Compliance Banner Requirement**: Under strict international and regional market regulations, financial forecasting software must show explicit liability disclaimers. Ensure your React view renders the statement: *"AI-driven statistical projections are for educational mock tracking only and do not constitute certified financial advice."*
