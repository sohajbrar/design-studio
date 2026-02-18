import './ExportModal.css'

const FORMAT_INFO = {
  mp4: { label: 'MP4', desc: 'Best compatibility. Works everywhere — browsers, phones, social media.' },
  webm: { label: 'WebM', desc: 'Fastest export (no conversion). Great for web use.' },
  mov: { label: 'MOV', desc: 'Apple ecosystem. Ideal for Final Cut Pro, Keynote, and macOS.' },
}

export default function ExportModal({ onClose, onRecord, quality, setQuality, exportFormat, setExportFormat }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Video</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="modal-field">
            <label>Format</label>
            <div className="format-options">
              {Object.entries(FORMAT_INFO).map(([key, { label }]) => (
                <button
                  key={key}
                  className={`format-chip ${exportFormat === key ? 'active' : ''}`}
                  onClick={() => setExportFormat(key)}
                >
                  <span className="format-chip-ext">.{key}</span>
                  <span className="format-chip-label">{label}</span>
                </button>
              ))}
            </div>
            <p className="format-desc">{FORMAT_INFO[exportFormat]?.desc}</p>
          </div>
          <div className="modal-field">
            <label>Quality</label>
            <div className="control-chips">
              {['720p', '1080p', '4k'].map((q) => (
                <button
                  key={q}
                  className={`chip ${quality === q ? 'active' : ''}`}
                  onClick={() => setQuality(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          {exportFormat !== 'webm' && (
            <div className="modal-info">
              <p>Recording will capture in WebM and then convert to {exportFormat.toUpperCase()} using FFmpeg. This may take a moment after recording finishes.</p>
            </div>
          )}
          {exportFormat === 'webm' && (
            <div className="modal-info">
              <p>WebM exports instantly with no post-processing needed.</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onRecord(); onClose(); }}>
            Export as .{exportFormat}
          </button>
        </div>
      </div>
    </div>
  )
}
