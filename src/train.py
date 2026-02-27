import pandas as pd
import numpy as np
import joblib
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
)
import warnings
warnings.filterwarnings("ignore")

# Step 1: Load Dataset
print("Loading dataset...")
df = pd.read_csv("data/raw/loan_data.csv")
print(f"   Shape: {df.shape}")

# Step 2: Separate Features (X) and Target (y)
# X = input columns (what we KNOW about the loan)
# y = output column (what we PREDICT did they default?)
X = df.drop("default", axis=1)   # Drop target keep features
y = df["default"]                 # Only target column

print(f"\n Features (X): {list(X.columns)}")
print(f"Target (y): 'default' - {y.value_counts().to_dict()}")

# Step 3: Feature Scaling
# WHY SCALING? age=30, income=50000 different ranges
# StandardScaler converts all to same scale (mean=0, std=1)
# Logistic Regression needs this; Random Forest doesn't but helps
scaler = StandardScaler()

# Step 4: Train-Test Split
# WHY SPLIT? We train on 80%, test on 20% (unseen data)
# random_state=42 same split every time (reproducible)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
    # stratify=y ensures both train/test have same class ratio
)

# Scale features
X_train_scaled = scaler.fit_transform(X_train)   # fit + transform on train
X_test_scaled  = scaler.transform(X_test)         # only transform on test (no fit)
# WHY?  scaler learns mean/std from train only - no data leakage

print(f"\n Train size: {X_train.shape[0]} | Test size: {X_test.shape[0]}")

# Step 5: Define Models
models = {
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    "Random Forest":       RandomForestClassifier(n_estimators=100, random_state=42),
}

# Step 6: Train & Evaluate All Models
results = {}
best_model_name = None
best_auc = 0

print("\n" + "=" * 60)
print("TRAINING MODELS")
print("=" * 60)

for name, model in models.items():
    print(f"\n Model: {name}")

    # Train
    if name == "Logistic Regression":
        model.fit(X_train_scaled, y_train)
        y_pred      = model.predict(X_test_scaled)
        y_pred_prob = model.predict_proba(X_test_scaled)[:, 1]
    else:
        model.fit(X_train, y_train)          # Tree models don't need scaling
        y_pred      = model.predict(X_test)
        y_pred_prob = model.predict_proba(X_test)[:, 1]

    # Metrics
    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_pred_prob)

    print(f"   Accuracy : {acc:.4f} ({acc*100:.2f}%)")
    print(f"   ROC-AUC  : {auc:.4f}")
    # ROC-AUC 0.5 = random guess, 1.0 = perfect model
    print(f"\n   Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["No Default", "Default"]))

    results[name] = {
        "accuracy": round(acc, 4),
        "roc_auc": round(auc, 4),
        "model": model,
        "is_scaled": name == "Logistic Regression"
    }

    if auc > best_auc:
        best_auc = auc
        best_model_name = name

# Step 7: Save Best Model
print("=" * 60)
print(f"\n Best Model: {best_model_name} (AUC={best_auc:.4f})")

os.makedirs("models", exist_ok=True)

best = results[best_model_name]
joblib.dump(best["model"], "models/loan_default_model.pkl")
joblib.dump(scaler, "models/scaler.pkl")

# Save model metadata (for My API to use)
metadata = {
    "model_name": best_model_name,
    "accuracy": best["accuracy"],
    "roc_auc": best["roc_auc"],
    "is_scaled": best["is_scaled"],
    "features": list(X.columns),
    "target": "default",
    "classes": [0, 1],
    "class_labels": {"0": "No Default", "1": "Default"}
}
with open("models/model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("\n Saved: models/loan_default_model.pkl")
print("Saved: models/scaler.pkl")
print("Saved: models/model_metadata.json")
print("\n Training Complete!")