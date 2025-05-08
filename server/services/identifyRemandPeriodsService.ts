import {
  IdentifyRemandDecision,
  RemandCalculationRequestOptions,
  RemandResult,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import IdentifyRemandPeriodsClient from '../api/identifyRemandPeriodsClient'
import { HmppsAuthClient } from '../data'

export default class IdentifyRemandPeriodsService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  public async calculateRelevantRemand(
    nomsId: string,
    options: RemandCalculationRequestOptions,
    username: string,
  ): Promise<RemandResult> {
    return new IdentifyRemandPeriodsClient(await this.getSystemClientToken(username)).calculateRelevantRemand(
      nomsId,
      options,
    )
  }

  public async saveRemandDecision(
    nomsId: string,
    decision: IdentifyRemandDecision,
    username: string,
  ): Promise<IdentifyRemandDecision> {
    return new IdentifyRemandPeriodsClient(await this.getSystemClientToken(username)).saveRemandDecision(
      nomsId,
      decision,
    )
  }

  public async getRemandDecision(nomsId: string, username: string): Promise<IdentifyRemandDecision> {
    const result = await new IdentifyRemandPeriodsClient(await this.getSystemClientToken(username)).getRemandDecision(
      nomsId,
    )
    return Object.keys(result).length ? result : null
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
