import { PrisonApiPrisoner } from '../@types/prisonApi/prisonClientTypes'
import { Remand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'

export default class RelevantRemandModel {
  constructor(public prisonerDetail: PrisonApiPrisoner, public relevantRemand: RemandResult) {}

  public isNotRelevant(sentenceRemand: Remand): boolean {
    return !this.relevantRemand.sentenceRemand.find(it => it.charge.chargeId === sentenceRemand.charge.chargeId)
  }
}
