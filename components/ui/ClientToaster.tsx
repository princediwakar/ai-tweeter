"use client"

import { useEffect, useState } from "react"
import { Toaster } from "./sonner"

export function ClientToaster() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return (
    <Toaster
      toastOptions={{
        className: 'border-zinc-200 bg-white text-zinc-900 shadow-sm rounded-xl font-medium',
      }}
    />
  )
}