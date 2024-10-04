import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import { LegacyDataProblem, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import {
  PrisonApiCourtDateResult,
  PrisonApiOffenderSentenceAndOffences,
  PrisonApiSentenceAdjustments,
} from '../@types/prisonApi/prisonClientTypes'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import BulkRemandCalculationRow from '../model/BulkRemandCalculationRow'
import { daysBetween, onlyUnique, sameMembers } from '../utils/utils'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'
import { UserDetails } from './userService'

export default class BulkRemandCalculationService {
  constructor(
    private readonly prisonerSearchService: PrisonerSearchService,
    private readonly prisonerService: PrisonerService,
    private readonly identifyRemandPeriodsService: IdentifyRemandPeriodsService,
  ) {}

  /* eslint-disable */
  public async runCalculations(user: UserDetails, nomsIds: string[]): Promise<BulkRemandCalculationRow[]> {
    const csvData: BulkRemandCalculationRow[] = []
    const { username } = user

    let prisonDetails,
      bookingId,
      nomisAdjustments,
      nomisRemand,
      nomisUnusedRemand,
      courtDates,
      calculatedRemand,
      sentences
    for (const nomsId of nomsIds) {
      try {
        prisonDetails = await this.prisonerSearchService.getPrisonerDetails(nomsId, user)
        bookingId = prisonDetails.bookingId
        nomisAdjustments = await this.prisonerService.getBookingAndSentenceAdjustments(bookingId, username)
        nomisRemand = nomisAdjustments.sentenceAdjustments
          .filter(it => it.type === 'REMAND' || it.type === 'RECALL_SENTENCE_REMAND')
          .filter(it => it.active)
        nomisUnusedRemand = nomisAdjustments.sentenceAdjustments
          .filter(it => it.type === 'UNUSED_REMAND')
          .filter(it => it.active)
        courtDates = await this.prisonerService.getCourtDateResults(nomsId, username)

        calculatedRemand = await this.identifyRemandPeriodsService.calculateRelevantRemand(
          nomsId,
          { includeRemandCalculation: true, userSelections: [] },
          username,
        )
        sentences = await this.findSourceDataForIntersectingSentence(calculatedRemand, username)
        if (!sentences.length) {
          sentences = await this.prisonerService.getSentencesAndOffences(bookingId, username)
        }

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
          ),
        )
      } catch (ex) {
        csvData.push(
          this.addRow(
            nomsId,
            bookingId,
            prisonDetails,
            nomisRemand || [],
            nomisUnusedRemand || [],
            courtDates || [],
            calculatedRemand,
            sentences || [],
            ex,
          ),
        )
      }
    }
    return csvData
  }
  /* eslint-enable */

  private addRow(
    nomsId: string,
    bookingId: string,
    prisoner: PrisonerSearchApiPrisoner,
    nomisRemandSentenceAdjustment: PrisonApiSentenceAdjustments[],
    nomisUnusedRemandSentenceAdjustment: PrisonApiSentenceAdjustments[],
    courtDates: PrisonApiCourtDateResult[],
    calculatedRemand: RemandResult,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
    ex: Error,
  ): BulkRemandCalculationRow {
    try {
      const calculatedActiveAdjustments = (calculatedRemand?.adjustments
        ?.filter(it => it.status === 'ACTIVE')
        ?.filter(it => it.bookingId, toString() === bookingId) || []) as Adjustment[]
      const nomisDays =
        this.sumRemandDaysNOMISAdjustment(nomisRemandSentenceAdjustment) +
        this.sumRemandDaysNOMISAdjustment(nomisUnusedRemandSentenceAdjustment)
      const dpsDays = this.sumRemandDaysDPSAdjustment(calculatedActiveAdjustments)
      const isDatesSame = this.isDatesSame(nomisRemandSentenceAdjustment, calculatedActiveAdjustments)
      const isDaysSame = nomisDays === dpsDays
      return {
        NOMS_ID: nomsId,
        ACTIVE_BOOKING_ID: bookingId,
        AGENCY_LOCATION_ID: prisoner?.prisonId,
        COURT_DATES_JSON: JSON.stringify(courtDates, null, 2),

        IS_REMAND_SAME: !ex && isDatesSame && isDaysSame ? 'Y' : 'N',
        IS_DATES_SAME: !ex && isDatesSame ? 'Y' : 'N',
        IS_DAYS_SAME: !ex && isDaysSame ? 'Y' : 'N',

        NOMIS_REMAND_JSON: JSON.stringify(nomisRemandSentenceAdjustment, null, 2),
        NOMIS_UNUSED_REMAND_JSON: JSON.stringify(nomisUnusedRemandSentenceAdjustment, null, 2),
        NOMIS_REMAND_DAYS: nomisDays,

        REMAND_TOOL_INPUT: JSON.stringify({ remandCalculation: calculatedRemand?.remandCalculation }, null, 2),
        REMAND_TOOL_OUTPUT: JSON.stringify(
          { ...calculatedRemand, remandCalculation: undefined, charges: undefined },
          null,
          2,
        ),
        CALCULATED_REMAND_DAYS: dpsDays,
        INTERSECTING_SENTENCES: JSON.stringify(calculatedRemand?.intersectingSentences, null, 2),
        INTERSECTING_SENTENCES_SOURCE: JSON.stringify(sentencesAndOffences, null, 2),
        VALIDATION_MESSAGES: this.importantErrors(calculatedRemand?.issuesWithLegacyData || [], sentencesAndOffences)
          ?.map(it => it.message)
          .join('\n'),
        ERROR_JSON: JSON.stringify(ex, null, 2),
        ERROR_TEXT: ex?.message,
        ERROR_STACK: ex?.stack,
      }
    } catch (error) {
      return {
        ERROR_JSON: 'Developer code error in processing adding row.',
        ERROR_TEXT: error?.message,
        ERROR_STACK: error?.stack,
      } as BulkRemandCalculationRow
    }
  }

  private async findSourceDataForIntersectingSentence(
    relevantRemand: RemandResult,
    username: string,
  ): Promise<PrisonApiOffenderSentenceAndOffences[]> {
    if (!relevantRemand?.intersectingSentences?.length) {
      return []
    }
    const bookingIds = relevantRemand.intersectingSentences
      .map(it => relevantRemand.charges[it.chargeId].bookingId)
      .filter(onlyUnique)

    const sentencesAndOffences = bookingIds.map(it =>
      this.prisonerService.getSentencesAndOffences(it.toString(), username),
    )

    return (await Promise.all(sentencesAndOffences)).flatMap(it => it)
  }

  private isDatesSame(nomisRemand: PrisonApiSentenceAdjustments[], calculatedRemand: Adjustment[]): boolean {
    return sameMembers(
      nomisRemand.map(it => {
        return { from: it.fromDate, to: it.toDate }
      }),
      calculatedRemand.map(it => {
        return { from: it.fromDate, to: it.toDate }
      }),
    )
  }

  private sumRemandDaysDPSAdjustment(remand: Adjustment[]): number {
    return remand
      .map(a => daysBetween(new Date(a.fromDate), new Date(a.toDate)))
      .reduce((sum, current) => sum + current, 0)
  }

  private sumRemandDaysNOMISAdjustment(remand: PrisonApiSentenceAdjustments[]): number {
    return remand.map(a => a.numberOfDays).reduce((sum, current) => sum + current, 0)
  }

  private importantErrors(
    problems: LegacyDataProblem[],
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
  ): LegacyDataProblem[] {
    const activeSentenceCourtCases = sentencesAndOffences.filter(it => !!it.caseReference).map(it => it.caseReference)
    const activeSentenceStatues = sentencesAndOffences.flatMap(it => it.offences.map(off => off.offenceStatute))

    return problems.filter(problem => {
      return (
        problem.type !== 'UNSUPPORTED_OUTCOME' &&
        (activeSentenceStatues.indexOf(problem.offence.statute) !== -1 ||
          activeSentenceCourtCases.indexOf(problem.courtCaseRef) !== -1)
      )
    })
  }
}
