import dayjs from 'dayjs'
import { RemandAndCharge } from '../../../model/DetailedRemandCalculation'

export default interface RemandBreakdownModel {
  from: string
  to: string
  days: number
  cases: RemandBreakdownCase[]
}

interface RemandBreakdownCase {
  courtCaseRef?: string
  courtLocation?: string
  offences: RemandBreakdownOffence[]
}

interface RemandBreakdownOffence {
  count?: number
  offenceCode: string
  offenceDescription: string
  committedOn: string
  outcomeAtRemandStartDescription: string
  outcomeAtRemandEndDescription: string
  currentOutcomeDescription: string
}

export function createRemandBreakdown(remandPeriods: RemandAndCharge[]): RemandBreakdownModel[] {
  return remandPeriods.map(period => {
    const chargesByCase = Object.values(Object.groupBy(period.charges, ({ courtCaseRef }) => courtCaseRef ?? 'unknown'))
    return {
      from: date(period.from),
      to: date(period.to),
      days: period.days,
      cases: chargesByCase.map(caseCharges => {
        const aCharge = caseCharges[0]
        return {
          courtCaseRef: aCharge.courtCaseRef,
          courtLocation: aCharge.courtLocation,
          offences: caseCharges
            .map(charge => ({
              count: charge.sentenceSequence,
              offenceCode: charge.offence.code,
              offenceDescription: charge.offence.description,
              committedOn: `${date(charge.offenceDate)}${charge.offenceEndDate ? ` to ${date(charge.offenceDate)}` : ''}`,
              outcomeAtRemandStartDescription: `${period.fromEvent.description} on ${dayjs(period.fromEvent.date).format('DD/MM/YYYY')}`,
              outcomeAtRemandEndDescription: `${period.toEvent.description} on ${dayjs(period.toEvent.date).format('DD/MM/YYYY')}`,
              currentOutcomeDescription: charge.resultDescription,
            }))
            .sort(sortOffences),
        }
      }),
    }
  })
}

function sortOffences(a: RemandBreakdownOffence, b: RemandBreakdownOffence) {
  return a.count < b.count ? -1 : 1
}

function date(dateString: string) {
  return dayjs(dateString).format('DD/MM/YYYY')
}
