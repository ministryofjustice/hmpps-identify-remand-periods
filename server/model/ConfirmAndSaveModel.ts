import dayjs from 'dayjs'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import { daysBetween } from '../utils/utils'
import config from '../config'
import { IdentifyRemandDecision } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'

export default class ConfirmAndSaveModel {
  constructor(
    public nomsID: string,
    public adjustments: Adjustment[],
    public unusedDeductions: number,
    public rejectedRemandDecision?: IdentifyRemandDecision,
  ) {}

  public table() {
    return {
      head: [{ text: 'Remand period' }, { text: 'Days spent on remand' }],
      rows: [...this.rows(), this.totalRow()],
    }
  }

  private totalRow() {
    return [
      {
        text: 'Total days',
        classes: 'govuk-table__header',
      },
      {
        text: this.getTotalDaysRemand(),
      },
    ]
  }

  private getTotalDaysRemand(): number {
    return this.adjustments
      .map(it => daysBetween(new Date(it.fromDate), new Date(it.toDate)))
      .reduce((sum, current) => sum + current, 0)
  }

  private rows() {
    return this.adjustments.map(it => {
      return [
        {
          text: `${dayjs(it.fromDate).format('DD MMM YYYY')} to ${dayjs(it.toDate).format('DD MMM YYYY')}`,
        },
        {
          text: daysBetween(new Date(it.fromDate), new Date(it.toDate)),
        },
      ]
    })
  }

  public getRemandHeading(): string {
    if (this.isDecisionRejected()) {
      if (this.getTotalDaysRemand() === 0) {
        return `<h2 class="govuk-heading-m">The remand tool has suggested 0 days of relevant remand that are being rejected.</h2>${this.getRejectedReasonLine()}`
      }
      return `<h2 class="govuk-heading-m">The remand tool suggested the below remand</h2>${this.getRejectedReasonLine()}`
    }
    if (this.getTotalDaysRemand() === 0) {
      return '<p class="govuk-body"><strong>You are about to accept the suggested 0 days of relevant remand by the remand tool.</strong></p>'
    }
    return '<h2 class="govuk-heading-m">Remand details</h2>'
  }

  private isDecisionRejected() {
    return this.rejectedRemandDecision?.accepted === false
  }

  private getRejectedReasonLine(): string {
    return `<p class="govuk-body">The reason for rejection was: <strong>${this.rejectedRemandDecision.rejectComment}</strong></p>`
  }

  public backLink(): string {
    if (this.adjustments.length && !this.isDecisionRejected()) {
      return `/prisoner/${this.nomsID}/overview`
    }
    return `/prisoner/${this.nomsID}/remand`
  }

  public cancelLink(): string {
    return `${config.services.adjustmentServices.url}/${this.nomsID}/`
  }
}
