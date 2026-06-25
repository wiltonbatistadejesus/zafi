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

      {/* "i" with blue dot — using dotless i + custom blue dot */}
      <span className="relative inline-block" style={{ color: '#0f172a' }}>
        {/* dotless i unicode character */}
        &#305;

        {/* Blue dot above the "i" */}
        <span
          aria-hidden
          className="absolute"
          style={{
            top: size === 'lg' ? '-0.15em' : '-0.12em',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '0.18em',
            height: '0.18em',
            background: '#1565ff',
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
      </span>
    </span>
  )
}
