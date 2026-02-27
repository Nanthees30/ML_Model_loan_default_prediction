# FILE: backend/main.py
# PURPOSE: FastAPI Backend REST API for Loan Default Prediction

# Frontend (React) API (FastAPI) ↔ ML Model
# React sends loan data - FastAPI predicts - sends result back
#
# ENDPOINTS:
# GET  /           → Health check
# POST /predict    → Single loan prediction
# POST /predict-batch → Multiple loans (CSV upload)
# GET  /model-info → Model metadata
# POST /upload-dataset → Upload new CSV dataset

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import joblib
import json
import io
import os

# App Setup 
# FastAPI() - creates our web server
# title, description - shows in /docs (Swagger UI)
app = FastAPI(
    title="Loan Default Prediction API",
    description="ML API to predict whether a loan will default",
    version="1.0.0"
)

# CORS Middleware
# CORS = Cross-Origin Resource Sharing
# WHY? → React runs on localhost:5173, API on localhost:8000
#        Browser blocks requests between different ports by default
#        This middleware ALLOWS React to call our API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],      # Allow GET, POST, PUT, DELETE etc
    allow_headers=["*"],      # Allow all headers
)

# Load Model on Startup
# These are module-level variables - load once, use many times
# Loading on every request would be slow!
MODEL_PATH    = "models/loan_default_model.pkl"
SCALER_PATH   = "models/scaler.pkl"
METADATA_PATH = "models/model_metadata.json"

model    = None
scaler   = None
metadata = None

def load_model():
    """Load ML model and scaler from disk"""
    global model, scaler, metadata
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print("Model loaded:", MODEL_PATH)
    if os.path.exists(SCALER_PATH):
        scaler = joblib.load(SCALER_PATH)
        print("Scaler loaded:", SCALER_PATH)
    if os.path.exists(METADATA_PATH):
        with open(METADATA_PATH) as f:
            metadata = json.load(f)
        print("Metadata loaded:", METADATA_PATH)

load_model()

# Pydantic Schemas
# Pydantic = data validation library
# BaseModel - defines what JSON data the API expects
# Field(ge=0) - must be >= 0, Field(le=850) - must be <= 850
class LoanInput(BaseModel):
    """Input schema for single loan prediction"""
    income: float = Field(..., ge=0, description="Annual income")
    loan_amount: float = Field(..., ge=0, description="Loan amount")
    credit_score: int = Field(..., ge=300, le=850, description="Credit score")
    past_defaults: int = Field(..., ge=0, description="Number of past defaults")
    deposit_balance: float = Field(..., ge=0, description="Deposit balance")

    class Config:
        # Example data - shows in /docs Swagger UI
        json_schema_extra = {
            "example": {
                "age": 35,
                "income": 60000,
                "loan_amount": 15000,
                "loan_term": 36,
                "credit_score": 680,
                "employment_years": 5,
                "debt_to_income": 0.3,
                "num_credit_lines": 4
            }
        }

class PredictionResponse(BaseModel):
    """Output schema for prediction"""
    prediction:       int          # 0 or 1
    prediction_label: str          # "No Default" or "Default"
    probability_default:  float    # Probability of default (0 to 1)
    probability_no_default: float  # Probability of no default
    risk_level:       str          # "Low", "Medium", "High"
    input_data:       dict         # Echo back the input

# Helper Function
def get_risk_level(prob: float) -> str:
    """Convert probability to human-readable risk level"""
    if prob < 0.3:   return "Low"
    elif prob < 0.6: return "Medium"
    else:            return "High"

# Routes / Endpoints

@app.get("/", tags=["Health"])
def root():
    """Health check endpoint → is API running?"""
    return {
        "status": "running",
        "message": "Loan Default Prediction API is live!",
        "model_loaded": model is not None,
        "docs": "/docs"
    }

@app.get("/model-info", tags=["Model"])
def model_info():
    """Returns metadata about the trained model"""
    if not metadata:
        raise HTTPException(status_code=404, detail="Model metadata not found. Run train.py first.")
    return metadata

@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict(data: LoanInput):
    """
    Predict loan default for a single applicant.

    - **Returns 0**: No Default (loan will be repaid)
    - **Returns 1**: Default (loan will NOT be repaid)
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please run src/train.py first."
        )

    # Convert Pydantic model to dict → DataFrame
    # ML model expects DataFrame input, not dict
    input_dict = data.dict()
    input_df   = pd.DataFrame([input_dict])

    # Scale if needed (Logistic Regression requires scaling)
    if metadata and metadata.get("is_scaled") and scaler:
        input_array = scaler.transform(input_df)
    else:
        input_array = input_df.values

    # Predict
    prediction      = int(model.predict(input_array)[0])
    probabilities   = model.predict_proba(input_array)[0]
    prob_default    = float(probabilities[1])   # Index 1 = class "1" (default)
    prob_no_default = float(probabilities[0])   # Index 0 = class "0" (no default)

    return PredictionResponse(
        prediction=prediction,
        prediction_label="Default" if prediction == 1 else "No Default",
        probability_default=round(prob_default, 4),
        probability_no_default=round(prob_no_default, 4),
        risk_level=get_risk_level(prob_default),
        input_data=input_dict
    )

@app.post("/predict-batch", tags=["Prediction"])
async def predict_batch(file: UploadFile = File(...)):
    """
    Predict loan defaults for multiple applicants via CSV upload.

    Upload a CSV with the same columns as loan_data.csv (without 'default' column)
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run src/train.py first.")

    # Read uploaded CSV
    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")

    # Remove 'default' column if present (user might upload full dataset)
    if "default" in df.columns:
        df = df.drop("default", axis=1)

    # Check required columns
    required = ["age", "income", "loan_amount", "loan_term", "credit_score",
                "employment_years", "debt_to_income", "num_credit_lines"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns: {missing}")

    # Scale if needed
    if metadata and metadata.get("is_scaled") and scaler:
        input_array = scaler.transform(df[required])
    else:
        input_array = df[required].values

    # Predict all rows at once (vectorized = fast!)
    predictions  = model.predict(input_array)
    probabilities = model.predict_proba(input_array)[:, 1]

    # Build results
    df["predicted_default"]     = predictions
    df["probability_default"]   = np.round(probabilities, 4)
    df["prediction_label"]      = df["predicted_default"].map({0: "No Default", 1: "Default"})
    df["risk_level"]            = df["probability_default"].apply(get_risk_level)

    return {
        "total_records":     len(df),
        "predicted_default": int(df["predicted_default"].sum()),
        "predicted_no_default": int((df["predicted_default"] == 0).sum()),
        "default_rate":      round(float(df["predicted_default"].mean()) * 100, 2),
        "predictions":       df.to_dict(orient="records")
    }

@app.post("/upload-dataset", tags=["Dataset"])
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload a new dataset CSV file.
    File will be saved to data/raw/ and basic stats returned.
    After upload, re-run train.py to retrain with new data.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    contents = await file.read()
    try:
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")

    # Save to disk
    os.makedirs("data/raw", exist_ok=True)
    save_path = "data/raw/loan_data.csv"
    df.to_csv(save_path, index=False)

    return {
        "message":    "Dataset uploaded successfully!",
        "filename":   file.filename,
        "saved_to":   save_path,
        "rows":       len(df),
        "columns":    list(df.columns),
        "shape":      df.shape,
        "missing_values": df.isnull().sum().to_dict(),
        "next_step":  "Run src/train.py to retrain the model with new data"
    }

# Run Server
# This block runs only if you execute: python backend/main.py
# (Not needed when using: uvicorn backend.main:app --reload)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)