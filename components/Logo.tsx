// -----------------------------------------------
// Logo component
// Renders "zafi" wordmark with a sapphire-droplet dot on the "i"
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
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* "zaf" in gradient */}
      <span
        style={{
          background: 'linear-gradient(135deg, #1565ff, #0d47d9)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        zaf
      </span>

      {/* "i" with the droplet dot */}
      <span className="relative inline-block">
        {/* The letter i — we hide its natural dot via font tricks */}
        <span
          style={{
            background: 'linear-gradient(135deg, #1565ff, #0d47d9)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          i
        </span>

        {/* Custom sapphire droplet above the "i" */}
        <span
          aria-hidden
          className="absolute"
          style={{
            top: size === 'lg' ? '-0.55em' : '-0.5em',
            left: '50%',
            transform: 'translateX(-50%)',
            width: size === 'lg' ? '0.22em' : '0.2em',
            height: size === 'lg' ? '0.28em' : '0.25em',
            background: 'linear-gradient(160deg, #4d8aff, #0d47d9)',
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            display: 'inline-block',
          }}
        />
      </span>
    </span>
  )
}
