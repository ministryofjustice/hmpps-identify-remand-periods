import { Charge, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
import { sameMembers } from '../utils/utils'
import RemandCardModel, { RemandAndCharge } from './RemandCardModel'

export default class SelectApplicableRemandModel extends RemandCardModel {
  public chargeRemand: RemandAndCharge[]

  public chargesToSelect: Charge[]

  constructor(
    public prisonerNumber: string,
    bookingId: number,
    relevantRemand: RemandResult,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
    public chargeIds: number[],
  ) {
    super(relevantRemand, sentencesAndOffences)
    const chargeRemandAndCharges = this.relevantRemand.chargeRemand
      .map(it => this.toRemandAndCharge(it))
      .filter(it => {
        return it.status !== 'INACTIVE'
      })

    this.chargeRemand = chargeRemandAndCharges.filter(it => {
      return sameMembers(it.chargeIds, this.chargeIds)
    })
    this.chargesToSelect = Object.values(relevantRemand.charges).filter(
      it => it.sentenceSequence !== null && it.bookingId === bookingId,
    )
  }

  public canBeMarkedAsApplicable() {
    return false
  }

  public radioItems() {
    return this.chargesToSelect.map(it => {
      return {
        value: it.chargeId,
        text: `${it.offence.description}`,
      }
    })
  }
}
