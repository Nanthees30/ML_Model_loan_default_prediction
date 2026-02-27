import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import PredictPage from './pages/PredictPage';
import UploadPage from './pages/UploadPage'; 

function NavBar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path 
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

function App() {
  return (
    <BrowserRouter>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed top-0 left-0 w-full h-full object-cover -z-10"
      >
        <source src=".././public/Loan_Prediction_AI_Background_Animation_Template.mp4" type="video/mp4" />
      </video>
      <div className="min-h-screen bg-slate-900/80 p-8">
        <div className="max-w-4xl mx-auto">
          <NavBar />

          <Routes>
            <Route path="/" element={<PredictPage />} />
            <Route path="/upload" element={<UploadPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;