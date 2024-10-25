import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import { UnusedDeductionCalculationResponse } from '../@types/calculateReleaseDates/calculateReleaseDatesClientTypes'
import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'

export default class CalculateReleaseDatesApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient(
      'Calculate release dates API',
      config.apis.calculateReleaseDates as ApiConfig,
      token,
    )
  }

  calculateUnusedDeductions(
    prisonerId: string,
    adjustments: Adjustment[],
  ): Promise<UnusedDeductionCalculationResponse> {
    return this.restClient.post({
      path: `/unused-deductions/${prisonerId}/calculation`,
      data: adjustments,
    }) as Promise<UnusedDeductionCalculationResponse>
  }
}
