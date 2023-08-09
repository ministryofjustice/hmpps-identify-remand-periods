import { IdentifyRemandDecision, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'

export default class IdentifyRemandPeriodsClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient(
      'Identify Remand Periods API',
      config.apis.identifyRemandPeriods as ApiConfig,
      token,
    )
  }

  async calculateRelevantRemand(nomsId: string): Promise<RemandResult> {
    return this.restClient.post({ path: `/relevant-remand/${nomsId}` }) as Promise<RemandResult>
  }

  async getRemandDecision(nomsId: string): Promise<IdentifyRemandDecision> {
    return this.restClient.get({ path: `/relevant-remand/${nomsId}/decision` }) as Promise<IdentifyRemandDecision>
  }

  async saveRemandDecision(nomsId: string, decision: IdentifyRemandDecision): Promise<IdentifyRemandDecision> {
    return this.restClient.post({
      path: `/relevant-remand/${nomsId}/decision`,
      data: decision,
    }) as Promise<IdentifyRemandDecision>
  }
}
