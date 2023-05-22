import { RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import IdentifyRemandPeriodsClient from '../api/identifyRemandPeriodsClient'

export default class IdentifyRemandPeriodsService {
  public async calculateRelevantRemand(nomsId: string, token: string): Promise<RemandResult> {
    return new IdentifyRemandPeriodsClient(token).calculateRelevantRemand(nomsId)
  }
}
