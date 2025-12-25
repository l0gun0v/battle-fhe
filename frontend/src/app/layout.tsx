import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import ContextProvider from '@/context'
import { headers } from 'next/headers'
import { Toaster } from 'sonner'
import Script from 'next/script'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'Battleship FHE',
  description: 'Fully Homomorphic Encryption Battleship Game'
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersObj = await headers()
  const cookiesString = headersObj.get('cookie')

  return (
    <html lang="en">
      <head>
        <Script
          id="global-polyfill"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof global === 'undefined') {
                var global = globalThis;
              }
            `,
          }}
        />
        <Script src="https://cdn.zama.ai/relayer-sdk-js/0.1.0-9/relayer-sdk-js.umd.cjs" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ContextProvider cookiesString={cookiesString}>
          {children}
          <Toaster />
        </ContextProvider>
      </body>
    </html>
  )
}
