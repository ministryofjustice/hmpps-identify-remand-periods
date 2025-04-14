import dayjs from 'dayjs'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import { daysBetween } from '../utils/utils'
import { PrisonApiOffence, PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'

export default class RemandOverviewModel {
  constructor(
    public nomsID: string,
    public adjustments: Adjustment[],
    public sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
  ) {}

  public remandSingleLineDetails() {
    return [
      ...this.adjustmentsWithOffences().flatMap(adjustment => {
        let index = 0
        return adjustment.offences.flatMap(offence => {
          index += 1
          const row = []
          if (index === 1) {
            row.push({
              text: `${dayjs(adjustment.fromDate).format('D MMMM YYYY')}`,
              rowspan: adjustment.offences.length,
            })
            row.push({ text: `${dayjs(adjustment.toDate).format('D MMMM YYYY')}`, rowspan: adjustment.offences.length })
            row.push({
              text: daysBetween(new Date(adjustment.fromDate), new Date(adjustment.toDate)),
              rowspan: adjustment.offences.length,
            })
          }
          row.push({ text: offence.offenceDescription })
          row.push({ text: this.offenceDateText(offence) })

          return row
        })
      }),
      [
        { text: 'Total days', classes: 'govuk-table__header' },
        {},
        {
          html: `<strong>${this.adjustments
            .map(it => daysBetween(new Date(it.fromDate), new Date(it.toDate)))
            .reduce((sum, current) => sum + current, 0)} days</strong>`,
        },
        {},
        {},
      ],
    ]
  }

  public remandToolLink(): string {
    return `/prisoner/${this.nomsID}/remand`
  }

  public continueLink(): string {
    return `/prisoner/${this.nomsID}/confirm-and-save`
  }

  public adjustmentsWithOffences() {
    return this.adjustments.map(it => {
      return {
        ...it,
        daysToDisplay: daysBetween(new Date(it.fromDate), new Date(it.toDate)),
        offences: this.offencesForRemandAdjustment(it, this.sentencesAndOffences),
      }
    })
  }

  private offenceDateText(offence: PrisonApiOffence) {
    return `${
      offence.offenceStartDate && offence.offenceEndDate && offence.offenceEndDate !== offence.offenceStartDate
        ? `${dayjs(offence.offenceStartDate).format('D MMM YYYY')} to ${dayjs(offence.offenceEndDate).format('D MMM YYYY')}`
        : `${dayjs(offence.offenceStartDate).format('D MMM YYYY')}`
    }`
  }

  private offencesForRemandAdjustment(
    adjustment: Adjustment,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
  ): (PrisonApiOffence & { courtDescription: string })[] {
    return sentencesAndOffences.flatMap(so => {
      return so.offences
        .filter(off => {
          if (adjustment.remand?.chargeId?.length) {
            return adjustment.remand?.chargeId.includes(off.offenderChargeId)
          }
          return adjustment.sentenceSequence === so.sentenceSequence
        })
        .map(off => {
          return { ...off, courtDescription: so.courtDescription }
        })
    })
  }
}
