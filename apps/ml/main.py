import logging
from datetime import datetime, timezone
from typing import List
from fastapi import FastAPI, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pipeline.features import fetch_stock_history
from pipeline.model import StockPredictionModel
from pipeline.cache import prediction_cache

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("prediction-engine")

app = FastAPI(
    title="StockLens Machine Learning Prediction Microservice",
    description=(
        "Decoupled ML service providing AI-driven stock forecasting, feature engineering "
        "(SMA, EMA, Volatility, RSI, MACD), and sequential multi-day price modeling."
    ),
    version="1.0.0",
)

# Enable CORS for internal and local network requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = StockPredictionModel(forecast_days=5)

class PredictionResponse(BaseModel):
    ticker: str = Field(..., example="AAPL")
    current_price: float = Field(..., example=175.42)
    next_5_days_predicted: List[float] = Field(..., example=[176.10, 176.85, 177.32, 176.90, 178.15])
    confidence_score: float = Field(..., example=0.89)
    timestamp: str = Field(..., example="2026-09-28T16:05:00Z")
    disclaimer: str = Field(
        default="AI-driven statistical projections are for educational mock tracking only and do not constitute certified financial advice.",
        description="Mandatory regulatory disclaimer"
    )

@app.get("/", tags=["Root"])
def root():
    return {
        "service": "StockLens ML Prediction Microservice",
        "status": "healthy",
        "version": "1.0.0",
        "docs_url": "/docs",
        "disclaimer": "AI-driven statistical projections are for educational mock tracking only and do not constitute certified financial advice."
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "prediction-engine"
    }

@app.get(
    "/api/predict/{ticker}",
    response_model=PredictionResponse,
    summary="Fetch Next-5-Day Stock Forecast",
    tags=["Prediction"]
)
def predict_stock(
    ticker: str = Path(..., description="Stock ticker symbol (e.g. AAPL, RELIANCE, TCS, INFY)", min_length=1)
):
    clean_ticker = ticker.strip().upper()

    # Check cache first (Production guardrail: don't compute on every request)
    cached = prediction_cache.get(clean_ticker)
    if cached:
        logger.info(f"Serving cached prediction for {clean_ticker}")
        return cached

    try:
        # Dynamic Data Pulling & Feature Extraction
        df, current_price, resolved_ticker = fetch_stock_history(clean_ticker, period="1y")

        # Multi-Day Sequential Modeling & Forecasting
        predictions, confidence_score = model.forecast_next_5_days(df)

        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        result = {
            "ticker": clean_ticker,
            "current_price": current_price,
            "next_5_days_predicted": predictions,
            "confidence_score": confidence_score,
            "timestamp": now_iso,
            "disclaimer": "AI-driven statistical projections are for educational mock tracking only and do not constitute certified financial advice."
        }

        # Cache result
        prediction_cache.set(clean_ticker, result)

        return result
    except Exception as e:
        logger.error(f"Error generating prediction for {clean_ticker}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Unable to generate prediction for ticker '{clean_ticker}': {str(e)}"
        )
