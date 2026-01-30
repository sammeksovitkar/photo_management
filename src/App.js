import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './App.css';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const REMOVE_BG_API_KEY = process.env.REACT_APP_REMOVE_BG_KEY 
const layoutOptions = [
  { label: '4x6 Layout', value: '4x6_9', icon: '📱' },
  { label: 'A4 Full', value: 'a4', icon: '📄' },
  { label: 'PVC Card', value: 'pvc', icon: '💳' },
  { label: 'Passport', value: '2x2_6', icon: '👤' },
  { label: 'Aadhar', value: 'aadhar', icon: '🆔' },
];

export default function App() {
  const [layout, setLayout] = useState('4x6_9');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [count4x6, setCount4x6] = useState(12); // Default count
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isProcessing, setIsProcessing] = useState(false);

  const [src, setSrc] = useState(null);
  const [image, setImage] = useState(null); 
  const [finalProcessedImg, setFinalProcessedImg] = useState(null); 
  const [aadhar, setAadhar] = useState({ front: null, back: null });
  const [croppingSide, setCroppingSide] = useState(null);

  // Unused state kept for logic compatibility but satisfied for build
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageNo, setPageNo] = useState(1);

  const imgRef = useRef(null);
  const printRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();

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
      reader.onloadend = () => {
        applyNewBackground(reader.result);
      };
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
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setImage(canvas.toDataURL('image/jpeg', 1.0));
      setIsProcessing(false);
    };
    img.src = transparentBase64;
  };

  const renderPdfPage = async (doc, page) => {
    const pdfPage = await doc.getPage(page);
    const viewport = pdfPage.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    setSrc(canvas.toDataURL('image/jpeg', 0.95));
  };

  const handleFile = async (file, side = null) => {
    if (!file) return;
    if (side) setCroppingSide(side);
    if (file.type === 'application/pdf') {
      const buffer = await file.arrayBuffer();
      const task = pdfjsLib.getDocument({ data: buffer });
      const pdf = await task.promise;
      setPdfDoc(pdf);
      setPageCount(pdf.numPages);
      setPageNo(1);
      renderPdfPage(pdf, 1);
    } else {
      setPdfDoc(null);
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
    const isSmall = ['4x6_9', '2x2_6', 'pvc', 'aadhar'].includes(layout);
    const win = window.open('', '_blank');
    const w = isSmall ? '3.98in' : '210mm';
    const h = isSmall ? '5.98in' : '297mm';

    win.document.write(`
      <html>
        <head>
          <title>Photo Print</title>
          <style>
            @page { size: ${isSmall ? '4in 6in' : 'A4'}; margin: 0 !important; }
            html, body { margin: 0; padding: 0; width: ${w}; height: ${h}; overflow: hidden; }
            .print-wrapper {
              width: ${w}; height: ${h}; display: flex; flex-wrap: wrap;
              gap: 1mm; padding: 2mm; box-sizing: border-box;
              justify-content: center; align-content: flex-start;
              background-color: white; -webkit-print-color-adjust: exact;
            }
            .box { border: 0.1mm solid #000; overflow: hidden; width: 1.1in; height: 1.4in; margin: 1mm; }
            .box img, .aadhar-box img { width: 100%; height: 100%; object-fit: cover; }
            /* ID Card Specific Sizes */
            .id-size { width: 3.37in; height: 2.12in; border: 0.1mm solid #000; margin-bottom: 2mm; }
            .passport-size { width: 1in; height: 1.3in; }
          </style>
        </head>
        <body>
          <div class="print-wrapper">${printRef.current.innerHTML}</div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="app-container">
      <header className="header"><h1>Photo Studio Pro</h1></header>

      <main className="main-content">
        <aside className="sidebar">
          <div className="card">
            <h4 className="section-title">1. Layout</h4>
            <div className="tab-grid">
              {layoutOptions.map(opt => (
                <button key={opt.value} className={`tab-btn ${layout === opt.value ? 'active' : ''}`} 
                  onClick={() => { setLayout(opt.value); setImage(null); setAadhar({front:null, back:null}); }}>
                  <span className="icon">{opt.icon}</span><span className="label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ADDED: Count Buttons for 4x6 Layout */}
          {layout === '4x6_9' && (
            <div className="card">
              <h4 className="section-title">Photo Count</h4>
              <div className="tab-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {[3, 9, 12].map(num => (
                  <button 
                    key={num} 
                    className={`tab-btn ${count4x6 === num ? 'active' : ''}`} 
                    onClick={() => setCount4x6(num)}
                  >
                    <span className="label">{num} Pcs</span>
                  </button>
                ))}
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
            <br/>
            <label>Brightness: {brightness}%</label>
            <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(e.target.value)} className="slider" />
            <br/>
            <label>Contrast: {contrast}%</label>
            <input type="range" min="50" max="150" value={contrast} onChange={e => setContrast(e.target.value)} className="slider" />
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

          {/* Developer Name */}
          <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
            Developer: <b>Sammek Pravin Sovitkar</b>
          </div>
        </aside>

        <section className="preview-pane">
          <div className="sheet" ref={printRef} style={{
             width: ['4x6_9','2x2_6'].includes(layout) ? '384px' : '595px',
             height: ['4x6_9','2x2_6'].includes(layout) ? '576px' : '842px',
             display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '15px',
             backgroundColor: '#fff', transform: 'scale(0.85)', transformOrigin: 'top center'
           }}>
            {layout === 'aadhar' ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center', paddingTop: '40px'}}>
                <div className="id-size">{aadhar.front && <img src={aadhar.front} alt='f' style={{filter: `brightness(${brightness}%) contrast(${contrast}%)`}} />}</div>
                <div className="id-size">{aadhar.back && <img src={aadhar.back} alt='b' style={{filter: `brightness(${brightness}%) contrast(${contrast}%)`}} />}</div>
              </div>
            ) : (
              [...Array(layout === '4x6_9' ? count4x6 : (layout === '2x2_6' ? 6 : 1))].map((_, i) => (
                <div key={i} className={`box ${layout === 'pvc' ? 'id-size' : 'passport-size'}`} 
                     style={{width: layout === 'a4' ? '100%' : '', height: layout === 'a4' ? '100%' : ''}}>
                  {finalProcessedImg && <img src={finalProcessedImg} alt="img" />}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {src && (
        <div className="modal-overlay">
          <div className="modal-body">
            <h3>Crop Photo</h3>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
              <img ref={imgRef} src={src} style={{ maxHeight: '60vh' }} alt="src" />
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
