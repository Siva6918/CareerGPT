import { useRef, useEffect } from 'react';

/**
 * InteractiveVideo
 * - No black borders or dark letterboxing; full length clearly visible
 * - Plays in loop automatically
 * - When hovered: playback becomes slow (0.5x)
 * - On mouse leave: returns to normal playback speed (1.0x)
 * - No play/pause button and NO extra buttons visible (100% clean video view)
 */
export default function InteractiveVideo({
  src,
  poster = '',
  aspectRatio = '16 / 9',
  style = {},
  className = ''
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = 1.0;
      // Ensure autoplay starts reliably
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy requires user interaction, muted retry
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    }
  }, [src]);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5; // Smooth slow motion on hover
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0; // Return to standard speed
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio,
        background: 'transparent', // NO black background
        border: 'none',            // NO black borders
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '-6px 0 16px -4px rgba(15, 23, 42, 0.05), 6px 0 16px -4px rgba(15, 23, 42, 0.05), 0 4px 16px -2px rgba(15, 23, 42, 0.04)',
        transition: 'transform 0.35s ease, box-shadow 0.35s ease',
        ...style
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover', // Fills the container cleanly with no black letterboxing bars
          display: 'block',
          borderRadius: 14,
          border: 'none',
          outline: 'none'
        }}
      />
      {/* Intentionally NO play/pause, NO sound button, NO extra buttons visible */}
    </div>
  );
}
