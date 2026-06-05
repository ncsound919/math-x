/**
 * Safe error response helpers.
 *
 * Never send raw error.message to clients — it can leak internal paths,
 * library versions, SQL queries, or env variable names.
 *
 * Usage:
 *   import { clientError, serverError } from '../lib/errors'
 *
 *   // Known user-caused errors (400):
 *   return res.status(400).json(clientError('Query too long'))
 *
 *   // Unexpected server errors (500):
 *   } catch (err) {
 *     console.error('Route error:', err)       // full detail — server side only
 *     return res.status(500).json(serverError())  // generic — client side
 *   }
 */

/** A 400-class error message safe to send to clients. */
export function clientError(message: string): { error: string } {
  return { error: message }
}

/**
 * A 500-class error message safe to send to clients.
 * Always generic — never includes the original err.message.
 */
export function serverError(context = 'request'): { error: string } {
  return { error: `An error occurred processing your ${context}` }
}

/**
 * Safely extract an error message for SERVER-SIDE logging only.
 * Do not forward this to the client response.
 */
export function toLogMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
