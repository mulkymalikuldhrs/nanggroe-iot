'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Report to error monitoring — only log to console, don't POST to API
  // (avoid sending error details to system config endpoint without auth)
  if (typeof window !== 'undefined') {
    console.error('[GlobalError]', {
      message: error.message,
      digest: error.digest,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    })
  }

  // Only expose error details in development — never in production
  const isDev = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
  const displayMessage = isDev
    ? (error.message || 'An unexpected error occurred')
    : 'An unexpected error occurred. Please try again.'

  return (
    <html lang="en">
      <body>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }} role="alert" aria-label="Application error">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171', marginBottom: '1rem' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
              {displayMessage}
            </p>
            <button
              onClick={reset}
              aria-label="Try again"
              style={{
                padding: '0.5rem 1.5rem',
                backgroundColor: '#14b8a6',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
