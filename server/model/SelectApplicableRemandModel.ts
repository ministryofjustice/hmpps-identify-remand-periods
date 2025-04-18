import { Charge, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
import config from '../config'
import DetailedRemandCalculation, { RemandAndCharge, ReplaceableChargeRemands } from './DetailedRemandCalculation'
import RemandCardModel from './RemandCardModel'

export default class SelectApplicableRemandModel extends RemandCardModel {
  public chargeRemand: RemandAndCharge[]

  public chargesToSelect: Charge[]

  public total: number

  public index: number

  private replaceableCharges: ReplaceableChargeRemands[]

  constructor(
    public prisonerNumber: string,
    bookingId: string,
    relevantRemand: RemandResult,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
    public chargeIds: number[],
    public edit: boolean,
  ) {
    super(prisonerNumber, relevantRemand, sentencesAndOffences)
    const detailedCalculation = new DetailedRemandCalculation(relevantRemand)
    this.replaceableCharges = detailedCalculation.getReplaceableChargeRemandGroupedByChargeIds()

    this.chargeRemand = detailedCalculation.findReplaceableChargesMatchingChargeIds(chargeIds)
    this.total = this.replaceableCharges.length
    this.index = detailedCalculation.indexOfReplaceableChargesMatchingChargeIds(chargeIds)

    let latestRemandDate: Date = null
    this.chargeRemand.forEach(it => {
      if (!latestRemandDate) {
        latestRemandDate = new Date(it.to)
      }
      if (new Date(it.to) > latestRemandDate) {
        latestRemandDate = new Date(it.to)
      }
    })

    const chargesToSelectByOffenceDateAndDesc: Record<string, Charge> = {}
    Object.values(relevantRemand.charges)
      .filter(
        it =>
          it.sentenceSequence !== null &&
          it.bookingId.toString() === bookingId &&
          it.sentenceDate !== null &&
          new Date(it.sentenceDate) > latestRemandDate,
      )
      .forEach(it => {
        const key = `${it.offence.description}${it.offenceDate}${it.offenceEndDate}`
        if (!Object.keys(chargesToSelectByOffenceDateAndDesc).includes(key)) {
          chargesToSelectByOffenceDateAndDesc[key] = it
        }
      })

    this.chargesToSelect = Object.values(chargesToSelectByOffenceDateAndDesc).sort((charge1, charge2) => {
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

  public override showEditReplacedOffenceLink(): boolean {
    return false
  }

  public backlink() {
    if (this.edit) {
      return `/prisoner/${this.prisonerNumber}/remand`
    }
    if (this.index === 0) {
      return `/prisoner/${this.prisonerNumber}/replaced-offence-intercept`
    }
    const previous = this.replaceableCharges[this.index - 1]
    return `/prisoner/${this.prisonerNumber}/replaced-offence?chargeIds=${previous.chargeIds.join(',')}`
  }

  public cancelLink() {
    if (this.edit) {
      return `/prisoner/${this.prisonerNumber}/remand`
    }
    return `${config.services.adjustmentServices.url}/${this.prisonerNumber}`
  }

  public radioItems() {
    return [
      {
        value: 'no',
        text: 'No, this offence has not been replaced',
      },
      ...(this.chargesToSelect.length > 0
        ? [
            {
              divider: 'or',
            },
          ]
        : []),
      ...this.chargesToSelect.map(it => {
        return {
          value: it.chargeId,
          html: `Yes, this offence was replaced with <strong>${it.offence.description}</strong> committed on ${this.offenceDateText(it)}`,
        }
      }),
    ]
  }
}
