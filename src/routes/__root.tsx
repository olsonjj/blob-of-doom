import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/tanstack-react-start';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, HeadContent, Link, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { AdminNavLink } from '../components/AdminNavLink';
import { EnsureProfile } from '../components/EnsureProfile';
import appCss from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Blob of Doom — Engineering Noir Archive' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48 32x32 16x16' },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  shellComponent: RootDocument,
});

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
          <header className="bg-[#11100f] border-b border-[#2b2a28]">
            <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 min-h-14 sm:h-16 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3 sm:py-0">
              <Link
                to="/"
                className="text-[#ffb19e] font-black text-lg sm:text-xl uppercase tracking-[-0.02em] drop-shadow-[2px_2px_0_rgba(255,89,13,0.28)] hover:text-white transition-colors"
              >
                Blobs of Doom
              </Link>
              <nav className="order-3 basis-full sm:order-none sm:basis-auto sm:absolute sm:left-1/2 sm:-translate-x-1/2 flex items-center justify-center gap-7 text-xs font-black uppercase tracking-[0.12em] text-[#d9afa5]">
                <Link
                  to="/gallery"
                  className="relative hover:text-white transition-colors data-[status=active]:text-[#ffb19e] data-[status=active]:after:absolute data-[status=active]:after:left-0 data-[status=active]:after:right-0 data-[status=active]:after:-bottom-2 data-[status=active]:after:h-0.5 data-[status=active]:after:bg-[#ffb19e]"
                >
                  Gallery
                </Link>
              </nav>
              <nav className="flex items-center gap-4 sm:gap-5 text-xs font-black uppercase tracking-[0.1em] text-[#d9afa5]">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="hover:text-white transition-colors cursor-pointer">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-3 sm:px-4 py-1.5 bg-[#ff5a0a] text-[#14100e] font-black hover:bg-[#ff7a1a] transition-colors cursor-pointer">
                      Upload
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link
                    to="/upload"
                    className="px-3 sm:px-4 py-1.5 bg-[#ff5a0a] text-[#14100e] font-black hover:bg-[#ff7a1a] transition-colors"
                  >
                    Upload
                  </Link>
                  <AdminNavLink />
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
          <main className="flex-1">{children}</main>

          <footer className="border-t border-noir-800 py-8 text-center text-noir-400 text-sm">
            <p>Blob of Doom &copy; {new Date().getFullYear()} — Engineering Noir Archive</p>
            <p className="mt-1">Where extrusion meets entropy.</p>
          </footer>

          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
          />
          <Scripts />
        </ClerkProvider>
      </body>
    </html>
  );
}
