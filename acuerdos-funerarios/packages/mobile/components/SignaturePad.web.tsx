/**
 * Web-only signature pad using HTML5 Canvas API.
 * Prevents page scroll only while actively drawing, restores it on lift.
 */
import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { View, StyleSheet } from "react-native";

export type SignaturePadRef = {
  clear: () => void;
  getBase64: () => string | null;
};

type Props = {
  onSigned?: (base64: string | null) => void;
  height?: number;
};

const SignaturePad = forwardRef<SignaturePadRef, Props>(
  ({ onSigned, height = 220 }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const drawing = useRef(false);
    const hasStroke = useRef(false);

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasStroke.current = false;
        onSigned?.(null);
      },
      getBase64: () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasStroke.current) return null;
        return canvas.toDataURL("image/png");
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // HiDPI / Retina support
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.offsetWidth || 340;
      const cssHeight = height;

      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#F5F5F5";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Helpers to prevent body scroll while drawing
      const lockScroll = () => {
        document.body.style.overflow = "hidden";
        document.body.style.touchAction = "none";
      };
      const unlockScroll = () => {
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
      };

      const getPos = (e: MouseEvent | TouchEvent) => {
        const r = canvas.getBoundingClientRect();
        if ("touches" in e && e.touches.length > 0) {
          return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
        }
        return { x: (e as MouseEvent).clientX - r.left, y: (e as MouseEvent).clientY - r.top };
      };

      const onStart = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        lockScroll();
        drawing.current = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };

      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!drawing.current) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        hasStroke.current = true;
      };

      const onEnd = (_e: Event) => {
        if (!drawing.current) return;
        drawing.current = false;
        unlockScroll();
        if (hasStroke.current) {
          onSigned?.(canvas.toDataURL("image/png"));
        }
      };

      canvas.addEventListener("mousedown", onStart);
      canvas.addEventListener("mousemove", onMove);
      canvas.addEventListener("mouseup", onEnd);
      canvas.addEventListener("mouseleave", onEnd);
      canvas.addEventListener("touchstart", onStart, { passive: false });
      canvas.addEventListener("touchmove", onMove, { passive: false });
      canvas.addEventListener("touchend", onEnd, { passive: true });
      canvas.addEventListener("touchcancel", onEnd, { passive: true });

      return () => {
        unlockScroll(); // safety: always restore on unmount
        canvas.removeEventListener("mousedown", onStart);
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mouseup", onEnd);
        canvas.removeEventListener("mouseleave", onEnd);
        canvas.removeEventListener("touchstart", onStart);
        canvas.removeEventListener("touchmove", onMove);
        canvas.removeEventListener("touchend", onEnd);
        canvas.removeEventListener("touchcancel", onEnd);
      };
    }, [height, onSigned]);

    return (
      // @ts-ignore — div is valid on web via react-native-web
      <div ref={wrapperRef} style={{ width: "100%", height, borderRadius: 10, overflow: "hidden" }}>
        {/* @ts-ignore */}
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height,
            display: "block",
            cursor: "crosshair",
            touchAction: "none",
            backgroundColor: "#1C1C1C",
            borderRadius: 10,
          }}
        />
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
export default SignaturePad;

// Fallback styles (not used in web but needed for TS)
const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    backgroundColor: "#1C1C1C",
    borderRadius: 10,
    overflow: "hidden",
  },
});
