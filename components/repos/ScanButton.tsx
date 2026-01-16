"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, StopCircle } from "lucide-react"
import { triggerScan, stopScan } from "@/lib/actions"
import { toast } from "sonner"
import { ScanProgress } from "./ScanProgress"

export function ScanButton() {
  const [isScanning, setIsScanning] = useState(false)
  const [showProgress, setShowProgress] = useState(false)

  const handleScanComplete = useCallback(() => {
    // Keep progress visible for a moment after completion
    setTimeout(() => {
      setShowProgress(false)
    }, 3000)
  }, [])

  async function handleScan() {
    setIsScanning(true)
    setShowProgress(true)

    try {
      const result = await triggerScan()

      if (result.success) {
        toast.success(result.message || `Found ${result.data.totalScanned} repositories`)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error("Scan failed unexpectedly")
    } finally {
      setIsScanning(false)
    }
  }

  async function handleStop() {
    try {
      const result = await stopScan()
      if (result.success) {
        toast.info("Scan stopped")
        setIsScanning(false)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error("Failed to stop scan")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={handleScan} disabled={isScanning}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
          {isScanning ? "Scanning..." : "Scan Now"}
        </Button>
        {isScanning && (
          <Button variant="destructive" onClick={handleStop}>
            <StopCircle className="mr-2 h-4 w-4" />
            Stop
          </Button>
        )}
      </div>

      {showProgress && <ScanProgress onComplete={handleScanComplete} />}
    </div>
  )
}
