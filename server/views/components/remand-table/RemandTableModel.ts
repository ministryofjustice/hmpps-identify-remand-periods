import dayjs from 'dayjs'
import { Charge, ChargeRemand } from '../../../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { Adjustment } from '../../../@types/adjustments/adjustmentsTypes'

export default interface RemandTableModel {
  rows: RemandCell[][]
}

interface RemandCell {
  text?: string
  html?: string
  classes?: string
}

export function createRemandTableFromChargeRemand(
  remandPeriods: ChargeRemand[],
  charges: Record<string, Charge>,
  includeTotal: boolean,
): RemandTableModel {
  return createRemandTable(remandPeriods, charges, includeTotal)
}

export function createRemandTableFromAdjustments(
  adjustments: (Adjustment & { daysBetween: number })[],
  charges: Record<string, Charge>,
  includeTotal: boolean,
): RemandTableModel {
  return createRemandTable(
    adjustments.map(adjustment => ({
      from: adjustment.fromDate,
      to: adjustment.toDate,
      days: adjustment.daysBetween,
      chargeIds: adjustment.remand.chargeId,
    })),
    charges,
    includeTotal,
  )
}

function createRemandTable(
  periods: { from: string; to: string; chargeIds: number[]; days?: number }[],
  charges: Record<string, Charge>,
  includeTotal: boolean,
): RemandTableModel {
  let total = 0
  const rows = periods.flatMap(period => {
    const periodCharges = period.chargeIds.map(it => charges[it]).sort(sortCharges)
    total += period.days
    const chargeRows: RemandCell[][] = []
    periodCharges.forEach((charge, index) => {
      const firstCharge = index === 0
      const lastCharge = index + 1 === periodCharges.length
      const classes = !lastCharge ? 'no-bottom-border' : ''
      chargeRows.push([
        { text: firstCharge ? `${date(period.from)} to ${date(period.to)}` : '', classes },
        { text: firstCharge ? `${period.days}` : '', classes },
        { text: `${charge.offence.code} - ${charge.offence.description}`, classes },
        {
          text: `${date(charge.offenceDate)}${charge.offenceEndDate ? ` to ${date(charge.offenceDate)}` : ''}`,
          classes,
        },
      ])
    })
    return chargeRows
  })
  if (includeTotal) {
    rows.push([
      { text: 'Total days', classes: 'govuk-!-font-weight-bold' },
      { text: `${total} ${total > 1 ? 'days' : 'day'}`, classes: 'govuk-!-font-weight-bold' },
      { text: '' },
      { text: '' },
    ])
  }
  return {
    rows,
  }
}

function sortCharges(a: Charge, b: Charge) {
  if (a.offenceDate !== b.offenceDate) {
    return new Date(a.offenceDate) > new Date(b.offenceDate) ? 1 : -1
  }
  if (a.offenceEndDate !== b.offenceEndDate) {
    return new Date(a.offenceEndDate) > new Date(b.offenceEndDate) ? 1 : -1
  }
  return 0
}

function date(dateString: string) {
  return dayjs(dateString).format('DD/MM/YYYY')
}
