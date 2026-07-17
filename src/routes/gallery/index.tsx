import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/gallery/')({ component: Gallery })

function Gallery() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-noir-100">Gallery</h1>
      <p className="mt-4 text-noir-400">
        The hall of shame is empty... for now. Blobs of doom coming soon.
      </p>
    </div>
  )
}
