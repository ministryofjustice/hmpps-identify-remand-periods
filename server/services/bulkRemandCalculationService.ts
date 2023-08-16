import { Remand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import {
  PrisonApiCourtDateResult,
  PrisonApiPrisoner,
  PrisonApiSentenceAdjustments,
} from '../@types/prisonApi/prisonClientTypes'
import BulkRemandCalculationRow from '../model/BulkRemandCalculationRow'
import { sameMembers } from '../utils/utils'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerService from './prisonerService'

export default class BulkRemandCalculationService {
  constructor(
    private readonly prisonerService: PrisonerService,
    private readonly identifyRemandPeriodsService: IdentifyRemandPeriodsService,
  ) {}

  /* eslint-disable */
  public async runCalculations(
    caseloads: string[],
    token: string,
    nomsIds: string[],
  ): Promise<BulkRemandCalculationRow[]> {
    const csvData: BulkRemandCalculationRow[] = []

    for (const nomsId of nomsIds) {
      try {
        const prisonDetails = await this.prisonerService.getPrisonerDetailIncludingReleased(nomsId, caseloads, token)
        const bookingId = prisonDetails.bookingId
        const nomisAdjustments = await this.prisonerService.getBookingAndSentenceAdjustments(bookingId, token)
        const nomisRemand = nomisAdjustments.sentenceAdjustments.filter(it => it.type === 'REMAND')
        const nomisUnusedRemand = nomisAdjustments.sentenceAdjustments.filter(it => it.type === 'UNUSED_REMAND')
        const courtDates = await this.prisonerService.getCourtDateResults(nomsId, token)

        try {
          const calculatedRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(nomsId, token)

          csvData.push(
            this.addRow(nomsId, bookingId, prisonDetails, nomisRemand, nomisUnusedRemand, courtDates, calculatedRemand),
          )
        } catch (ex) {
          csvData.push(
            this.addRow(
              nomsId,
              bookingId,
              prisonDetails,
              nomisRemand,
              nomisUnusedRemand,
              courtDates,
              null,
              ex,
              'Error calculating remand',
            ),
          )
        }
      } catch (ex) {
        csvData.push(this.addRow(nomsId, null, null, null, null, null, null, ex, 'Error fetching data from prison-api'))
      }
    }
    return csvData
  }
  /* eslint-enable */

  private addRow(
    nomsId: string,
    bookingId: number,
    prisoner: PrisonApiPrisoner,
    nomisRemandSentenceAdjustment: PrisonApiSentenceAdjustments[],
    nomisUnusedRemandSentenceAdjustment: PrisonApiSentenceAdjustments[],
    courtDates: PrisonApiCourtDateResult[],
    calculatedRemand: RemandResult,
    ex?: unknown,
    errorText?: string,
  ): BulkRemandCalculationRow {
    const nomisRemand = this.sentenceAdjustmentToRemand(bookingId, nomisRemandSentenceAdjustment)
    const nomisUnusedRemand = this.sentenceAdjustmentToRemand(bookingId, nomisUnusedRemandSentenceAdjustment)
    return {
      NOMS_ID: nomsId,
      ACTIVE_BOOKING_ID: bookingId,
      AGENCY_LOCATION_ID: prisoner?.agencyId,
      COURT_DATES_JSON: JSON.stringify(courtDates),
      CALCULATED_ALL_JSON: JSON.stringify(calculatedRemand),
      NOMIS_REMAND_DAYS: this.sumRemandDays(bookingId, nomisRemand),
      NOMIS_UNUSED_REMAND_DAYS: this.sumRemandDays(bookingId, nomisUnusedRemand),
      CALCULATED_REMAND_DAYS: this.sumRemandDays(bookingId, calculatedRemand?.sentenceRemand),
      NOMIS_REMAND_JSON: JSON.stringify(nomisRemand),
      NOMIS_UNUSED_REMAND_JSON: JSON.stringify(nomisUnusedRemand),
      CALCULATED_REMAND_JSON: JSON.stringify(calculatedRemand?.sentenceRemand),
      IS_REMAND_SAME: this.isRemandSame(bookingId, nomisRemand, calculatedRemand?.sentenceRemand) ? 'Y' : 'N',
      IS_DATES_SAME: this.isDatesSame(bookingId, nomisRemand, calculatedRemand?.sentenceRemand) ? 'Y' : 'N',
      IS_DAYS_SAME: this.isDaysSame(bookingId, nomisRemand, calculatedRemand?.sentenceRemand) ? 'Y' : 'N',
      INTERSECTING_SENTENCES: JSON.stringify(calculatedRemand?.intersectingSentences),
      NOMIS_INPUT_MESSAGES: calculatedRemand?.issuesWithLegacyData?.join('\n'),
      ERROR_JSON: JSON.stringify(ex),
      ERROR_TEXT: errorText,
    }
  }

  private filterForBookingId(bookingId: number, remands: Remand[]): Remand[] {
    return remands ? remands.filter(it => it.charge.bookingId === bookingId) : remands
  }

  private isRemandSame(bookingId: number, nomisRemand: Remand[], calculatedRemand: Remand[]): boolean {
    return (
      nomisRemand != null &&
      calculatedRemand != null &&
      sameMembers(this.filterForBookingId(bookingId, nomisRemand), this.filterForBookingId(bookingId, calculatedRemand))
    )
  }

  private isDaysSame(bookingId: number, nomisRemand: Remand[], calculatedRemand: Remand[]): boolean {
    return (
      nomisRemand != null &&
      calculatedRemand != null &&
      this.sumRemandDays(bookingId, nomisRemand) === this.sumRemandDays(bookingId, calculatedRemand)
    )
  }

  private isDatesSame(bookingId: number, nomisRemand: Remand[], calculatedRemand: Remand[]): boolean {
    return (
      nomisRemand != null &&
      calculatedRemand != null &&
      sameMembers(
        this.filterForBookingId(bookingId, nomisRemand).map(it => {
          return { from: it.from, to: it.to }
        }),
        this.filterForBookingId(bookingId, calculatedRemand).map(it => {
          return { from: it.from, to: it.to }
        }),
      )
    )
  }

  private sumRemandDays(bookingId: number, remand: Remand[]): number {
    return remand
      ? this.filterForBookingId(bookingId, remand)
          .map(a => a.days)
          .reduce((sum, current) => sum + current, 0)
      : 0
  }

  private sentenceAdjustmentToRemand(bookingId: number, sentenceAdjustments: PrisonApiSentenceAdjustments[]): Remand[] {
    return sentenceAdjustments
      ? sentenceAdjustments.map(it => {
          return {
            days: it.numberOfDays,
            from: it.fromDate,
            to: it.toDate,
            charge: {
              bookingId,
            },
          } as Remand
        })
      : []
  }
}
