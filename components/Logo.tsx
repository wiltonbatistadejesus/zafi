// -----------------------------------------------
// Logo component
// Renders "zafi" wordmark: "zaf" in black, "i" in black with blue dot
// -----------------------------------------------

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  }

  return (
    <span
      className={`font-extrabold tracking-tight select-none ${sizes[size]}`}
      style={{ fontFamily: 'Inter, sans-serif', color: '#0f172a' }}
    >
      {/* "zaf" in black */}
      zaf

      {/* "i" with blue dot — hide natural dot, overlay blue circle at correct position */}
      <span
        className="relative inline-block"
        style={{
          color: '#0f172a',
          /* Hide the natural dot by clipping the top portion */
          overflow: 'visible',
        }}
      >
        {/* dotless i */}
        &#305;

        {/* Blue dot positioned at the natural i-dot height */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: '0.22em',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '0.17em',
            height: '0.17em',
            background: '#1565ff',
            borderRadius: '50%',
            display: 'block',
          }}
        />
      </span>
    </span>
  )
}
