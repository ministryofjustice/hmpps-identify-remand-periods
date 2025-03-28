import type { UserDetails } from '../../services/userService'
import { PrisonerSearchApiPrisoner } from '../prisonerSearchApi/prisonerSearchTypes'

export default {}

declare module 'express-session' {
  // Declare that the session will potentially contain these additional fields
  interface SessionData {
    returnTo: string
    nowInMinutes: number
    selectedApplicableRemand?: Record<string, RemandApplicableUserSelection[]>
    storedResults?: Record<string, RemandResult>
  }
}

export declare global {
  namespace Express {
    interface User extends Partial<UserDetails> {
      token: string
      authSource: string
    }

    interface Request {
      verified?: boolean
      id: string
      logout(done: (err: unknown) => void): void
    }

    interface Locals {
      user: Express.User
      prisoner: PrisonerSearchApiPrisoner
    }
  }
}
