// FILE: frontend/src/pages/UploadPage.jsx
// PURPOSE: Upload new CSV dataset and see preview/stats (DYNAMIC)

import { useState, useRef, useEffect } from "react";
import { FaFolderOpen, FaFilePdf } from "react-icons/fa";
import { uploadDataset, getModelInfo } from "../utils/api";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [modelFeatures, setModelFeatures] = useState([]); // Dynamic headers

  const fileInputRef = useRef(null);

  // Fetch model features on load to build expected CSV format dynamically
  useEffect(() => {
    async function fetchModelData() {
      try {
        const info = await getModelInfo();
        setModelFeatures([...info.features, "default"]); // append target column
      } catch (err) {
        console.error("Failed to fetch model info:", err);
      }
    }
    fetchModelData();
  }, []);

  function handleFile(selectedFile) {
    if (!selectedFile || !selectedFile.name.endsWith(".csv")) {
      setError("Please select a valid CSV file.");
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",");
      const rows = lines.slice(1, 6).map((line) => line.split(","));
      setPreview({ headers, rows, totalLines: lines.length - 1 });
    };
    reader.readAsText(selectedFile);
  }

  function handleDragOver(e) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const data = await uploadDataset(file);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Dataset</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Upload a new CSV file to replace the training data. After upload, re-run <code className="bg-slate-700 px-1 rounded text-blue-300">train.py</code> to update the model.
        </p>
      </div>

      {/* Expected format - DYNAMIC */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Expected CSV Format</h3>
        <div className="overflow-x-auto">
          <table className="text-xs text-slate-400 w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {modelFeatures.length > 0 ? (
                  modelFeatures.map(h => (
                    <th key={h} className="text-left py-1 pr-4 font-mono text-blue-400">{h}</th>
                  ))
                ) : (
                  <th className="text-left py-1 pr-4 text-slate-500">Loading required columns from backend...</th>
                )}
              </tr>
            </thead>
            <tbody>
              {modelFeatures.length > 0 && (
                <tr>
                  {modelFeatures.map((_, i) => (
                    <td key={i} className="py-1 pr-4 text-slate-500 border-b border-slate-700/30 border-dashed">...data...</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          * <code className="text-blue-300">default</code> column: 0 = No Default, 1 = Default (optional for new predictions)
        </p>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          dragging ? "border-blue-500 bg-blue-500/10" : "border-slate-600 hover:border-slate-400 bg-slate-800/30"
        }`}
      >
        <div className="text-4xl mb-3 flex justify-center">
          {file ? (
            <FaFilePdf className="text-red-500 drop-shadow-md" />
          ) : (
            <FaFolderOpen className="text-blue-400 drop-shadow-md" />
          )}
        </div>
        {file ? (
          <div>
            <p className="text-white font-medium">{file.name}</p>
            <p className="text-slate-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-slate-300">Drag & drop a CSV file here</p>
            <p className="text-slate-500 text-sm mt-1">or click to browse</p>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {preview && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Preview (first 5 rows) — {preview.totalLines} total rows</h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="border-b border-slate-600">
                  {preview.headers.map((h, i) => <th key={i} className="text-left py-2 pr-4 text-blue-400 font-mono">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    {row.map((cell, j) => <td key={j} className="py-2 pr-4 text-slate-300">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>}

      {file && !result && (
        <button onClick={handleUpload} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors">
          {loading ? "Uploading..." : "Upload Dataset to Server"}
        </button>
      )}

      {result && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-green-400">
          <h3 className="font-bold text-lg mb-2">Upload Successful!</h3>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><span className="text-slate-400">Saved to:</span> <span className="text-white">{result.saved_to}</span></div>
            <div><span className="text-slate-400">Rows:</span> <span className="text-white">{result.rows}</span></div>
            <div><span className="text-slate-400">Columns:</span> <span className="text-white">{result.columns?.length}</span></div>
            <div><span className="text-slate-400">File:</span> <span className="text-white">{result.filename}</span></div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 border border-slate-600">
            <p className="text-slate-500"># Now retrain the model with new data:</p>
            <p>cd backend</p>
            <p>python src/train.py</p>
          </div>
        </div>
      )}
    </div>
  );
}