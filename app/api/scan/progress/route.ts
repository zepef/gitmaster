import { NextRequest } from 'next/server'
import { getScanProgress, subscribeToProgress } from '@/lib/services/scan-progress'

export const dynamic = 'force-dynamic'

/**
 * SSE endpoint for scan progress updates
 * Clients can connect to this endpoint to receive real-time progress updates
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial progress
      const initialProgress = getScanProgress()
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialProgress)}\n\n`)
      )

      // Subscribe to progress updates
      const unsubscribe = subscribeToProgress((progress) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(progress)}\n\n`)
          )
        } catch {
          // Stream closed, cleanup handled below
        }
      })

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe()
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
