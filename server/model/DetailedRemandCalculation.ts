import dayjs from 'dayjs'
import { Charge, ChargeRemand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { maxOf, sameMembers } from '../utils/utils'

export type RemandAndCharge = ChargeRemand & {
  charges: Charge[]
  replacedCharges: Charge[]
  replacedChargeIds: number[]
}

export type ReplaceableChargeRemands = {
  chargeIds: number[]
  remand: RemandAndCharge[]
}

export default class DetailedRemandCalculation {
  chargeRemand: RemandAndCharge[]

  constructor(public remandCalculation: RemandResult) {
    this.chargeRemand = remandCalculation.chargeRemand.map(it =>
      DetailedRemandCalculation.toRemandAndCharge(it, remandCalculation),
    )
  }

  public static toRemandAndCharge(it: ChargeRemand, remandCalculation: RemandResult): RemandAndCharge {
    return {
      ...it,
      charges: it.chargeIds.map(chargeId => remandCalculation.charges[chargeId]),
      replacedChargeIds: it.replacedCharges,
      replacedCharges: it.replacedCharges?.map(chargeId => remandCalculation.charges[chargeId]),
    } as RemandAndCharge
  }

  public isRelevant(remand: RemandAndCharge) {
    return remand.charges[0].sentenceSequence != null && (remand.status === 'APPLICABLE' || remand.status === 'SHARED')
  }

  public static canBeMarkedAsApplicable(remandAndCharge: RemandAndCharge): boolean {
    return (
      remandAndCharge.charges.some(it => it.isInconclusive) &&
      (remandAndCharge.status === 'CASE_NOT_CONCLUDED' || remandAndCharge.status === 'NOT_SENTENCED')
    )
  }

  public getReplaceableChargeRemandGroupedByChargeIds(): ReplaceableChargeRemands[] {
    const replaceableChargeRemands: ReplaceableChargeRemands[] = []
    const latestRemandDate = maxOf(this.chargeRemand, it => new Date(it.to))
    const sentenceCharges = this.chargeRemand
      .filter(it => it.status !== 'INACTIVE' && DetailedRemandCalculation.canBeMarkedAsApplicable(it))
      .filter(it => it.charges.some(charge => charge.sentenceSequence !== null && charge.sentenceDate !== null))

    const minBookingId = Math.min(
      ...sentenceCharges.flatMap(chargeRemand => chargeRemand.charges.map(c => c.bookingId)),
    )

    sentenceCharges.forEach(chargeRemand => {
      const existing = replaceableChargeRemands.find(it => sameMembers(it.chargeIds, chargeRemand.chargeIds))
      if (existing) {
        existing.remand.push(chargeRemand)
      } else {
        replaceableChargeRemands.push({
          chargeIds: chargeRemand.chargeIds,
          remand: [chargeRemand],
        })
      }
    })

    return replaceableChargeRemands.filter(rcr =>
      rcr.remand.some(r =>
        r.charges.some(c => new Date(c.sentenceDate) >= latestRemandDate && c.bookingId >= minBookingId),
      ),
    )
  }

  public chargeIdsOfRemand(remand: RemandAndCharge): number[] {
    return remand.charges.map(it => it.chargeId)
  }

  public findReplaceableChargesMatchingChargeIds(chargeIds: number[]): RemandAndCharge[] {
    return (
      this.getReplaceableChargeRemandGroupedByChargeIds().find(it => {
        return sameMembers(it.chargeIds, chargeIds)
      })?.remand || []
    )
  }

  public indexOfReplaceableChargesMatchingChargeIds(chargeIds: number[]): number {
    return this.getReplaceableChargeRemandGroupedByChargeIds().findIndex(it => {
      return sameMembers(it.chargeIds, chargeIds)
    })
  }

  public offenceDateText(charge: Charge) {
    return `${
      charge.offenceDate && charge.offenceEndDate && charge.offenceEndDate !== charge.offenceDate
        ? `${dayjs(charge.offenceDate).format('D MMM YYYY')} to ${dayjs(charge.offenceEndDate).format('D MMM YYYY')}`
        : `${dayjs(charge.offenceDate).format('D MMM YYYY')}`
    }`
  }
}
