import { IdentifyRemandDecision, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import IdentifyRemandPeriodsClient from '../api/identifyRemandPeriodsClient'

export default class IdentifyRemandPeriodsService {
  public async calculateRelevantRemand(nomsId: string, token: string): Promise<RemandResult> {
    return new IdentifyRemandPeriodsClient(token).calculateRelevantRemand(nomsId)
  }

  public async saveRemandDecision(
    nomsId: string,
    decision: IdentifyRemandDecision,
    token: string,
  ): Promise<IdentifyRemandDecision> {
    return new IdentifyRemandPeriodsClient(token).saveRemandDecision(nomsId, decision)
  }

  public async getRemandDecision(nomsId: string, token: string): Promise<IdentifyRemandDecision> {
    const result = new IdentifyRemandPeriodsClient(token).getRemandDecision(nomsId)
    return Object.keys(result).length ? result : null
  }
}
