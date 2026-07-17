import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Skull } from 'lucide-react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Blob of Doom — Engineering Noir Archive' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-noir-950 text-noir-100 min-h-screen flex flex-col">
        <header className="border-b border-noir-700">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-doom-400 font-bold text-xl tracking-tight hover:text-doom-500 transition-colors"
            >
              <Skull className="w-6 h-6" />
              Blob of Doom
            </Link>
            <nav className="flex items-center gap-6 text-sm text-noir-300">
              <Link to="/" className="hover:text-noir-100 transition-colors">
                Home
              </Link>
              <Link to="/gallery" className="hover:text-noir-100 transition-colors">
                Gallery
              </Link>
              {/* Auth placeholder — sign in / user menu goes here in ticket 02 */}
            </nav>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <footer className="border-t border-noir-800 py-8 text-center text-noir-400 text-sm">
          <p>Blob of Doom &copy; {new Date().getFullYear()} — Engineering Noir Archive</p>
          <p className="mt-1">Where extrusion meets entropy.</p>
        </footer>

        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
