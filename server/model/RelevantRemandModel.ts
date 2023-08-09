import { PrisonApiPrisoner } from '../@types/prisonApi/prisonClientTypes'
import { Remand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import config from '../config'

export default class RelevantRemandModel {
  constructor(public prisonerDetail: PrisonApiPrisoner, public relevantRemand: RemandResult) {}

  public isNotRelevant(sentenceRemand: Remand): boolean {
    return !this.relevantRemand.sentenceRemand.find(it => it.charge.chargeId === sentenceRemand.charge.chargeId)
  }

  public returnToAdjustments(): string {
    return `${config.services.adjustmentServices.url}/${this.prisonerDetail.offenderNo}`
  }

  public errorList() {
    return this.relevantRemand.issuesWithLegacyData.map(it => {
      return {
        text: it,
      }
    })
  }
}
