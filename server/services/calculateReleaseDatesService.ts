import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import { UnusedDeductionCalculationResponse } from '../@types/calculateReleaseDates/calculateReleaseDatesClientTypes'
import CalculateReleaseDatesApiClient from '../api/calculateReleaseDatesApiClient'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
import { daysBetween } from '../utils/utils'
import { HmppsAuthClient } from '../data'

const expectedUnusedDeductionsValidations = [
  'CUSTODIAL_PERIOD_EXTINGUISHED_TAGGED_BAIL',
  'CUSTODIAL_PERIOD_EXTINGUISHED_REMAND',
]
export default class CalculateReleaseDatesService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  private async calculateUnusedDeductions(
    prisonerId: string,
    adjustments: Adjustment[],
    username: string,
  ): Promise<UnusedDeductionCalculationResponse> {
    const result = await new CalculateReleaseDatesApiClient(
      await this.getSystemClientToken(username),
    ).calculateUnusedDeductions(prisonerId, adjustments)
    return {
      ...result,
      validationMessages: result.validationMessages.filter(
        it => !expectedUnusedDeductionsValidations.includes(it.code),
      ),
    }
  }

  async unusedDeductionsHandlingCRDError(
    remand: Adjustment[],
    adjustments: Adjustment[],
    sentencesAndOffence: PrisonApiOffenderSentenceAndOffences[],
    nomsId: string,
    username: string,
  ): Promise<UnusedDeductionCalculationResponse> {
    try {
      const adjustmentsReadyForCalculation = [
        ...this.makeCalculatedRemandReadyForCalc(remand, sentencesAndOffence),
        ...adjustments,
      ]

      return await this.calculateUnusedDeductions(nomsId, adjustmentsReadyForCalculation, username)
    } catch {
      // If CRDS can't calculate unused deductions. There may be a validation error, or some NOMIS deductions.
      return null
    }
  }

  private makeCalculatedRemandReadyForCalc(
    remand: Adjustment[],
    sentencesAndOffence: PrisonApiOffenderSentenceAndOffences[],
  ): Adjustment[] {
    return remand.map(it => {
      const sentence = sentencesAndOffence.find(sent =>
        sent.offences.some(off => it.remand.chargeId.includes(off.offenderChargeId)),
      )

      const days = it.fromDate && it.toDate ? daysBetween(new Date(it.fromDate), new Date(it.toDate)) : it.days
      return {
        ...it,
        days,
        effectiveDays: days,
        sentenceSequence: sentence.sentenceSequence,
      }
    })
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
