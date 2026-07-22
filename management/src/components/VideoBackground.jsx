import { useEffect, useRef, useState } from "react";

export default function VideoBackground() {
  const glowRef = useRef(null);
  const videoRef = useRef(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    let raf;
    let mx = 0;
    let my = 0;
    let cx = 0;
    let cy = 0;

    function onMove(e) {
      mx = e.clientX;
      my = e.clientY;
    }

    function tick() {
      cx += (mx - cx) * 0.08;
      cy += (my - cy) * 0.08;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${cx - 200}px, ${cy - 200}px)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="vb-root" aria-hidden="true">
      {!videoFailed && (
        <video
          ref={videoRef}
          className="vb-video"
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoFailed(true)}
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>
      )}
      <div className="vb-overlay" />
      <div className="vb-glow" ref={glowRef} />
      <div className="vb-orb vb-orb-1" />
      <div className="vb-orb vb-orb-2" />
      <div className="vb-orb vb-orb-3" />
      <div className="vb-shape vb-shape-hex vb-shape-1" />
      <div className="vb-shape vb-shape-hex vb-shape-2" />
      <div className="vb-shape vb-shape-ring vb-shape-3" />
      <div className="vb-shape vb-shape-dot vb-shape-4" />
      <div className="vb-shape vb-shape-dot vb-shape-5" />
    </div>
  );
}
