import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/tanstack-react-start'
import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Skull } from 'lucide-react'
import { EnsureProfile } from '../components/EnsureProfile'

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
        <ClerkProvider
          appearance={{
            variables: {
              colorBackground: '#111115',
              colorText: '#d4d4dc',
              colorTextSecondary: '#8e8e9e',
              colorInputBackground: '#1a1a20',
              colorInputText: '#d4d4dc',
              colorPrimary: '#c41e3a',
              colorDanger: '#e63950',
              borderRadius: '0.5rem',
            },
          }}
        >
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
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-noir-300 hover:text-noir-100 transition-colors cursor-pointer">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-4 py-1.5 bg-doom-500 text-white rounded-lg font-semibold hover:bg-doom-400 transition-colors cursor-pointer">
                      Sign Up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link to="/upload" className="hover:text-noir-100 transition-colors">
                    Upload
                  </Link>
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonBox: 'text-noir-100',
                      },
                    }}
                  />
                </Show>
              </nav>
            </div>
          </header>

          <EnsureProfile />
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
        </ClerkProvider>
      </body>
    </html>
  )
}
