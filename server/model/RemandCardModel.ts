import dayjs from 'dayjs'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
import { Charge, ChargeRemand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'

export type RemandAndCharge = ChargeRemand & {
  charges: Charge[]
  replacedCharges: Charge[]
}

export default abstract class RemandCardModel {
  constructor(
    public relevantRemand: RemandResult,
    private sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
  ) {}

  protected toRemandAndCharge(it: ChargeRemand): RemandAndCharge {
    return {
      ...it,
      charges: it.chargeIds.map(chargeId => this.relevantRemand.charges[chargeId]),
      replacedCharges: it.replacedCharges?.map(chargeId => this.relevantRemand.charges[chargeId]),
    } as RemandAndCharge
  }

  public isRelevant(remand: RemandAndCharge) {
    return remand.charges[0].sentenceSequence != null && (remand.status === 'APPLICABLE' || remand.status === 'SHARED')
  }

  public canBeMarkedAsApplicable(charge: ChargeRemand): boolean {
    return charge.status === 'CASE_NOT_CONCLUDED' || charge.status === 'NOT_SENTENCED'
  }

  public chargeIdsOfRemand(remand: RemandAndCharge): number[] {
    return remand.charges.map(it => it.chargeId)
  }

  public isRecallChargeRemand(charge: ChargeRemand): boolean {
    return this.isRecallCharge(charge.chargeIds)
  }

  public isRecallAdjustment(adjustment: Adjustment): boolean {
    return this.isRecallCharge(adjustment.remand.chargeId)
  }

  private isRecallCharge(chargeIds: number[]): boolean {
    const sentence = this.sentencesAndOffences.find(it =>
      it.offences.some(off => chargeIds.includes(off.offenderChargeId)),
    )
    return sentence && RemandCardModel.recallTypes.includes(sentence.sentenceCalculationType)
  }

  protected offenceDateText(charge: Charge) {
    return `${
      charge.offenceDate && charge.offenceEndDate && charge.offenceEndDate !== charge.offenceDate
        ? `${dayjs(charge.offenceDate).format('D MMM YYYY')} to ${dayjs(charge.offenceEndDate).format('D MMM YYYY')}`
        : `${dayjs(charge.offenceDate).format('D MMM YYYY')}`
    }`
  }

  public static recallTypes = [
    'LR',
    'LR_ORA',
    'LR_YOI_ORA',
    'LR_SEC91_ORA',
    'LRSEC250_ORA',
    'LR_EDS18',
    'LR_EDS21',
    'LR_EDSU18',
    'LR_LASPO_AR',
    'LR_LASPO_DR',
    'LR_SEC236A',
    'LR_SOPC18',
    'LR_SOPC21',
    '14FTR_ORA',
    'FTR',
    'FTR_ORA',
    'FTR_SCH15',
    'FTRSCH15_ORA',
    'FTRSCH18',
    'FTRSCH18_ORA',
    '14FTRHDC_ORA',
    'FTR_HDC_ORA',
  ]
}
