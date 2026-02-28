import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import PredictPage from './pages/PredictPage';
import UploadPage from './pages/UploadPage';

const BASE_URL = "https://ml-model-loan-default-prediction.onrender.com";

function NavBar() {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path
      ? "bg-blue-600 text-white"
      : "text-slate-300 hover:text-white hover:bg-slate-800/50";

  return (
    <nav className="flex gap-4 mb-8 border-b border-slate-700/50 pb-4">
      <Link to="/" className={`px-4 py-2 rounded-lg font-medium transition-colors ${isActive('/')}`}>
        Predict Default
      </Link>
      <Link to="/upload" className={`px-4 py-2 rounded-lg font-medium transition-colors ${isActive('/upload')}`}>
        Upload Dataset
      </Link>
    </nav>
  );
}

// Wake-up Banner — shows while Render is spinning up
function WakingUpBanner() {
  return (
    <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
      <div className="animate-spin w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full shrink-0" />
      <div>
        <p className="text-yellow-400 text-sm font-semibold">Waking up backend server...</p>
        <p className="text-yellow-400/70 text-xs mt-0.5">
          Free tier spins down after inactivity. Please wait 30–60 seconds
        </p>
      </div>
    </div>
  );
}

function App() {
  // null = checking, false = offline, true = online
  const [backendStatus, setBackendStatus] = useState(null);

  useEffect(() => {
    async function wakeBackend() {
      try {
        const res = await fetch(`${BASE_URL}/`);
        if (res.ok) {
          setBackendStatus(true);
        } else {
          setBackendStatus(false);
        }
      } catch {
        setBackendStatus(false);
      }
    }
    wakeBackend();
  }, []);

  return (
    <BrowserRouter>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed top-0 left-0 w-full h-full object-cover -z-10"
      >
        <source src="/bg_video.mp4" type="video/mp4" />
      </video>

      <div className="min-h-screen bg-slate-900/80 p-8">
        <div className="max-w-4xl mx-auto">
          <NavBar />

          {/* Show banner while backend is waking up */}
          {backendStatus === null && <WakingUpBanner />}

          {/* Show error if backend is unreachable */}
          {backendStatus === false && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              Backend is unreachable. Please check if the Render service is running.
            </div>
          )}

          <Routes>
            {/* Pass backendStatus so pages know if backend is ready */}
            <Route path="/"       element={<PredictPage backendReady={backendStatus === true} />} />
            <Route path="/upload" element={<UploadPage  backendReady={backendStatus === true} />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;