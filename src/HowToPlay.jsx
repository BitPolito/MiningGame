import React from 'react';
import ReactMarkdown from 'react-markdown';
import easyGuide from './guides/EasyGuide.md?raw';
import hardGuide from './guides/HardGuide.md?raw';

export default function HowToPlay({ difficulty, onClose }) {
  const guideContent = difficulty === 'easy' ? easyGuide : hardGuide;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-white)', border: '3px solid var(--color-blue)', borderRadius: '12px', padding: '30px 30px 20px 30px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', overflow: 'hidden', position: 'relative', color: 'var(--color-blue)' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px dashed rgba(0, 28, 224, 0.2)', flexShrink: 0 }}>
          <h2 style={{ color: 'var(--color-blue)', margin: 0, fontFamily: 'system-ui', fontSize: '1.6rem', fontWeight: 'bold' }}>
            How to Play ({difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Mode)
          </h2>
          <button className="modal-close" onClick={onClose} style={{ cursor: 'pointer', background: 'none', border: 'none', fontSize: '1.8rem', color: 'var(--color-blue)', padding: '0 5px', lineHeight: 1 }}>✖</button>
        </div>
        <div className="readme-text" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '20px' }}>
          <ReactMarkdown>{guideContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
