import { useEffect, useRef, useState, useCallback } from "react";
import { BsCameraVideo, BsCheckCircle, BsQrCodeScan, BsXCircle } from "react-icons/bs";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../../utils/api";

const SCANNER_ID = "organizer-qr-reader";
const COOLDOWN_MS = 3000;

export default function OrganizerScanner() {
  const scannerRef = useRef(null);
  const cooldownRef = useRef(null);
  const busyRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      clearCooldown();
      stopCamera();
    };
  }, []);

  function clearCooldown() {
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }
  }

  async function startCamera() {
    setMessage("");
    setResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera access is not available in this browser. Use the manual ticket ID field below.");
      return;
    }

    try {
      await stopCamera();

      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        throw new Error("No camera was found. Please connect a camera and allow camera permission.");
      }

      const backCamera =
        cameras.find((camera) => /back|rear|environment/i.test(camera.label)) ||
        cameras[0];

      setRunning(true);

      await scanner.start(
        backCamera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          console.log("QR DETECTED:", decodedText);
          if (busyRef.current || cooldownRef.current) {
            return;
          }
          await stopCamera();
          await submitScan(decodedText);
        },
        () => {}
      );

      console.log("QR scanner started");
    } catch (err) {
      scannerRef.current = null;
      setRunning(false);
      setMessage(
        err?.message ||
          "Camera access was blocked. Allow camera permission and try again."
      );
    }
  }

  async function stopCamera() {
    const scanner = scannerRef.current;

    if (!scanner) {
      setRunning(false);
      return;
    }

    try {
      const state = scanner.getState?.();
      if (state === 2) {
        await scanner.stop();
      }
    } catch {}

    try {
      scanner.clear();
    } catch {}

    scannerRef.current = null;
    setRunning(false);
  }

  const submitScan = useCallback(async (value) => {
    const raw = String(value || "").trim();
    if (!raw) return;

    busyRef.current = true;
    setBusy(true);
    setMessage("");
    setResult(null);

    try {
      const data = await api.post("/attendance/scan", { qrData: raw });
      setResult({ ok: data.success === true, status: data.status, data });
      setManual("");
    } catch (err) {
      const msg = err?.message || "The ticket could not be scanned.";
      let status = "INVALID";
      if (/not authorized|forbidden/i.test(msg)) status = "REJECTED";
      setResult({ ok: false, status, data: { message: msg } });
    } finally {
      setBusy(false);
      busyRef.current = false;
      clearCooldown();
      cooldownRef.current = setTimeout(() => {
        setResult(null);
        cooldownRef.current = null;
      }, COOLDOWN_MS);
    }
  }, []);

  return (
    <section className="page dashboard-page">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Attendance</span>
          <h2>QR code scanner</h2>
          <p>Scan attendee tickets quickly at the entrance.</p>
        </div>
        <div className="section-icon"><BsQrCodeScan /></div>
      </div>

      <div className="scanner-layout">
        <div className="surface-card scanner-card">
          <div className="scanner-preview">
            <div
              id={SCANNER_ID}
              className={`html5-qr-reader ${running ? "active" : ""}`}
            />

            {!running && !result && (
              <div className="scanner-placeholder">
                <BsQrCodeScan />
                <span>Camera preview</span>
              </div>
            )}

            {running && <div className="scanner-frame" />}
          </div>

          <div className="scanner-actions">
            {!running ? (
              <button
                className="btn btn-primary"
                onClick={startCamera}
                disabled={busy}
              >
                <BsCameraVideo /> Start camera
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={stopCamera}>
                Stop camera
              </button>
            )}
          </div>

          {message && <div className="notice warning">{message}</div>}

          {result && (
            <div className={`scanner-status-indicator scanner-status-${result.status === "APPROVED" ? "approved" : "expired"}`}>
              <div className="scanner-status-dot" />
              <div className="scanner-status-text">
                <strong>{result.status}</strong>
                <span>{result.data?.message || "Unknown result."}</span>
              </div>
              {result.ok && result.data?.event && (
                <div className="scanner-status-event">
                  {result.data.event.title} &middot; {result.data.event.location}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="surface-card scanner-manual-card">
          <h3>Manual scan</h3>
          <p>Paste the ticket ID or the QR payload if camera scanning is unavailable.</p>

          <div className="manual-scan-row">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Ticket ID or QR payload"
              onKeyDown={(e) => { if (e.key === "Enter" && manual.trim() && !busy) submitScan(manual); }}
            />
            <button
              className="btn btn-primary"
              disabled={busy || !manual.trim()}
              onClick={() => submitScan(manual)}
            >
              {busy ? "Checking..." : "Check in"}
            </button>
          </div>

          {result && (
            <div className={`scan-feedback ${result.ok ? "success" : "error"}`}>
              {result.ok ? <BsCheckCircle /> : <BsXCircle />}
              <div>
                <strong>{result.status}</strong>
                <p>
                  {result.data?.message ||
                    (result.ok
                      ? "Attendance updated successfully."
                      : "The ticket could not be scanned.")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
