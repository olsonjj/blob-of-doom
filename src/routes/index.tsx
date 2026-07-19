import { useAuth } from '@clerk/tanstack-react-start';
import { createFileRoute, Link } from '@tanstack/react-router';
import useSWR from 'swr';

import { BlobCard } from '../components/BlobCard';
import { fetchFeatured } from '../db/featured.func';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  const { isSignedIn } = useAuth();
  const { data: featured = [], isLoading: loading } = useSWR('featured', () => fetchFeatured(), {
    revalidateOnFocus: false,
  });

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-noir-950 border-b border-[#1b2929]">
        {/* Background image - blurred and faded */}
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-[1px] opacity-90"
          style={{ backgroundImage: `url(/screen.png)` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(10,10,12,0.10),rgba(3,6,7,0.55)_74%),linear-gradient(90deg,rgba(0,0,0,0.45),rgba(0,0,0,0.15)_46%,rgba(0,0,0,0.50))]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-noir-950 to-transparent" />

        {/* Hero content */}
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-14 lg:py-16 flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#8c5b2e] bg-black/30 px-3.5 py-1 text-[0.68rem] sm:text-xs font-black uppercase tracking-[0.26em] text-[#b6e600] shadow-[0_0_28px_rgba(255,90,10,0.18)]">
            <span className="h-2 w-2 rounded-full bg-[#8eb500] shadow-[0_0_10px_rgba(182,230,0,0.7)]" />
            New Doom Detected
          </div>
          <h1 className="mt-5 text-2xl sm:text-3xl lg:text-4xl font-black uppercase leading-[0.96] tracking-[0.01em] text-[#f2f2ee] drop-shadow-[0_5px_24px_rgba(0,0,0,0.85)]">
            The Beauty of <span className="italic text-[#ffad98]">Technical Chaos</span>
          </h1>
          <p className="mt-4 text-xs sm:text-sm text-[#e1bdb3] max-w-3xl mx-auto leading-relaxed font-semibold drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
            We document the most spectacular 3D printing failures—where extrusion meets entropy. Every blob tells a
            story of a failed dream and a miscalculated G-code. If this scares you, better take up knitting instead.
          </p>
          <div className="mt-6 flex w-full max-w-xl flex-col sm:flex-row items-stretch justify-center gap-3 sm:gap-4">
            {isSignedIn ? (
              <Link
                to="/upload"
                className="inline-flex items-center justify-center px-4 py-2.5 bg-[#ff5a0a] text-[#15100d] text-xs font-black uppercase tracking-[-0.01em] hover:bg-[#ff7a1a] transition-colors"
              >
                Upload Your Doom
              </Link>
            ) : (
              <Link
                to="/sign-up/$"
                className="inline-flex items-center justify-center px-4 py-2.5 bg-[#ff5a0a] text-[#15100d] text-xs font-black uppercase tracking-[-0.01em] hover:bg-[#ff7a1a] transition-colors"
              >
                Upload Your Doom
              </Link>
            )}
            <Link
              to="/gallery"
              className="inline-flex items-center justify-center border border-[#6f7300] bg-black/10 px-4 py-2.5 text-xs font-black uppercase tracking-[-0.01em] text-[#c5f000] hover:border-[#c5f000] hover:bg-[#c5f000] hover:text-[#11100f] transition-colors"
            >
              Browse the Abyss
            </Link>
          </div>
        </div>
      </div>

      {/* ── Featured Feed ───────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pb-24 text-center">
        <div className="border-t border-noir-800 pt-10">
          <h2 className="text-2xl font-bold text-noir-200">Featured Blobs of Doom</h2>
          <p className="mt-2 text-noir-400 text-sm">A random selection from the hall of shame.</p>

          {loading ? (
            <FeaturedSkeleton />
          ) : featured.length === 0 ? (
            <div className="mt-12 text-center border-2 border-dashed border-noir-700 rounded-xl py-16 px-4">
              <p className="text-noir-400 text-lg">The hall of shame is empty.</p>
              <p className="mt-2 text-noir-500">
                Be the first to{' '}
                <Link to="/upload" className="text-doom-400 hover:text-doom-300 transition-colors">
                  upload a blob
                </Link>{' '}
                and claim your place in the archive.
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
  );
}

function FeaturedSkeleton() {
  return (
    <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="bg-noir-900 border border-noir-700 rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-noir-800" />
          <div className="p-5 space-y-3">
            <div className="h-5 bg-noir-800 rounded w-3/4" />
            <div className="h-4 bg-noir-800 rounded w-1/2" />
            <div className="h-3 bg-noir-800 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
