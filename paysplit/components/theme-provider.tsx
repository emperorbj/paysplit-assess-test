"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// The PaySplit designs are light-only, so the theme is pinned to light.
// Re-enable `enableSystem` / a toggle once dark designs exist.
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
