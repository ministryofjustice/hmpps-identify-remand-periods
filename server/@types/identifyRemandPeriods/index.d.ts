/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  '/relevant-remand/{prisonerId}': {
    /**
     * Calculates relevant remand
     * @description This endpoint will calculate relevant remand based on the data from NOMIS before returning it to the user
     */
    post: operations['calculate']
  }
  '/relevant-remand/{prisonerId}/decision': {
    /**
     * Get the latest decision for a given person
     * @description This endpoint return the latest decision for a given person.
     */
    get: operations['getDecision']
    /**
     * Saves a decision to accept or reject relevant remand
     * @description This endpoint will save a decision to accept or reject relevant remand, and also call the adjustments api to save the data.
     */
    post: operations['saveDecision']
  }
}

export type webhooks = Record<string, never>

export interface components {
  schemas: {
    RemandApplicableUserSelection: {
      chargeIdsToMakeApplicable: number[]
      /** Format: int64 */
      targetChargeId: number
    }
    RemandCalculationRequestOptions: {
      includeRemandCalculation: boolean
      userSelections: components['schemas']['RemandApplicableUserSelection'][]
    }
    AdjustmentDto: {
      /** Format: uuid */
      id?: string
      /** Format: int64 */
      bookingId: number
      /** Format: int32 */
      sentenceSequence?: number
      person: string
      adjustmentType: string
      /** Format: date */
      toDate?: string
      /** Format: date */
      fromDate?: string
      remand?: components['schemas']['RemandDto']
      /** @enum {string} */
      status: 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'INACTIVE_WHEN_DELETED'
    }
    Charge: {
      /** Format: int64 */
      chargeId: number
      offence: components['schemas']['Offence']
      /** Format: date */
      offenceDate: string
      /** Format: int64 */
      bookingId: number
      bookNumber: string
      /** Format: date */
      offenceEndDate?: string
      /** Format: int32 */
      sentenceSequence?: number
      /** Format: date */
      sentenceDate?: string
      courtCaseRef?: string
      courtLocation?: string
      resultDescription?: string
      final: boolean
      isActiveBooking: boolean
      isRecallSentence: boolean
    }
    ChargeAndEvents: {
      charge: components['schemas']['Charge']
      dates: components['schemas']['CourtDate'][]
      relatedCharges: number[]
      userSelectedCharges: number[]
    }
    ChargeRemand: {
      /** Format: date */
      from: string
      /** Format: date */
      to: string
      fromEvent: components['schemas']['CourtAppearance']
      toEvent: components['schemas']['CourtAppearance']
      chargeIds: number[]
      /** @enum {string} */
      status?: 'APPLICABLE' | 'SHARED' | 'INACTIVE' | 'INTERSECTED' | 'CASE_NOT_CONCLUDED' | 'NOT_SENTENCED'
      replacedCharges: number[]
      /** Format: int64 */
      days?: number
    }
    CourtAppearance: {
      /** Format: date */
      date: string
      description: string
    }
    CourtDate: {
      /** Format: date */
      date: string
      /** @enum {string} */
      type: 'START' | 'STOP' | 'CONTINUE'
      description: string
      final: boolean
      isRecallEvent: boolean
      isCustodial: boolean
    }
    LegacyDataProblem: {
      /** @enum {string} */
      type:
        | 'MISSING_OFFENCE_DATE'
        | 'MISSING_COURT_OUTCOME'
        | 'UNSUPPORTED_OUTCOME'
        | 'RELEASE_DATE_CALCULATION'
        | 'MISSING_RECALL_EVENT'
      message: string
      offence: components['schemas']['Offence']
      /** Format: int64 */
      bookingId: number
      bookNumber: string
      courtCaseRef?: string
      developerMessage?: string
    }
    Offence: {
      code: string
      statute: string
      description: string
    }
    RemandCalculation: {
      prisonerId: string
      chargesAndEvents: components['schemas']['ChargeAndEvents'][]
      chargeIdsWithActiveSentence: number[]
      issuesWithLegacyData: components['schemas']['LegacyDataProblem'][]
      includeCalculationInResult: boolean
    }
    /** @description The details of remand adjustment */
    RemandDto: {
      /** @description The id of the charges this remand applies to */
      chargeId: number[]
    }
    RemandResult: {
      adjustments: components['schemas']['AdjustmentDto'][]
      chargeRemand: components['schemas']['ChargeRemand'][]
      intersectingSentences: components['schemas']['SentencePeriod'][]
      charges: {
        [key: string]: components['schemas']['Charge']
      }
      issuesWithLegacyData: components['schemas']['LegacyDataProblem'][]
      remandCalculation?: components['schemas']['RemandCalculation']
    }
    Sentence: {
      /** Format: int32 */
      sequence: number
      /** Format: date */
      sentenceDate: string
      recallDates: string[]
      /** Format: int64 */
      bookingId: number
    }
    SentencePeriod: {
      /** Format: date */
      from: string
      /** Format: date */
      to: string
      sentence: components['schemas']['Sentence']
      /** Format: int64 */
      chargeId: number
      service: string
      errors: string[]
      calculationIds: number[]
      /** Format: int64 */
      days?: number
    }
    IdentifyRemandDecisionDto: {
      accepted: boolean
      rejectComment?: string
      options?: components['schemas']['RemandCalculationRequestOptions']
      /** Format: int32 */
      days?: number
      /** Format: date-time */
      decisionOn?: string
      decisionBy?: string
      decisionByPrisonId?: string
      decisionByPrisonDescription?: string
    }
  }
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}

export type $defs = Record<string, never>

export type external = Record<string, never>

export interface operations {
  /**
   * Calculates relevant remand
   * @description This endpoint will calculate relevant remand based on the data from NOMIS before returning it to the user
   */
  calculate: {
    parameters: {
      path: {
        /**
         * @description The prisoners ID (aka nomsId)
         * @example A1234AB
         */
        prisonerId: string
      }
    }
    requestBody?: {
      content: {
        'application/json': components['schemas']['RemandCalculationRequestOptions']
      }
    }
    responses: {
      /** @description Returns calculated relevant remand */
      200: {
        content: {
          'application/json': components['schemas']['RemandResult']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        content: {
          'application/json': components['schemas']['RemandResult']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        content: {
          'application/json': components['schemas']['RemandResult']
        }
      }
    }
  }
  /**
   * Get the latest decision for a given person
   * @description This endpoint return the latest decision for a given person.
   */
  getDecision: {
    parameters: {
      path: {
        /**
         * @description The prisoners ID (aka nomsId)
         * @example A1234AB
         */
        prisonerId: string
      }
    }
    responses: {
      /** @description Gets latest remand decision for person. */
      200: {
        content: {
          'application/json': components['schemas']['IdentifyRemandDecisionDto']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        content: {
          'application/json': components['schemas']['IdentifyRemandDecisionDto']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        content: {
          'application/json': components['schemas']['IdentifyRemandDecisionDto']
        }
      }
    }
  }
  /**
   * Saves a decision to accept or reject relevant remand
   * @description This endpoint will save a decision to accept or reject relevant remand, and also call the adjustments api to save the data.
   */
  saveDecision: {
    parameters: {
      path: {
        /**
         * @description The prisoners ID (aka nomsId)
         * @example A1234AB
         */
        prisonerId: string
      }
    }
    requestBody: {
      content: {
        'application/json': components['schemas']['IdentifyRemandDecisionDto']
      }
    }
    responses: {
      /** @description Decision created okay. */
      201: {
        content: {
          'application/json': components['schemas']['IdentifyRemandDecisionDto']
        }
      }
      /** @description Unauthorised, requires a valid Oauth2 token */
      401: {
        content: {
          'application/json': components['schemas']['IdentifyRemandDecisionDto']
        }
      }
      /** @description Forbidden, requires an appropriate role */
      403: {
        content: {
          'application/json': components['schemas']['IdentifyRemandDecisionDto']
        }
      }
    }
  }
}
