import dayjs from 'dayjs'
import { Charge, ChargeRemand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { sameMembers } from '../utils/utils'

export type RemandAndCharge = ChargeRemand & {
  charges: Charge[]
  replacedCharges: Charge[]
  replacedChargeIds: number[]
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

  public static canBeMarkedAsApplicable(charge: ChargeRemand): boolean {
    return charge.status === 'CASE_NOT_CONCLUDED' || charge.status === 'NOT_SENTENCED'
  }

  public getReplaceableChargeRemand(): RemandAndCharge[] {
    return this.chargeRemand.filter(
      it => it.status !== 'INACTIVE' && DetailedRemandCalculation.canBeMarkedAsApplicable(it),
    )
  }

  public chargeIdsOfRemand(remand: RemandAndCharge): number[] {
    return remand.charges.map(it => it.chargeId)
  }

  public findReplaceableChargesMatchingChargeIds(chargeIds: number[]): RemandAndCharge[] {
    return this.getReplaceableChargeRemand().filter(it => {
      return sameMembers(it.chargeIds, chargeIds)
    })
  }

  public indexOfReplaceableChargesMatchingChargeIds(chargeIds: number[]): number {
    return this.getReplaceableChargeRemand().findIndex(it => {
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
