import { useState, useRef } from "react";
import { api } from "../../utils/api";

export default function ScannerPage() {
  const [qrInput, setQrInput] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  async function handleScan(e) {
    e.preventDefault();
    if (!qrInput.trim()) return;
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const data = await api.post("/attendance/scan", { qrData: qrInput.trim() });
      setResult(data);
      setHistory((prev) => [{ ...data, id: Date.now() }, ...prev].slice(0, 20));
      setQrInput("");
    } catch (err) {
      try {
        const errData = JSON.parse(err.message);
        setError(err.message);
      } catch {
        setError(err.message);
      }
      // Try to parse the error for duplicate scanning info
      try {
        const parsed = JSON.parse(qrInput.trim());
        if (parsed.userId && parsed.eventId) {
          // Show partial info even on error
        }
      } catch {}
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function clearResult() {
    setResult(null);
    setError("");
  }

  return (
    <div className="scan-page">
      <div className="scan-header">
        <div className="scan-header-top">
          <div>
            <h1>QR Scanner</h1>
            <p className="scan-subtitle">Scan attendee tickets for check-in</p>
          </div>
          <div className="scan-live-badge">
            <span className="scan-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* Scanner Input */}
      <div className="scan-input-section">
        <form onSubmit={handleScan} className="scan-form">
          <div className="scan-input-wrap">
            <div className="scan-input-icon">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="13" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="2" y="13" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="13" y="13" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="18" y="18" width="2" height="2" rx="0.5" fill="currentColor" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Paste QR code data here..."
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="scan-btn" disabled={loading || !qrInput.trim()}>
            {loading ? (
              <span className="scan-spinner" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M9 5V9L12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Scan
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result Card */}
      {result && (
        <div className={`scan-result ${result.status === "duplicate" ? "duplicate" : "success"}`} key={result.scannedAt}>
          <div className="scan-result-icon">
            {result.status === "duplicate" ? (
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
                <path d="M14 14L26 26M26 14L14 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
                <path d="M12 20L17.5 25.5L28 14.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <div className="scan-result-content">
            <h2 className="scan-result-title">
              {result.status === "duplicate" ? "Already Checked In" : "Welcome!"}
            </h2>

            <div className="scan-result-event">
              <span className="scan-result-event-label">Event</span>
              <span className="scan-result-event-name">{result.event?.title}</span>
            </div>

            <div className="scan-result-details">
              <div className="scan-result-detail">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2 13C2 10 4.2 8 7 8C9.8 8 12 10 12 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <div>
                  <span className="scan-detail-label">Attendee</span>
                  <span className="scan-detail-value">{result.attendee?.fullname}</span>
                </div>
              </div>

              <div className="scan-result-detail">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="7" cy="11" r="0.8" fill="currentColor" />
                </svg>
                <div>
                  <span className="scan-detail-label">Phone</span>
                  <span className="scan-detail-value">{result.attendee?.phonenumber}</span>
                </div>
              </div>

              <div className="scan-result-detail">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5C4.5 1.5 2.5 3.5 2.5 6C2.5 9.5 7 12.5 7 12.5C7 12.5 11.5 9.5 11.5 6C11.5 3.5 9.5 1.5 7 1.5Z" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="7" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <div>
                  <span className="scan-detail-label">Location</span>
                  <span className="scan-detail-value">{result.event?.location}</span>
                </div>
              </div>

              <div className="scan-result-detail">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1.5 5.5H12.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 1V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M9.5 1V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <div>
                  <span className="scan-detail-label">Date</span>
                  <span className="scan-detail-value">{result.event?.startDate} — {result.event?.endDate}</span>
                </div>
              </div>

              <div className="scan-result-detail">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="4" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1.5 6.5H12.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <div>
                  <span className="scan-detail-label">Ticket</span>
                  <span className="scan-detail-value">#{result.ticketId} &middot; Qty: {result.quantity}</span>
                </div>
              </div>
            </div>

            <div className="scan-result-time">
              {result.status === "duplicate"
                ? `Originally scanned: ${new Date(result.scannedAt).toLocaleString()}`
                : `Checked in: ${new Date(result.scannedAt).toLocaleString()}`
              }
            </div>
          </div>

          <button className="scan-result-close" onClick={clearResult}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4L14 14M4 14L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Error */}
      {error && !result && (
        <div className="scan-error" key={error}>
          <div className="scan-error-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
              <path d="M16 10V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="22" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h3>Scan Failed</h3>
            <p>{error}</p>
          </div>
          <button className="scan-error-close" onClick={clearResult}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M3 11L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Scan History */}
      {history.length > 0 && (
        <div className="scan-history">
          <h3>Recent Scans</h3>
          <div className="scan-history-list">
            {history.map((h) => (
              <div key={h.id} className={`scan-history-item ${h.status}`}>
                <div className="scan-history-status">
                  {h.status === "duplicate" ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="scan-history-info">
                  <span className="scan-history-name">{h.attendee?.fullname}</span>
                  <span className="scan-history-event">{h.event?.title}</span>
                </div>
                <span className={`scan-history-badge ${h.status}`}>
                  {h.status === "duplicate" ? "Duplicate" : "Checked In"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
