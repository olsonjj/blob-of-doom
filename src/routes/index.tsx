import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Upload } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-24 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight text-noir-100">
        Engineering Noir Archive
      </h1>
      <p className="mt-6 text-lg text-noir-300 max-w-2xl mx-auto leading-relaxed">
        We document the most spectacular 3D printing failures—where extrusion
        meets entropy. Every blob tells a story of a failed dream and a
        miscalculated G-code. If this scares you, better take up knitting
        instead.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 px-6 py-3 bg-doom-500 text-white rounded-lg font-semibold hover:bg-doom-400 transition-colors"
        >
          Browse Gallery
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-6 py-3 border border-noir-600 text-noir-200 rounded-lg font-semibold hover:border-noir-400 hover:text-noir-100 transition-colors"
        >
          Upload Your Blob
          <Upload className="w-4 h-4" />
        </Link>
      </div>

      {/* Featured feed placeholder — ticket 06 */}
      <div className="mt-24 border-t border-noir-800 pt-16">
        <h2 className="text-2xl font-bold text-noir-200">Featured Blobs of Doom</h2>
        <p className="mt-4 text-noir-400">Coming soon. The gallery awaits its first failures.</p>
      </div>
    </div>
  )
}
