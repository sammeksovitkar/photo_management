import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './App.css';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
  const [count4x6, setCount4x6] = useState(12);

  const [src, setSrc] = useState(null);
  const [image, setImage] = useState(null);
  const [aadhar, setAadhar] = useState({ front: null, back: null });
  const [croppingSide, setCroppingSide] = useState(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageNo, setPageNo] = useState(1);

  const imgRef = useRef(null);
  const printRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();

  const renderPdfPage = async (doc, page) => {
    const pdfPage = await doc.getPage(page);
    const viewport = pdfPage.getViewport({ scale: 2.5 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
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

  const image = imgRef.current;
  const canvas = document.createElement('canvas');
  
  // 1. Calculate the high-res scale
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  // 2. Set canvas to the ACTUAL high-res pixels
  canvas.width = completedCrop.width * scaleX;
  canvas.height = completedCrop.height * scaleY;

  const ctx = canvas.getContext('2d');
  
  // 3. Use high-quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    completedCrop.x * scaleX,
    completedCrop.y * scaleY,
    completedCrop.width * scaleX,
    completedCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // 4. Export at 100% quality
  const croppedData = canvas.toDataURL('image/jpeg', 1.0);
  
  if (layout === 'aadhar' && croppingSide) {
    setAadhar(prev => ({ ...prev, [croppingSide]: croppedData }));
  } else {
    setImage(croppedData);
  }
  setSrc(null);
  setCroppingSide(null);
};

const handlePrint = () => {
  const isSmall = ['4x6_9', '2x2_6', 'pvc'].includes(layout);
  const win = window.open('', '_blank');

  win.document.write(`
    <html>
      <head>
        <title>Print Photo</title>
        <style>
          /* 1. Force the Page Size */
          @page { 
            size: ${isSmall ? '4in 6in' : 'A4'}; 
            margin: 0; 
          }
          
          /* 2. Setup HTML and Body to match the page size exactly */
          html, body { 
            margin: 0; 
            padding: 0; 
            width: ${isSmall ? '4in' : '210mm'};
            height: ${isSmall ? '6in' : '297mm'};
            overflow: hidden; 
            -webkit-print-color-adjust: exact; 
          }

          /* 3. The container must fill the body */
          .print-wrapper {
            width: 100%;
            height: 100%;
            display: flex;
            flex-wrap: wrap;
            gap: 2mm;
            padding: 2mm;
            box-sizing: border-box;
            justify-content: flex-start;
            align-content: flex-start;
          }

          /* 4. Photo Box Styles */
          .box {
            border: 0.1mm solid #000;
            overflow: hidden;
            width: ${layout === '4x6_9' ? '1.1in' : (layout === '2x2_6' ? '1.1in' : '2in')};
            height: ${layout === '4x6_9' ? '1.35in' : (layout === '2x2_6' ? '1.35in' : '2in')};
          }

          .aadhar-box { 
            width: 86mm; 
            height: 54mm; 
            border: 0.1mm solid #000; 
            margin: 2mm auto; 
          }

          img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            filter: brightness(${brightness}%) contrast(${contrast}%); 
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">${printRef.current.innerHTML}</div>
        <script>
          window.onload = () => { 
            // Small delay to ensure images are rendered before print dialog opens
            setTimeout(() => {
                window.print(); 
                window.close();
            }, 300);
          };
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
          {/* Section 1: Layout Selection */}
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

          {/* Section 2: 4x6 Specific Quantity */}
          {layout === '4x6_9' && (
            <div className="card">
              <h4 className="section-title">Quantity (12-Size Fixed)</h4>
              <div className="qty-grid">
                {[3, 9, 12].map(num => (
                  <button key={num} className={`qty-btn ${count4x6 === num ? 'active' : ''}`} onClick={() => setCount4x6(num)}>{num} Pcs</button>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Uploading */}
          <div className="card">
            <h4 className="section-title">2. Upload File</h4>
            {layout === 'aadhar' ? (
              <div className="upload-group">
                <button className="upload-slot" onClick={() => document.getElementById('fIn').click()}>{aadhar.front ? "✅ Front Ready" : "📁 Front PDF/Img"}</button>
                <button className="upload-slot" onClick={() => document.getElementById('bIn').click()}>{aadhar.back ? "✅ Back Ready" : "📁 Back PDF/Img"}</button>
                <input id="fIn" type="file" hidden onChange={e => handleFile(e.target.files[0], 'front')} />
                <input id="bIn" type="file" hidden onChange={e => handleFile(e.target.files[0], 'back')} />
              </div>
            ) : (
              <button className="main-action-btn" onClick={() => document.getElementById('fileIn').click()}>
                📸 Upload Photo or PDF
                <input id="fileIn" type="file" accept="image/*,application/pdf" hidden onChange={e => handleFile(e.target.files[0])} />
              </button>
            )}
          </div>

          {/* Section 4: Print & Adjustments (Always show Adjustments, only hide Print if no image) */}
          <div className="card">
            <h4 className="section-title">3. Controls</h4>
            <label>Brightness: {brightness}%</label>
            <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(e.target.value)} style={{width:'100%'}} />
            <br/><br/>
            <label>Contrast: {contrast}%</label>
            <input type="range" min="50" max="150" value={contrast} onChange={e => setContrast(e.target.value)} style={{width:'100%'}} />
            
            {/* The Print Button - Now easier to find */}
            <button 
                className="print-btn" 
                onClick={handlePrint}
                style={{ opacity: (image || aadhar.front || aadhar.back) ? 1 : 0.5 }}
                disabled={!(image || aadhar.front || aadhar.back)}
            >
                📤 PRINT LAYOUT
            </button>
          </div>
        </aside>

        <section className="preview-pane">
          <div className="sheet" ref={printRef} style={{
             width: layout === '4x6_9' ? '384px' : (['2x2_6','pvc'].includes(layout) ? '384px' : '595px'),
             height: layout === '4x6_9' ? '576px' : (['2x2_6','pvc'].includes(layout) ? '576px' : '842px'),
             transform: 'scale(0.75)',
             display: 'flex',
             flexWrap: 'wrap',
             gap: '10px',
             padding: '15px',
             justifyContent: 'flex-start',
             alignContent: 'flex-start',
             backgroundColor: '#fff'
           }}>
            {layout === 'aadhar' ? (
              <div className="aadhar-flex" style={{display: 'flex', flexDirection: 'column', gap: '15px',marginTop:"20%", width: '100%', alignItems: 'center'}}>
                <div className="aadhar-box" style={{width: '325px', height: '205px', border: '1px solid #000'}}>{aadhar.front && <img src={aadhar.front} style={{width:'100%', height:'100%', objectFit:'cover', filter: `brightness(${brightness}%) contrast(${contrast}%)` }} />}</div>
                <div className="aadhar-box" style={{width: '325px', height: '205px', border: '1px solid #000'}}>{aadhar.back && <img src={aadhar.back} style={{width:'100%', height:'100%', objectFit:'cover', filter: `brightness(${brightness}%) contrast(${contrast}%)` }} />}</div>
              </div>
            ) : (
              [...Array(layout === '4x6_9' ? count4x6 : (layout === '2x2_6' ? 6 : 1))].map((_, i) => (
                <div key={i} className="box" style={{
                  width: (layout === '4x6_9' || layout === '2x2_6') ? '106px' : (layout === 'pvc' ? '325px' : '560px'),
                  height: (layout === '4x6_9' || layout === '2x2_6') ? '130px' : (layout === 'pvc' ? '205px' : '800px'),
                  border: '1px solid #000',
                  overflow: 'hidden'
                }}>
                  {image && <img src={image} style={{width:'100%', height:'100%', objectFit:'cover', filter: `brightness(${brightness}%) contrast(${contrast}%)` }} />}
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
            {pdfDoc && pageCount > 1 && (
              <div className="pdf-nav">
                <button disabled={pageNo === 1} onClick={() => { const p = pageNo - 1; setPageNo(p); renderPdfPage(pdfDoc, p); }}>◀</button>
                <span>Page {pageNo}/{pageCount}</span>
                <button disabled={pageNo === pageCount} onClick={() => { const p = pageNo + 1; setPageNo(p); renderPdfPage(pdfDoc, p); }}>▶</button>
              </div>
            )}
            <ReactCrop crop={crop}  onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
              <img ref={imgRef} src={src} style={{ maxHeight: '60vh' }} alt="crop-src" />
            </ReactCrop>
            <div className="modal-footer">
              <button className="main-action-btn" onClick={applyCrop}>Finish Crop</button>
              <button className="main-action-btn cancel" onClick={() => setSrc(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}