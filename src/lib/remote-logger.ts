/**
 * Remote Logger Utility
 * Handles sending client-side errors to the backend for analysis.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogData {
  message: string
  level: LogLevel
  stack?: string
  context?: any
  characterId?: number
}

class RemoteLogger {
  private async sendLog(data: LogData) {
    // Restriction: User requested only errors, never warnings
    if (data.level !== 'error') return

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      })
    } catch (err) {
      // Fail silently to avoid infinite loops if the logging itself fails
      console.warn('[RemoteLogger] Failed to send log to server', err)
    }
  }

  error(message: string, error?: Error | any, context?: any) {
    this.sendLog({
      level: 'error',
      message: message || (error instanceof Error ? error.message : String(error)),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    })
  }
}

export const remoteLogger = new RemoteLogger()
