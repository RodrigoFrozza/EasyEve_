import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-eve-dark p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-eve-accent/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-eve-accent2/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-eve-accent shadow-lg shadow-eve-accent/25">
          <span className="text-4xl font-bold text-black">E</span>
        </div>
        
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tighter">
          Easy <span className="text-eve-accent">Eve</span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-8 max-w-md">
          Your personal EVE Online ERP for tracking characters, fleets, mining, PVE and more
        </p>

        <div className="flex gap-4 justify-center">
          <Link 
            href="/login"
            className="px-8 py-3 bg-eve-accent text-black font-semibold rounded-lg hover:bg-eve-accent/80 transition-colors"
          >
            Get Started
          </Link>
          <Link 
            href="/dashboard"
            className="px-8 py-3 border border-eve-border text-white font-semibold rounded-lg hover:bg-eve-panel transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 text-center text-gray-500 text-sm">
        <p>EVE Online is a registered trademark of CCP Games.</p>
        <p className="mt-1">Easy Eve Holding's is not affiliated with CCP Games.</p>
      </div>
    </div>
  )
}
