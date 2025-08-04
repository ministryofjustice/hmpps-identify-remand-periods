import dayjs from 'dayjs'
import { Charge, ChargeRemand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { sameMembers } from '../utils/utils'

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

  public expandChargeIds(data: ReplaceableChargeRemands[]): ReplaceableChargeRemands[] {
    const result: ReplaceableChargeRemands[] = []

    data.forEach(item => {
      result.push(item)
      if (item.chargeIds.length > 1) {
        item.chargeIds.forEach(id => result.push({ chargeIds: [id], remand: item.remand }))
      }
    })
    return result
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
    const remands: ReplaceableChargeRemands[] = []

    this.chargeRemand
      .filter(it => it.status !== 'INACTIVE' && DetailedRemandCalculation.canBeMarkedAsApplicable(it))
      .forEach(chargeRemand => {
        const existing = remands.find(it => sameMembers(it.chargeIds, chargeRemand.chargeIds))
        if (existing) {
          existing.remand.push(chargeRemand)
        } else {
          remands.push({
            chargeIds: chargeRemand.chargeIds,
            remand: [chargeRemand],
          })
        }
      })

    return remands
  }

  public chargeIdsOfRemand(remand: RemandAndCharge): number[] {
    return remand.charges.map(it => it.chargeId)
  }

  public findReplaceableChargesMatchingChargeIds(chargeIds: number[]): RemandAndCharge[] {
    return (
      this.getReplaceableChargeRemandGroupedByChargeIds().find(it => {
        return it.chargeIds.some(id => chargeIds.includes(id))
      })?.remand || []
    )
  }

  public indexOfReplaceableChargesMatchingChargeIds(chargeIds: number[]): number {
    return this.expandChargeIds(this.getReplaceableChargeRemandGroupedByChargeIds()).findIndex(it => {
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
