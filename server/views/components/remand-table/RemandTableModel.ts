import dayjs from 'dayjs'
import { Charge, ChargeRemand } from '../../../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'

export default interface RemandTableModel {
  rows: RemandCell[][]
}

interface RemandCell {
  text?: string
  html?: string
  classes?: string
}

export function createRemandTable(remandPeriods: ChargeRemand[], charges: Record<string, Charge>): RemandTableModel {
  return {
    rows: remandPeriods.flatMap(remandPeriod => {
      const periodCharges = remandPeriod.chargeIds
        .map(it => charges[it])
        .sort((a, b) => {
          if (a.offenceDate !== b.offenceDate) {
            return new Date(a.offenceDate) > new Date(b.offenceDate) ? 1 : -1
          }
          if (a.offenceEndDate !== b.offenceEndDate) {
            return new Date(a.offenceEndDate) > new Date(b.offenceEndDate) ? 1 : -1
          }
          return 0
        })
      const chargeRows: RemandCell[][] = []
      periodCharges.forEach((charge, index) => {
        const firstCharge = index === 0
        const lastCharge = index + 1 === periodCharges.length
        const classes = !lastCharge ? 'no-bottom-border' : ''
        chargeRows.push([
          { text: firstCharge ? `${date(remandPeriod.from)} to ${date(remandPeriod.to)}` : '', classes },
          { text: firstCharge ? `${remandPeriod.days}` : '', classes },
          { text: `${charge.offence.code} - ${charge.offence.description}`, classes },
          {
            text: `${date(charge.offenceDate)}${charge.offenceEndDate ? ` to ${date(charge.offenceDate)}` : ''}`,
            classes,
          },
        ])
      })
      return chargeRows
    }),
  }
}

function date(dateString: string) {
  return dayjs(dateString).format('DD/MM/YYYY')
}
