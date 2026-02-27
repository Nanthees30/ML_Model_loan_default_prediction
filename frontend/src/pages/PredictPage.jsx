import { useState, useEffect } from "react";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa"
import { predictLoan, getModelInfo } from "../utils/api";

function ResultCard({ result }) {
  const isDefault = result.prediction === 1;
  const riskColors = {
    Low:    "text-green-400  bg-green-500/10  border-green-500/30",
    Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    High:   "text-red-400    bg-red-500/10    border-red-500/30",
  };

  return (
    <div className={`border rounded-xl p-6 ${riskColors[result.risk_level]}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="text-5xl">
          {isDefault ? (
            <FaExclamationTriangle className="text-red-500 drop-shadow-lg" />
          ) : (
            <FaCheckCircle className="text-green-500 drop-shadow-lg" />
          )}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">{result.prediction_label}</h3>
          <p className="text-sm opacity-80">
            Risk Level: <span className="font-semibold">{result.risk_level}</span>
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">Default Probability</span>
            <span className="font-semibold text-red-400">
              {(result.probability_default * 100).toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-700 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all"
              style={{ width: `${result.probability_default * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">No Default Probability</span>
            <span className="font-semibold text-green-400">
              {(result.probability_no_default * 100).toFixed(1)}%
            </span>
          </div>
          <div className="bg-slate-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${result.probability_no_default * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Predict Page
// backendReady prop — passed from App.jsx after wake-up ping succeeds
export default function PredictPage({ backendReady }) {
  const [dynamicFields, setDynamicFields] = useState([]);
  const [form,    setForm]    = useState({});
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Only fetch model info AFTER backend is confirmed alive
  useEffect(() => {
    if (!backendReady) return; // Wait for wake-up ping to succeed

    async function fetchModelData() {
      try {
        const info = await getModelInfo();

        const generatedFields = info.features.map(feature => {
          const label = feature.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          return {
            name: feature,
            label: label,
            type: "number",
            placeholder: `Enter ${label.toLowerCase()}`
          };
        });

        setDynamicFields(generatedFields);

        const initialFormState = {};
        info.features.forEach(feature => {
          initialFormState[feature] = "";
        });
        setForm(initialFormState);

      } catch (err) {
        setError("Could not load model features. Make sure the backend is running.");
      }
    }

    fetchModelData();
  }, [backendReady]); // Re-runs when backendReady flips to true

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await predictLoan(form);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Loan Prediction</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Enter loan applicant details to get an instant risk assessment
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
          <h2 className="font-semibold text-slate-200 mb-4">Applicant Details</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Show loading state while waiting for backend */}
              {dynamicFields.length === 0 && !error && (
                <div className="col-span-2 flex items-center gap-2 text-slate-400 text-sm">
                  <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
                  <span>Loading form fields from model...</span>
                </div>
              )}

              {dynamicFields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs text-slate-400 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={form[field.name] === undefined ? "" : form[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || dynamicFields.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? "Analyzing..." : "Predict Default Risk"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 flex items-center justify-center gap-3">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="text-slate-400">Running ML model...</span>
            </div>
          )}

          {result && <ResultCard result={result} />}

          {!result && !loading && !error && (
            <div className="bg-slate-800/40 border border-slate-700 border-dashed rounded-xl p-8 text-center text-slate-500">
              <p>Submit the form to see prediction results</p>
            </div>
          )}

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">How it works</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The ML model analyzes the input features using a trained classification algorithm.
              It outputs a probability score (0–100%) indicating the likelihood of default.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}