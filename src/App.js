import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './App.css';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const REMOVE_BG_API_KEY = process.env.REACT_APP_REMOVE_BG_KEY;
// LOGIN CONSTANTS
const AUTH_ID = process.env.REACT_APP_LOGIN_ID;
const AUTH_PASS = process.env.REACT_APP_LOGIN_PASSWORD;

const layoutOptions = [
  { label: 'Custom', value: 'custom', icon: '⚙️' },
  { label: 'PVC Card', value: 'pvc', icon: '💳' },
  { label: 'Aadhar', value: 'aadhar', icon: '🆔' },
];

export default function App() {
  // --- LOGIN STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ userId: '', password: '' });

  // --- YOUR ORIGINAL STATE ---
  const [layout, setLayout] = useState('custom');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customW, setCustomW] = useState(1.18);
  const [customH, setCustomH] = useState(1.38);
  const [customCount, setCustomCount] = useState(12);
  const [customPaper, setCustomPaper] = useState('4x6');
  const [src, setSrc] = useState(null);
  const [image, setImage] = useState(null);
  const [finalProcessedImg, setFinalProcessedImg] = useState(null);
  const [aadhar, setAadhar] = useState({ front: null, back: null });
  const [croppingSide, setCroppingSide] = useState(null);
  const imgRef = useRef(null);
  const printRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();

  // --- LOGIN HANDLER ---
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginForm.userId === AUTH_ID && loginForm.password === AUTH_PASS) {
      setIsAuthenticated(true);
    } else {
      alert("Invalid Credentials! Please check your .env settings.");
    }
  };

  // --- YOUR ORIGINAL LOGIC (No changes) ---
  useEffect(() => {
    const bakeFilters = (imgSource) => {
      if (!imgSource) return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
        ctx.drawImage(img, 0, 0);
        setFinalProcessedImg(canvas.toDataURL('image/jpeg', 1.0));
      };
      img.src = imgSource;
    };
    if (image) bakeFilters(image);
  }, [brightness, contrast, image]);

  const handleRemoveBg = async () => {
    if (!image) return;
    try {
      setIsProcessing(true);
      const blob = await (await fetch(image)).blob();
      const formData = new FormData();
      formData.append('image_file', blob);
      const res = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': REMOVE_BG_API_KEY },
        body: formData,
      });
      if (!res.ok) throw new Error('API Error');
      const resultBlob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => applyNewBackground(reader.result);
      reader.readAsDataURL(resultBlob);
    } catch (e) {
      alert("Removal failed. Check API key.");
      setIsProcessing(false);
    }
  };

  const applyNewBackground = (transparentBase64) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setImage(canvas.toDataURL('image/jpeg', 1.0));
      setIsProcessing(false);
    };
    img.src = transparentBase64;
  };

  const handleFile = async (file, side = null) => {
    if (!file) return;
    if (side) setCroppingSide(side);
    if (file.type === 'application/pdf') {
      try {
        const buffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        loadingTask.onPassword = (updatePassword) => {
          const pass = prompt("Enter Aadhaar Password:");
          if (pass) updatePassword(pass);
        };
        const pdf = await loadingTask.promise;
        const pdfPage = await pdf.getPage(1);
        const viewport = pdfPage.getViewport({ scale: 10.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;
        setSrc(canvas.toDataURL('image/jpeg', 1.0));
      } catch (err) { alert("Error loading PDF"); }
    } else {
      const reader = new FileReader();
      reader.onload = () => setSrc(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const applyCrop = () => {
    if (!completedCrop || !imgRef.current) return;
    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, canvas.width, canvas.height);
    const croppedData = canvas.toDataURL('image/jpeg', 1.0);
    if (layout === 'aadhar' && croppingSide) {
      setAadhar(prev => ({ ...prev, [croppingSide]: croppedData }));
    } else {
      setImage(croppedData);
    }
    setSrc(null);
  };

  const handlePrint = () => {
    const isCustom4x6 = layout === 'custom' && customPaper === '4x6';
    const isStandardSmall = ['pvc', 'aadhar'].includes(layout);
    const useSmallPaper = isCustom4x6 || isStandardSmall;
    const win = window.open('', '_blank');
    const w = useSmallPaper ? '3.98in' : '210mm';
    const h = useSmallPaper ? '5.98in' : '297mm';
    win.document.write(`
      <html>
        <head>
          <title>Photo Print</title>
          <style>
            @page { size: ${useSmallPaper ? '4in 6in' : 'A4'}; margin: 0 !important; }
            html, body { margin: 0; padding: 0; width: ${w}; height: ${h}; overflow: hidden; }
            .print-wrapper {
              width: ${w}; height: ${h}; display: flex; flex-wrap: wrap;
              gap: 1mm; padding: 2mm; box-sizing: border-box;
              justify-content: center; align-content: flex-start;
              background-color: white; -webkit-print-color-adjust: exact;
            }
            .id-size { width: 3.37in; height: 2.12in; border: 0.1mm solid #000; margin-bottom: 2mm; }
            .id-size img { width: 100%; height: 100%; object-fit: cover; }
            .custom-size { width: ${customW}in; height: ${customH}in; border: 0.1mm solid #000; margin: 1mm; }
            .custom-size img { width: 100%; height: 100%; object-fit: cover; }
          </style>
        </head>
        <body>
          <div class="print-wrapper">${printRef.current.innerHTML}</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // --- RENDER LOGIN VIEW IF NOT AUTHENTICATED ---
  if (!isAuthenticated) {
    return (
      <div className="login-container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <div className="card" style={{ width: '320px', padding: '30px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>🔐 Studio Login</h2>
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label>User ID</label>
              <input
                type="text"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                value={loginForm.userId}
                onChange={(e) => setLoginForm({ ...loginForm, userId: e.target.value })}
                required
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label>Password</label>
              <input
                type="password"
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
            </div>
            <button className="main-action-btn" type="submit" style={{ width: '100%' }}>Login</button>
          </form>
          <p style={{ fontSize: '10px', textAlign: 'center', marginTop: '15px', color: '#888' }}>
            Developed By Sammek Pravin Sovitkar
          </p>
        </div>
      </div>
    );
  }

  // --- MAIN APP VIEW (Returned only if authenticated) ---
  return (
    <div className="app-container">
      <header className="header">
        <h1>Photo Management - Developed By Sammek Pravin Sovitkar</h1>
        <button
          onClick={() => setIsAuthenticated(false)}
          style={{ position: 'absolute', right: '20px', background: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </header>
      <main className="main-content">
        <aside className="sidebar">

          <div className="card">
            <h4 className="section-title">1. Layout</h4>
            <div className="tab-grid">
              {layoutOptions.map(opt => (
                <button key={opt.value} className={`tab-btn ${layout === opt.value ? 'active' : ''}`}
                  onClick={() => { setLayout(opt.value); setImage(null); setAadhar({ front: null, back: null }); }}>
                  <span className="icon">{opt.icon}</span><span className="label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
    <div className="card">
            <h4 className="section-title">3. Upload & Print</h4>
            {layout === 'aadhar' ? (
              <div className="upload-group">
                <button className="upload-slot" onClick={() => document.getElementById('fIn').click()}>{aadhar.front ? "✅ Front OK" : "📁 Front ID"}</button>
                <button className="upload-slot" onClick={() => document.getElementById('bIn').click()}>{aadhar.back ? "✅ Back OK" : "📁 Back ID"}</button>
                <input id="fIn" type="file" hidden onChange={e => handleFile(e.target.files[0], 'front')} />
                <input id="bIn" type="file" hidden onChange={e => handleFile(e.target.files[0], 'back')} />
              </div>
            ) : (
              <button className="main-action-btn" onClick={() => document.getElementById('fileIn').click()}>
                📸 Upload File
                <input id="fileIn" type="file" hidden onChange={e => handleFile(e.target.files[0])} />
              </button>
            )}
            <button className="print-btn" onClick={handlePrint} disabled={!(image || aadhar.front)}>📤 PRINT NOW</button>
          </div>
          {layout === 'custom' && (
            <div className="card">
              <h4 className="section-title">Custom Settings</h4>
              <p style={{ fontSize: "12px", textAlign: "center" }}>for Passport - Width- 1.38 , Height - 1.72</p>
              <div style={{ display: 'flex', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                <div><label>Width (in)</label><input type="number" step="0.1" value={customW} onChange={e => setCustomW(e.target.value)} style={{ width: '100%', textAlign: "center" }} /></div>
                <div><label>Height (in)</label><input type="number" step="0.1" value={customH} onChange={e => setCustomH(e.target.value)} style={{ width: '100%', textAlign: "center" }} /></div>
                <div><label>Count</label><input type="number" value={customCount} onChange={e => setCustomCount(e.target.value)} style={{ width: '100%', textAlign: "center", marginBottom: '10px' }} /></div>

              </div>
              <label>Paper Size</label>
              <div className="tab-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>

                <button className={`tab-btn ${customPaper === '4x6' ? 'active' : ''}`} onClick={() => setCustomPaper('4x6')}>4x6</button>
                <button className={`tab-btn ${customPaper === 'a4' ? 'active' : ''}`} onClick={() => setCustomPaper('a4')}>A4</button>
              </div>
            </div>
          )}


          <div className="card">
            <h4 className="section-title">2. Background & Filters</h4>
            <div className="bg-controls">
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              <button className="bg-btn" onClick={handleRemoveBg} disabled={!image || isProcessing}>
                {isProcessing ? "⏳ Removing..." : "✨ Change Background"}
              </button>
            </div>
            <br />
            <label>Brightness: {brightness}%</label>
            <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(e.target.value)} className="slider" />
            <br />
            <label>Contrast: {contrast}%</label>
            <input type="range" min="50" max="150" value={contrast} onChange={e => setContrast(e.target.value)} className="slider" />
          </div>


        </aside>

        <section className="preview-pane">
          <div className="sheet" ref={printRef} style={{
            width: (layout === 'custom' ? (customPaper === '4x6' ? '384px' : '595px') : '384px'),
            height: (layout === 'custom' ? (customPaper === '4x6' ? '576px' : '842px') : '576px'),
            padding: '15px',
            display: 'flex',
            flexFlow: 'wrap',
            gap: '1mm',
            backgroundColor: '#fff',
            transform: 'scale(0.85)',
            transformOrigin: 'top center'
          }}>

            {layout === 'aadhar' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center', paddingTop: '40px' }}>
                <div className="id-size">
                  {aadhar.front ? (
                    <img src={aadhar.front} alt='front' style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }} />
                  ) : (
                    <span style={{ color: '#ccc' }}>Front Side</span>
                  )}
                </div>
                <div className="id-size">
                  {aadhar.back ? (
                    <img src={aadhar.back} alt='back' style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }} />
                  ) : (
                    <span style={{ color: '#ccc' }}>Back Side</span>
                  )}
                </div>
              </div>
            ) :
              layout === 'custom' ? (
                [...Array(parseInt(customCount) || 0)].map((_, i) => (
                  <div key={i} className="custom-size" style={{ width: `${customW}in`, height: `${customH}in` }}>
                    {(finalProcessedImg || image) ? (
                      <img src={finalProcessedImg || image} alt="img" />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#ccc' }}>Photo</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="id-size" style={{ margin: '40px auto' }}>
                  {(finalProcessedImg || image) ? (
                    <img src={finalProcessedImg || image} alt="img" />
                  ) : (
                    <span style={{ color: '#ccc' }}>PVC Card Photo</span>
                  )}
                </div>
              )}
          </div>
        </section>
      </main>

      {src && (
        <div className="modal-overlay">
          <div className="modal-body">
            <h3>Crop Photo</h3>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
              <img ref={imgRef} src={src} style={{ maxHeight: '80vh' }} alt="src" />
            </ReactCrop>
            <div className="modal-actions">
              <button className="main-action-btn" onClick={applyCrop}>Apply Crop</button>
              <button className="main-action-btn cancel" onClick={() => setSrc(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
