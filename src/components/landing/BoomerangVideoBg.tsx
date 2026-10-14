import React, { useEffect, useRef, useState } from 'react';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_090628_7052d8a6-a094-4341-a4a2-ad58493a67a9.mp4';
const CAPTURE_MAX_WIDTH = 960;
const PLAYBACK_FPS = 30;
const FRAME_INTERVAL = 1000 / PLAYBACK_FPS;

/**
 * BoomerangVideoBg
 * Plays video once while capturing frames at <=960px width to offscreen canvases.
 * On ended, switches seamlessly to display canvas and executes continuous ping-pong
 * (boomerang) forward <-> reverse playback at 30fps.
 */
export const BoomerangVideoBg: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [framesReady, setFramesReady] = useState(false);
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const isCapturingRef = useRef(false);
  const lastCapturedTimeRef = useRef(-1);

  useEffect(() => {
    const video = videoRef.current;
    const displayCanvas = canvasRef.current;
    if (!video || !displayCanvas) return;

    let pingPongInterval: any = null;
    let forward = true;
    let currentFrameIdx = 0;

    const startPingPongPlayback = () => {
      const frames = framesRef.current;
      if (frames.length === 0) return;

      setFramesReady(true);
      const ctx = displayCanvas.getContext('2d');
      if (!ctx) return;

      // Match canvas dimensions to captured frames
      displayCanvas.width = frames[0].width;
      displayCanvas.height = frames[0].height;

      pingPongInterval = setInterval(() => {
        const frameCanvas = frames[currentFrameIdx];
        if (frameCanvas) {
          ctx.drawImage(frameCanvas, 0, 0);
        }

        if (forward) {
          currentFrameIdx++;
          if (currentFrameIdx >= frames.length - 1) {
            forward = false;
          }
        } else {
          currentFrameIdx--;
          if (currentFrameIdx <= 0) {
            forward = true;
          }
        }
      }, FRAME_INTERVAL);
    };

    // Frame capture worker
    const captureFrame = () => {
      if (!isCapturingRef.current || video.ended || video.paused) return;

      const currentTime = video.currentTime;
      // Deduplicate by currentTime
      if (currentTime !== lastCapturedTimeRef.current && video.videoWidth > 0) {
        lastCapturedTimeRef.current = currentTime;

        try {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const scale = Math.min(1, CAPTURE_MAX_WIDTH / vw);
          const cw = Math.round(vw * scale);
          const ch = Math.round(vh * scale);

          const offCanvas = document.createElement('canvas');
          offCanvas.width = cw;
          offCanvas.height = ch;
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(video, 0, 0, cw, ch);
            framesRef.current.push(offCanvas);
          }
        } catch (e) {
          // If CORS restricts frame capture, break capture and loop video
          console.warn('Canvas capture restricted by CORS, looping video directly');
          isCapturingRef.current = false;
          video.loop = true;
          video.play().catch(() => {});
          return;
        }
      }

      if ('requestVideoFrameCallback' in video) {
        (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }
    };

    const handlePlay = () => {
      isCapturingRef.current = true;
      framesRef.current = [];
      lastCapturedTimeRef.current = -1;
      if ('requestVideoFrameCallback' in video) {
        (video as any).requestVideoFrameCallback(captureFrame);
      } else {
        requestAnimationFrame(captureFrame);
      }
    };

    const handleEnded = () => {
      isCapturingRef.current = false;
      if (framesRef.current.length > 5) {
        startPingPongPlayback();
      } else {
        // Fallback: loop video
        video.loop = true;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);

    // Auto-trigger video play
    video.play().catch(() => {
      // Browsers allow muted autoplay
    });

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
      if (pingPongInterval) clearInterval(pingPongInterval);
      isCapturingRef.current = false;
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 scale-[1.15] origin-top overflow-hidden pointer-events-none select-none">
      {/* Live capture video */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className={`w-full h-full object-cover object-top ${framesReady ? 'hidden' : 'block'}`}
      />

      {/* Ping-pong boomerang display canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-cover object-top ${framesReady ? 'block' : 'hidden'}`}
      />
    </div>
  );
};
