import dayjs from 'dayjs'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
import { Charge, ChargeRemand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import DetailedRemandCalculation, { RemandAndCharge } from './DetailedRemandCalculation'
import { convertToTitleCase } from '../utils/utils'

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
    return new DetailedRemandCalculation(this.relevantRemand).isRelevant(remand)
  }

  public canBeMarkedAsApplicable(charge: ChargeRemand): boolean {
    return new DetailedRemandCalculation(this.relevantRemand).canBeMarkedAsApplicable(charge)
  }

  public chargeIdsOfRemand(remand: RemandAndCharge): number[] {
    return new DetailedRemandCalculation(this.relevantRemand).chargeIdsOfRemand(remand)
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

  public statusText(remand: RemandAndCharge) {
    return convertToTitleCase(remand.status.split('_').join(' '))
  }

  public summaryRows(remand: RemandAndCharge) {
    const charge = remand.charges[0]
    return [
      ...(charge.courtLocation
        ? [
            {
              key: {
                text: 'Court name',
              },
              value: {
                text: charge.courtLocation,
              },
            },
          ]
        : []),
      ...(charge.courtCaseRef
        ? [
            {
              key: {
                text: 'Case number',
              },
              value: {
                text: charge.courtLocation,
              },
            },
          ]
        : []),
      ...(remand.fromEvent?.description
        ? [
            {
              key: {
                text: 'Start outcome',
              },
              value: {
                text: `${remand.fromEvent.description} on ${dayjs(remand.fromEvent.date).format('D MMM YYYY')}`,
              },
            },
          ]
        : []),
      ...(remand.toEvent?.description
        ? [
            {
              key: {
                text: 'Stop outcome',
              },
              value: {
                text: `${remand.toEvent.description} on ${dayjs(remand.toEvent.date).format('D MMM YYYY')}`,
              },
            },
          ]
        : []),
      {
        key: {
          text: 'Offence outcome',
        },
        value: {
          text: charge.resultDescription,
        },
      },
      {
        key: {
          text: 'Remand',
        },
        value: {
          text: remand.days,
        },
      },
      {
        key: {
          text: 'Period',
        },
        value: {
          text: `${dayjs(remand.from).format('D MMM YYYY')} to ${dayjs(remand.to).format('D MMM YYYY')}`,
        },
      },
    ]
  }

  protected offenceDateText(charge: Charge) {
    return new DetailedRemandCalculation(this.relevantRemand).offenceDateText(charge)
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
