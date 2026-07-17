import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowRight, Upload, UserPlus } from 'lucide-react'
import { useAuth } from '@clerk/tanstack-react-start'
import { fetchFeatured, type FeaturedBlob } from '../db/featured.func'
import { BlobCard } from '../components/BlobCard'
import heroBg from '../../screen.png'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { isSignedIn } = useAuth()
  const [featured, setFeatured] = useState<FeaturedBlob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeatured()
      .then(setFeatured)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background image — blurred and faded */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        {/* Blur + dark overlay for readability */}
        <div className="absolute inset-0 bg-noir-950/60 backdrop-blur-[2px]" />

        {/* Hero content */}
        <div className="relative max-w-4xl mx-auto px-4 py-32 text-center">
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
            {isSignedIn ? (
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 border border-noir-600 text-noir-200 rounded-lg font-semibold hover:border-noir-400 hover:text-noir-100 transition-colors"
              >
                Upload Your Blob
                <Upload className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-2 px-6 py-3 border border-noir-600 text-noir-200 rounded-lg font-semibold hover:border-noir-400 hover:text-noir-100 transition-colors"
              >
                Sign Up
                <UserPlus className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Featured Feed ───────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pb-24 text-center">
        <div className="border-t border-noir-800 pt-16">
          <h2 className="text-2xl font-bold text-noir-200">Featured Blobs of Doom</h2>
          <p className="mt-2 text-noir-400 text-sm">
            A random selection from the hall of shame.
          </p>

          {loading ? (
            <FeaturedSkeleton />
          ) : featured.length === 0 ? (
            <div className="mt-12 text-center border-2 border-dashed border-noir-700 rounded-xl py-16 px-4">
              <p className="text-noir-400 text-lg">
                The hall of shame is empty.
              </p>
              <p className="mt-2 text-noir-500">
                Be the first to{' '}
                <Link to="/upload" className="text-doom-400 hover:text-doom-300 transition-colors">
                  upload a blob
                </Link>
                {' '}and claim your place in the archive.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((blob) => (
                <BlobCard key={blob.id} blob={blob} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FeaturedSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/3] bg-noir-800" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-noir-800 rounded w-3/4" />
            <div className="h-4 bg-noir-800 rounded w-1/2" />
            <div className="h-3 bg-noir-800 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
