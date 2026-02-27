// Base URL of our FastAPI server
// Vite uses import.meta.env for environment variables
const BASE_URL = "https://ml-model-loan-default-prediction.onrender.com";

async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    // Try to get error message from FastAPI response body
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Api Functions

export async function getModelInfo(){
    return apiFetch("/model-info");
}

/**
 * Predict default for a single loan applicant
 * POST /predict
 * @param {Object} loanData - Loan input fields
 */

export async function predictLoan(loanData) {
    return apiFetch("/predict", {
        method: "POST",
        body:JSON.stringify(loanData)
    })
}

/**
 * Predict defaults for a batch CSV upload
 * POST /predict-batch
 * @param {File} file - CSV file object
 */

export async function predictBatch(file) {
  const formData = new FormData();
  formData.append("file", file);

  // NOTE: No "Content-Type" header here!
  // Browser sets it automatically with boundary for multipart/form-data
  const response = await fetch(`${BASE_URL}/predict-batch`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Upload a new training dataset
 * POST /upload-dataset
 * @param {File} file - CSV file object
 */
export async function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/upload-dataset`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `HTTP ${response.status}`);
  }

  return response.json();
}