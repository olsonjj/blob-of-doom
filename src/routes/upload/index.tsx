import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/upload/')({ component: Upload })

function Upload() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-noir-100">Upload Your Blob</h1>
      <p className="mt-4 text-noir-400">
        Upload form coming soon. You'll need to sign in first.
      </p>
    </div>
  )
}
