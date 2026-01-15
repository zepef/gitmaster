"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { triggerScan } from "@/lib/actions"
import { toast } from "sonner"

export function ScanButton() {
  const [isScanning, setIsScanning] = useState(false)

  async function handleScan() {
    setIsScanning(true)
    const loadingToast = toast.loading("Scanning directories...")

    try {
      const result = await triggerScan()

      toast.dismiss(loadingToast)

      if (result.success) {
        toast.success(result.message || `Found ${result.data.totalScanned} repositories`)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error("Scan failed unexpectedly")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <Button onClick={handleScan} disabled={isScanning}>
      <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
      {isScanning ? "Scanning..." : "Scan Now"}
    </Button>
  )
}
