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
      ...this.adjustmentsWithOffences().map(it => {
        return [
          { text: `${dayjs(it.fromDate).format('D MMMM YYYY')}` },
          { text: `${dayjs(it.toDate).format('D MMMM YYYY')}` },
          { text: daysBetween(new Date(it.fromDate), new Date(it.toDate)) },
          { html: it.offences ? it.offences.map(offence => offence.offenceDescription).join('<br>') : 'No offences' },
          {
            html: it.offences
              ? it.offences.map(offence => `${dayjs(offence.offenceStartDate).format('D MMMM YYYY')}`).join('<br>')
              : 'No offences',
          },
        ]
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
