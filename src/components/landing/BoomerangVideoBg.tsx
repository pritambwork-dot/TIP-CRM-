import React from 'react';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260715_090628_7052d8a6-a094-4341-a4a2-ad58493a67a9.mp4';

/**
 * BoomerangVideoBg
 * Native HTML5 background video playback with hardware-accelerated looping.
 */
export const BoomerangVideoBg: React.FC = () => (
  <div className="absolute inset-0 z-0 scale-[1.15] origin-top overflow-hidden pointer-events-none select-none">
    <video
      src={VIDEO_URL}
      autoPlay
      loop
      muted
      playsInline
      className="w-full h-full object-cover object-top"
    />
  </div>
);
