import { IntersectingSentence, Remand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import {
  PrisonApiCourtDateResult,
  PrisonApiOffenderSentenceAndOffences,
  PrisonApiSentenceAdjustments,
} from '../@types/prisonApi/prisonClientTypes'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import BulkRemandCalculationRow from '../model/BulkRemandCalculationRow'
import { onlyUnique, sameMembers } from '../utils/utils'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'

export default class BulkRemandCalculationService {
  constructor(
    private readonly prisonerSearchService: PrisonerSearchService,
    private readonly prisonerService: PrisonerService,
    private readonly identifyRemandPeriodsService: IdentifyRemandPeriodsService,
  ) {}

  /* eslint-disable */
  public async runCalculations(
    caseloads: string[],
    username: string,
    nomsIds: string[],
  ): Promise<BulkRemandCalculationRow[]> {
    const csvData: BulkRemandCalculationRow[] = []

    for (const nomsId of nomsIds) {
      try {
        const prisonDetails = await this.prisonerSearchService.getPrisonerDetails(nomsId, caseloads, username)
        const bookingId = Number(prisonDetails.bookingId)
        const nomisAdjustments = await this.prisonerService.getBookingAndSentenceAdjustments(bookingId, username)
        const nomisRemand = nomisAdjustments.sentenceAdjustments.filter(
          it => it.type === 'REMAND' || it.type === 'RECALL_SENTENCE_REMAND',
        )
        const nomisUnusedRemand = nomisAdjustments.sentenceAdjustments.filter(it => it.type === 'UNUSED_REMAND')
        const courtDates = await this.prisonerService.getCourtDateResults(nomsId, username)

        try {
          const calculatedRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(nomsId, username)
          const sentences = await this.findSourceDataForIntersectingSentence(
            calculatedRemand,
            calculatedRemand.intersectingSentences,
            username,
          )

          csvData.push(
            this.addRow(
              nomsId,
              bookingId,
              prisonDetails,
              nomisRemand,
              nomisUnusedRemand,
              courtDates,
              calculatedRemand,
              sentences,
              null,
              null,
            ),
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
              null,
              ex,
              'Error calculating remand',
            ),
          )
        }
      } catch (ex) {
        csvData.push(
          this.addRow(
            nomsId,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            ex,
            `Error fetching data from prison-api ${ex.message}`,
          ),
        )
      }
    }
    return csvData
  }
  /* eslint-enable */

  private addRow(
    nomsId: string,
    bookingId: number,
    prisoner: PrisonerSearchApiPrisoner,
    nomisRemandSentenceAdjustment: PrisonApiSentenceAdjustments[],
    nomisUnusedRemandSentenceAdjustment: PrisonApiSentenceAdjustments[],
    courtDates: PrisonApiCourtDateResult[],
    calculatedRemand: RemandResult,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
    ex: unknown,
    errorText: string,
  ): BulkRemandCalculationRow {
    const nomisRemand = this.sentenceAdjustmentToRemand(bookingId, nomisRemandSentenceAdjustment)
    const nomisUnusedRemand = this.sentenceAdjustmentToRemand(bookingId, nomisUnusedRemandSentenceAdjustment)
    return {
      NOMS_ID: nomsId,
      ACTIVE_BOOKING_ID: bookingId,
      AGENCY_LOCATION_ID: prisoner?.prisonId,
      COURT_DATES_JSON: JSON.stringify(courtDates, null, 2),
      CALCULATED_ALL_JSON: JSON.stringify(calculatedRemand, null, 2),
      NOMIS_REMAND_DAYS: this.sumRemandDays(calculatedRemand, bookingId, nomisRemand),
      NOMIS_UNUSED_REMAND_DAYS: this.sumRemandDays(calculatedRemand, bookingId, nomisUnusedRemand),
      CALCULATED_REMAND_DAYS: this.sumRemandDays(calculatedRemand, bookingId, calculatedRemand?.sentenceRemand),
      NOMIS_REMAND_JSON: JSON.stringify(nomisRemand, null, 2),
      NOMIS_UNUSED_REMAND_JSON: JSON.stringify(nomisUnusedRemand, null, 2),
      CALCULATED_REMAND_JSON: JSON.stringify(calculatedRemand?.sentenceRemand, null, 2),
      IS_REMAND_SAME: this.isRemandSame(calculatedRemand, bookingId, nomisRemand, calculatedRemand?.sentenceRemand)
        ? 'Y'
        : 'N',
      IS_DATES_SAME: this.isDatesSame(calculatedRemand, bookingId, nomisRemand, calculatedRemand?.sentenceRemand)
        ? 'Y'
        : 'N',
      IS_DAYS_SAME: this.isDaysSame(
        calculatedRemand,
        bookingId,
        nomisRemand.concat(nomisUnusedRemand),
        calculatedRemand?.sentenceRemand,
      )
        ? 'Y'
        : 'N',
      INTERSECTING_SENTENCES: JSON.stringify(calculatedRemand?.intersectingSentences, null, 2),
      INTERSECTING_SENTENCES_SOURCE: JSON.stringify(sentencesAndOffences, null, 2),
      NOMIS_INPUT_MESSAGES: calculatedRemand?.issuesWithLegacyData?.map(it => it.message).join('\n'),
      ERROR_JSON: JSON.stringify(ex, null, 2),
      ERROR_TEXT: errorText,
    }
  }

  private async findSourceDataForIntersectingSentence(
    relevantReamnd: RemandResult,
    intersectingSentences: IntersectingSentence[],
    username: string,
  ): Promise<PrisonApiOffenderSentenceAndOffences[]> {
    if (!intersectingSentences) {
      return []
    }
    const bookingIds = intersectingSentences.map(it => relevantReamnd.charges[it.chargeId].bookingId).filter(onlyUnique)

    const sentencesAndOffences = bookingIds.map(it => this.prisonerService.getSentencesAndOffences(it, username))

    return (await Promise.all(sentencesAndOffences)).flatMap(it => it)
  }

  private filterForBookingId(relevantReamnd: RemandResult, bookingId: number, remands: Remand[]): Remand[] {
    return remands ? remands.filter(it => relevantReamnd.charges[it.chargeId].bookingId === bookingId) : remands
  }

  private isRemandSame(
    relevantReamnd: RemandResult,
    bookingId: number,
    nomisRemand: Remand[],
    calculatedRemand: Remand[],
  ): boolean {
    return (
      nomisRemand != null &&
      calculatedRemand != null &&
      sameMembers(
        this.filterForBookingId(relevantReamnd, bookingId, nomisRemand),
        this.filterForBookingId(relevantReamnd, bookingId, calculatedRemand),
      )
    )
  }

  private isDaysSame(
    relevantReamnd: RemandResult,
    bookingId: number,
    nomisRemand: Remand[],
    calculatedRemand: Remand[],
  ): boolean {
    return (
      nomisRemand != null &&
      calculatedRemand != null &&
      this.sumRemandDays(relevantReamnd, bookingId, nomisRemand) ===
        this.sumRemandDays(relevantReamnd, bookingId, calculatedRemand)
    )
  }

  private isDatesSame(
    relevantReamnd: RemandResult,
    bookingId: number,
    nomisRemand: Remand[],
    calculatedRemand: Remand[],
  ): boolean {
    return (
      nomisRemand != null &&
      calculatedRemand != null &&
      sameMembers(
        this.filterForBookingId(relevantReamnd, bookingId, nomisRemand).map(it => {
          return { from: it.from, to: it.to }
        }),
        this.filterForBookingId(relevantReamnd, bookingId, calculatedRemand).map(it => {
          return { from: it.from, to: it.to }
        }),
      )
    )
  }

  private sumRemandDays(relevantReamnd: RemandResult, bookingId: number, remand: Remand[]): number {
    return remand
      ? this.filterForBookingId(relevantReamnd, bookingId, remand)
          .map(a => a.days)
          .reduce((sum, current) => sum + current, 0)
      : 0
  }

  private sentenceAdjustmentToRemand(
    bookingId: number,
    sentenceAdjustments: PrisonApiSentenceAdjustments[],
  ): RemandDebug[] {
    return sentenceAdjustments
      ? sentenceAdjustments.map(it => {
          return {
            days: it.numberOfDays,
            from: it.fromDate,
            to: it.toDate,
            type: it.type,
            active: it.active,
            sentenceSequence: it.sentenceSequence,
            chargeId: 1,
          } as RemandDebug
        })
      : []
  }
}

type RemandDebug = Remand & {
  type?: string
  sentenceSequence?: number
}
