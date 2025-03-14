import { Charge, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
import { sameMembers } from '../utils/utils'
import RemandCardModel, { RemandAndCharge } from './RemandCardModel'

export default class SelectApplicableRemandModel extends RemandCardModel {
  public chargeRemand: RemandAndCharge[]

  public chargesToSelect: Charge[]

  constructor(
    public prisonerNumber: string,
    bookingId: string,
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
    this.chargesToSelect = Object.values(relevantRemand.charges)
      .filter(it => it.sentenceSequence !== null && it.bookingId.toString() === bookingId)
      .sort((charge1, charge2) => {
        const charge1Order = this.order(charge1)
        const charge2Order = this.order(charge2)
        if (charge1Order === charge2Order) {
          return new Date(charge1.sentenceDate) > new Date(charge2.sentenceDate) ? 1 : -1
        }
        return charge2Order - charge1Order
      })
  }

  private order(charge: Charge) {
    const sameCourtCase = charge.courtCaseRef === this.chargeRemand[0].charges[0].courtCaseRef
    const sameOffenceDate = charge.offenceDate === this.chargeRemand[0].charges[0].offenceDate
    const sameStatute = charge.offence.statute === this.chargeRemand[0].charges[0].offence.statute
    return [sameCourtCase, sameOffenceDate, sameStatute].filter(it => it).length
  }

  public canBeMarkedAsApplicable() {
    return false
  }

  public radioItems() {
    return this.chargesToSelect.map(it => {
      return {
        value: it.chargeId,
        html: `<strong>${it.offence.description}</strong> commited on ${this.offenceDateText(it)}`,
      }
    })
  }
}
