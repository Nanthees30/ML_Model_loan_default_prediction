import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Step 1: Load Dataset
# pd.read_csv() - CSV file-a DataFrame-a load
# DataFrame = table (rows + columns)
df = pd.read_csv("data/raw/loan_data.csv")

# Step 2: Basic Info
print("=" * 50)
print("DATASET SHAPE (rows, columns):", df.shape)
# .shape - (1000, 9) means 1000 loans, 9 features

print("\nFIRST 5 ROWS:")
print(df.head())
# .head() - first 5 rows showed

print("\nDATA TYPES (each column type):")
print(df.dtypes)
# int64 = whole number, float64 = decimal number, object = text

print("\nMISSING VALUES (null count per column):")
print(df.isnull().sum())
# isnull().sum() - each column count missing values

print("\nBASIC STATISTICS:")
print(df.describe())
# .describe() - mean, min, max, std - data range

# Step 3: Target Variable Analysis
# TARGET = "default" column (0 = paid back, 1 = defaulted)
# Classification problem - predict 0 are 1
print("\nDEFAULT VALUE COUNTS:")
print(df["default"].value_counts())
print("\nPERCENTAGE:")
print(df["default"].value_counts(normalize=True) * 100)

# Step 4: Correlation Analysis 
# Correlation - one column "default"- how to relate
# +1 = strongly related, 0 = no relation, -1 = opposite relation
print("\nCORRELATION WITH DEFAULT:")
print(df.corr()["default"].sort_values(ascending=False))

# Step 5: Visualizations
os.makedirs("outputs/plots", exist_ok=True)

# Plot 1: Class Distribution
plt.figure(figsize=(6, 4))
df["default"].value_counts().plot(kind="bar", color=["steelblue", "tomato"])
plt.title("Loan Default Class Distribution")
plt.xlabel("Default (0 = No, 1 = Yes)")
plt.ylabel("Count")
plt.xticks(rotation=0)
plt.tight_layout()
plt.savefig("outputs/plots/class_distribution.png")
plt.close()
print("\n Saved: outputs/plots/class_distribution.png")

# Plot 2: Correlation Heatmap
plt.figure(figsize=(10, 8))
sns.heatmap(df.corr(), annot=True, fmt=".2f", cmap="coolwarm", linewidths=0.5)
plt.title("Feature Correlation Heatmap")
plt.tight_layout()
plt.savefig("outputs/plots/correlation_heatmap.png")
plt.close()
print("Saved: outputs/plots/correlation_heatmap.png")

# Plot 3: Credit Score vs Default
plt.figure(figsize=(8, 5))
df.groupby("default")["credit_score"].plot(kind="hist", alpha=0.6, bins=30)
plt.title("Credit Score Distribution by Default Status")
plt.xlabel("Credit Score")
plt.legend(["No Default (0)", "Default (1)"])
plt.tight_layout()
plt.savefig("outputs/plots/credit_score_dist.png")
plt.close()
print("Saved: outputs/plots/credit_score_dist.png")

print("\n EDA Complete. Check outputs/plots/ folder")