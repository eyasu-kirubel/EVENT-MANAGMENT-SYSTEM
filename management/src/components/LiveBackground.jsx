import { useEffect, useRef } from "react";

export default function LiveBackground() {
  const glowRef = useRef(null);

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
    <div className="lb-root" aria-hidden="true">
      <div className="lb-glow" ref={glowRef} />
      <div className="lb-orb lb-orb-1" />
      <div className="lb-orb lb-orb-2" />
      <div className="lb-orb lb-orb-3" />
      <div className="lb-orb lb-orb-4" />
      <div className="lb-orb lb-orb-5" />
      <div className="lb-shape lb-shape-hex lb-shape-1" />
      <div className="lb-shape lb-shape-hex lb-shape-2" />
      <div className="lb-shape lb-shape-ring lb-shape-3" />
      <div className="lb-shape lb-shape-ring lb-shape-4" />
      <div className="lb-shape lb-shape-dot lb-shape-5" />
      <div className="lb-shape lb-shape-dot lb-shape-6" />
      <div className="lb-shape lb-shape-dot lb-shape-7" />
    </div>
  );
}
