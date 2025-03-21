import dayjs from 'dayjs'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import { daysBetween } from '../utils/utils'
import config from '../config'

export default class ConfirmAndSaveModel {
  constructor(
    public nomsID: string,
    public adjustments: Adjustment[],
    public unusedDeductions: number,
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
        text: this.adjustments
          .map(it => daysBetween(new Date(it.fromDate), new Date(it.toDate)))
          .reduce((sum, current) => sum + current, 0),
      },
    ]
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

  public cancelLink(): string {
    return `${config.services.adjustmentServices.url}/${this.nomsID}/`
  }
}
