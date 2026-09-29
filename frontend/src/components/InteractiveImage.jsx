import { useState } from 'react';

/**
 * InteractiveImage
 * - No black borders or dark frames (uses clean transparent background)
 * - Displays the full length of the image clearly without cropping headers or diagrams
 * - Has smooth hover elevation and light bilateral shadows
 */
export default function InteractiveImage({
  src,
  alt = 'System Visual',
  style = {},
  onExpand = null,
  className = ''
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onExpand ? () => onExpand({ src, title: alt }) : undefined}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        background: 'transparent', // NO black background
        border: 'none',            // NO black borders
        borderRadius: 14,
        overflow: 'hidden',
        cursor: onExpand ? 'pointer' : 'default',
        boxShadow: isHovered
          ? '-8px 0 20px -4px rgba(15, 23, 42, 0.08), 8px 0 20px -4px rgba(15, 23, 42, 0.08), 0 8px 24px -4px rgba(15, 23, 42, 0.06)'
          : '-6px 0 16px -4px rgba(15, 23, 42, 0.04), 6px 0 16px -4px rgba(15, 23, 42, 0.04), 0 4px 16px -2px rgba(15, 23, 42, 0.03)',
        transition: 'transform 0.35s ease, box-shadow 0.35s ease',
        transform: isHovered ? 'scale(1.015)' : 'scale(1)',
        ...style
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          width: '100%',
          height: 'auto',          // Full length clearly visible without cropping
          maxHeight: '440px',
          objectFit: 'contain',
          display: 'block',
          borderRadius: 14,
          border: 'none',          // NO black border
          outline: 'none',
          backgroundColor: '#ffffff' // Clean white backdrop so transparent regions blend seamlessly
        }}
      />
    </div>
  );
}
