import type { UserDetails } from '../../services/userService'
import { PrisonerSearchApiPrisoner } from '../prisonerSearchApi/prisonerSearchTypes'
import { IdentifyRemandDecision } from '../identifyRemandPeriods/identifyRemandPeriodsTypes'

export default {}

declare module 'express-session' {
  // Declare that the session will potentially contain these additional fields
  interface SessionData {
    iterateToLastIndex: number
    returnTo: string
    nowInMinutes: number
    selectedApplicableRemand?: Record<string, RemandApplicableUserSelection[]>
    storedCalculations?: Record<string, RemandResult>
    storedCalculationsWithoutSelection?: Record<string, RemandResult>
    rejectedRemandDecision?: Record<string, IdentifyRemandDecision>
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
