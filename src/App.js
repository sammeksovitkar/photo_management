import React, { useState, useRef } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const layoutOptions = [
  { label: '4x6 Layout', value: '4x6_9', icon: '📱' },
  { label: 'A4 Full', value: 'a4', icon: '📄' },
  { label: 'PVC Card', value: 'pvc', icon: '💳' },
  { label: 'Passport', value: '2x2_6', icon: '👤' },
  { label: 'Multi A4', value: 'multi_a4', icon: '📑' },
  { label: 'Aadhar', value: 'aadhar', icon: '🆔' },
  { label: 'Custom', value: 'custom', icon: '⚙️' },
];

export default function App() {
  const [layout, setLayout] = useState('4x6_9');
  const [image, setImage] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  
  const [count4x6, setCount4x6] = useState(9);
  const [multiImages, setMultiImages] = useState([]);
  const [aadhar, setAadhar] = useState({ front: null, back: null });
  const [custom, setCustom] = useState({ w: 2, h: 2, qty: 1 });

  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();

  const imgRef = useRef(null);
  const printRef = useRef(null);

  /* ---------------- 1. SINGLE IMAGE SELECTION (WITH CROP) ---------------- */
  const onFileSelect = (e) => {
    if (!e.target.files?.length) return;
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result);
    reader.readAsDataURL(e.target.files[0]);
  };

  /* ---------------- 2. MULTI IMAGE SELECTION (A4 GRID) ---------------- */
  const handleMultiUpload = (e) => {
    const files = Array.from(e.target.files);
    const readers = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(results => setMultiImages(results));
  };

  /* ---------------- 3. CROP LOGIC ---------------- */
  const handleApplyCrop = () => {
    if (!completedCrop || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgRef.current, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
    setImage(canvas.toDataURL('image/jpeg'));
    setSrc(null);
  };

  /* ---------------- 4. PRINT COMMAND ---------------- */
/* ---------------- FIXED PRINT COMMAND ---------------- */
 const handlePrint = () => {
  if (!printRef.current) return;

  const is4x6 = ['4x6_9', '2x2_6', 'pvc'].includes(layout);
  const content = printRef.current.innerHTML;

  const win = window.open('', '_blank', 'width=800,height=600');

  win.document.open();
  win.document.write(`
    <html>
      <head>
        <title>Print</title>
        <style>
          @page {
            size: ${is4x6 ? '4in 6in' : 'A4'};
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }

          /* EXACT 4x6 CANVAS */
          .print-wrapper {
            width: 4in;
            height: 6in;
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
            justify-content: center;
            box-sizing: border-box;
          }

          /* PHOTO BOX – NO EXTRA SPACE */
          .box {
            width: ${layout === '4x6_9' && count4x6 === 12 ? '1.33in' : '1.25in'};
            height: ${layout === '4x6_9' && count4x6 === 12 ? '1.5in' : '1.5in'};
            box-sizing: border-box;
            border: 0.2mm solid #000;
          }

          img {
            width: 100%;
            height: 100%;
            object-fit: fill;
            filter: brightness(${brightness}%) contrast(${contrast}%);
            display: block;
          }

          /* 🚫 PREVENT PAGE BREAKS */
          * {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        </style>
      </head>

      <body>
        <div class="print-wrapper">
          ${content}
        </div>

        <script>
          window.onload = function () {
            window.focus();
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  win.document.close();
};



const renderLayoutContent = () => {
    const filterStyle = { 
      filter: `brightness(${brightness}%) contrast(${contrast}%)`, 
      width: '100%', 
      height: '100%', 
      objectFit: 'fill' 
    };

    // LOCK SIZES (Standard Passport Size: ~1.2in x 1.5in)
    // This ensures 3, 9, or 12 photos look the same size.
    const standardWidth = '106px'; 
    const standardHeight = '125px';

    let photoCount = 1;

    if (layout === '4x6_9') {
        photoCount = count4x6; // This will be 3, 9, or 12 based on your button click
    } else if (layout === '2x2_6') {
        photoCount = 6;
    } else if (layout === 'pvc') {
        photoCount = 1;
    } else if (layout === 'a4') {
        photoCount = 1;
    }

    // Determine width/height for the specific layout
    const w = (layout === '4x6_9' || layout === '2x2_6') ? standardWidth : (layout === 'pvc' ? '330px' : '500px');
    const h = (layout === '4x6_9' || layout === '2x2_6') ? standardHeight : (layout === 'pvc' ? '210px' : '700px');

    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: '10px', 
        padding: '10px',
        maxWidth: '100%' 
      }}>
        {[...Array(photoCount)].map((_, i) => (
          <div key={i} className="box" style={{ 
            width: w, 
            height: h, 
            border: '1px solid #000', 
            backgroundColor: '#fff' 
          }}>
            {image && <img src={image} style={filterStyle} alt="print-out" />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h2 style={{margin:0}}>Photo Print Pro</h2>
        <span style={{fontSize: 12, opacity: 0.8}}>Studio Print Dashboard</span>
      </div>

      <div style={styles.container}>
        <div style={styles.sidebar}>
          
          <div style={styles.card}>
            <h4 style={styles.sectionTitle}>1. Select Layout</h4>
            <div style={styles.tabGrid}>
              {layoutOptions.map(opt => (
                <button key={opt.value} 
                  style={layout === opt.value ? styles.activeTab : styles.tab}
                  onClick={() => { setLayout(opt.value); setImage(null); setMultiImages([]); setAadhar({front:null, back:null}); }}>
                  <div style={{fontSize: 20}}>{opt.icon}</div>
                  <div style={{fontSize: 10, fontWeight: 'bold'}}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <button style={styles.mainPickBtn} onClick={() => document.getElementById('fileInput').click()}>
            📸 Select & Snip Photo
            <input id="fileInput" type="file" hidden multiple={layout === 'multi_a4'} 
               onChange={(e) => layout === 'multi_a4' ? handleMultiUpload(e) : onFileSelect(e)} />
          </button>

          {layout === 'custom' && (
            <div style={styles.card}>
                <h4 style={styles.sectionTitle}>Custom Print Settings</h4>
                <div style={styles.inputRow}>
                    <input style={styles.smallInput} type="number" placeholder="W" onChange={e => setCustom({...custom, w: e.target.value})} />
                    <input style={styles.smallInput} type="number" placeholder="H" onChange={e => setCustom({...custom, h: e.target.value})} />
                    <input style={styles.smallInput} type="number" placeholder="Qty" onChange={e => setCustom({...custom, qty: e.target.value})} />
                </div>
            </div>
          )}

          {layout === '4x6_9' && (
            <div style={styles.card}>
                <h4 style={styles.sectionTitle}>Photos on 4x6 Sheet</h4>
                <div style={styles.countRow}>
                    {[3, 9, 12].map(n => (
                        <button key={n} onClick={() => setCount4x6(n)} style={count4x6 === n ? styles.activeCount : styles.countBtn}>{n}</button>
                    ))}
                </div>
            </div>
          )}

          {layout === 'aadhar' && (
              <div style={styles.card}>
                  <h4 style={styles.sectionTitle}>Aadhar Front & Back</h4>
                  <button onClick={() => document.getElementById('aFront').click()} style={styles.subBtn}>Upload Front</button>
                  <button onClick={() => document.getElementById('aBack').click()} style={styles.subBtn}>Upload Back</button>
                  <input id="aFront" type="file" hidden onChange={e => {
                      const r = new FileReader(); r.onload = () => setAadhar(p => ({...p, front: r.result})); r.readAsDataURL(e.target.files[0]);
                  }} />
                  <input id="aBack" type="file" hidden onChange={e => {
                      const r = new FileReader(); r.onload = () => setAadhar(p => ({...p, back: r.result})); r.readAsDataURL(e.target.files[0]);
                  }} />
              </div>
          )}

          {(image || multiImages.length > 0 || aadhar.front) && (
            <div style={styles.card}>
               <h4 style={styles.sectionTitle}>Image Adjustments</h4>
               <label style={{fontSize: 11}}>Brightness: {brightness}%</label>
               <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(e.target.value)} style={{width:'100%', marginBottom: 10}} />
               <label style={{fontSize: 11}}>Contrast: {contrast}%</label>
               <input type="range" min="50" max="150" value={contrast} onChange={e => setContrast(e.target.value)} style={{width:'100%'}} />
               <button onClick={handlePrint} style={styles.printBtn}>📤 PRINT LAYOUT</button>
            </div>
          )}
        </div>

        <div style={styles.previewPane}>
          <div style={styles.zoomWrapper(layout)}>
            <div ref={printRef} style={styles.sheet(layout)}>
                {renderLayoutContent()}
            </div>
          </div>
        </div>
      </div>

      {src && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
             <h3 style={{marginTop:0}}>Adjust Frame</h3>
             <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                <img ref={imgRef} src={src} style={{maxHeight:'60vh'}} />
             </ReactCrop>
             <button onClick={handleApplyCrop} style={styles.mainPickBtn}>Apply & Finish</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  app: { background: '#f8f9fa', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  header: { background: '#1a2a6c', color: '#fff', padding: '20px', textAlign: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  container: { display: 'flex', padding: 20, gap: 20, maxWidth: 1200, margin: '0 auto' },
  sidebar: { width: 350, display: 'flex', flexDirection: 'column', gap: 15 },
  card: { background: '#fff', padding: 15, borderRadius: 15, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee' },
  sectionTitle: { margin: '0 0 10px 0', fontSize: 13, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tabGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  tab: { background: '#f8f9fa', border: '1px solid #eee', padding: 10, borderRadius: 12, cursor: 'pointer' },
  activeTab: { background: '#1a2a6c', border: '1px solid #1a2a6c', color: '#fff', padding: 10, borderRadius: 12, cursor: 'pointer' },
  mainPickBtn: { background: '#00bcd4', color: '#fff', padding: 15, border: 'none', borderRadius: 15, fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: 10 },
  printBtn: { background: '#1a2a6c', color: '#fff', padding: 15, border: 'none', borderRadius: 15, fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: 15 },
  inputRow: { display: 'flex', gap: 5 },
  smallInput: { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' },
  countRow: { display: 'flex', gap: 10, justifyContent: 'center' },
  countBtn: { width: 45, height: 45, borderRadius: 12, border: '1px solid #ddd', background: '#fff' },
  activeCount: { width: 45, height: 45, borderRadius: 12, background: '#00bcd4', color: '#fff', border: 'none', fontWeight: 'bold' },
  subBtn: { width: '100%', padding: '10px', marginBottom: 5, borderRadius: 8, border: '1px solid #eee', cursor: 'pointer' },
  previewPane: { flex: 1, background: '#ced4da', borderRadius: 20, display: 'flex', justifyContent: 'center', padding: 40, overflow: 'hidden' },
  zoomWrapper: (layout) => ({ transform: ['4x6_9','2x2_6','pvc'].includes(layout) ? 'scale(1)' : 'scale(0.6)', transformOrigin: 'top center' }),
  sheet: (layout) => ({
    width: ['4x6_9','2x2_6','pvc'].includes(layout) ? '384px' : '595px',
    height: ['4x6_9','2x2_6','pvc'].includes(layout) ? '576px' : '842px',
    background: '#fff',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    display: 'block'
  }),
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: 25, borderRadius: 20, textAlign: 'center', maxWidth: '90%' }
};