import { v4 as uuidv4 } from 'uuid'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import {
  ChargeRemand,
  LegacyDataProblem,
  RemandResult,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import {
  PrisonApiCourtDateResult,
  PrisonApiImprisonmentStatusHistoryDto,
  PrisonApiOffenderSentenceAndOffences,
  PrisonApiSentenceAdjustments,
} from '../@types/prisonApi/prisonClientTypes'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import BulkRemandCalculationRow from '../model/BulkRemandCalculationRow'
import DetailedRemandCalculation from '../model/DetailedRemandCalculation'
import DetailedRemandCalculationAndSentence from '../model/DetailedRemandCalculationAndSentence'
import { daysBetween, onlyUnique, sameMembers } from '../utils/utils'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerService from './prisonerService'
import { UserDetails } from './userService'
import BulkRemandCalculationRunStore from '../data/bulkResultsStore/bulkRemandCalculationRunStore'
import logger from '../../logger'
import BulkRemandCalculationRun from '../model/BulkRemandCalculationRun'
import PrisonerSearchService from './prisonerSearchService'

export default class BulkRemandCalculationService {
  constructor(
    private readonly prisonerSearchService: PrisonerSearchService,
    private readonly prisonerService: PrisonerService,
    private readonly identifyRemandPeriodsService: IdentifyRemandPeriodsService,
    private readonly bulkResultsStore: BulkRemandCalculationRunStore,
  ) {}

  private readonly SECONDS_TO_KEEP_RESULTS = 60 * 60 * 4 // Keep results in redis for up to 4 hours

  public async startRun(user: UserDetails, nomsIds: string[] | null, prisonId: string | null): Promise<string> {
    const id = uuidv4()
    await this.bulkResultsStore.setRun(id, { id, status: 'RUNNING', results: null }, this.SECONDS_TO_KEEP_RESULTS)
    this.runCalculations(user, nomsIds, prisonId)
      .catch(err => {
        logger.error('Failed to run bulk calc', err)
        this.bulkResultsStore.setRun(id, { id, status: 'FAILED', results: null }, this.SECONDS_TO_KEEP_RESULTS)
      })
      .then(results => {
        if (results) {
          this.bulkResultsStore.setRun(id, { id, status: 'DONE', results }, this.SECONDS_TO_KEEP_RESULTS)
        }
      })
    return id
  }

  public async getRun(id: string): Promise<BulkRemandCalculationRun | null> {
    return this.bulkResultsStore.getRun(id)
  }

  /* eslint-disable */
  public async runCalculations(
    user: UserDetails,
    specificPrisonerIds: string[] | null,
    prisonId: string | null,
  ): Promise<BulkRemandCalculationRow[]> {
    const csvData: BulkRemandCalculationRow[] = []
    const { username } = user

    let nomsIds: string[]
    const prisonerDetailsByPrisonerId = new Map<string, PrisonerSearchApiPrisoner>()
    if (prisonId) {
      logger.info('Running bulk for every prisoner in ' + prisonId)
      const allPrisonersInPrison = await this.prisonerSearchService.getPrisonersInEstablishment(prisonId, user)
      allPrisonersInPrison.forEach(prisoner => prisonerDetailsByPrisonerId.set(prisoner.prisonerNumber, prisoner))
      nomsIds = [...prisonerDetailsByPrisonerId.keys()]
    } else {
      logger.info('Running bulk for specific prisoners', specificPrisonerIds)
      nomsIds = specificPrisonerIds
    }
    for (const nomsId of nomsIds) {
      await this.handlePrisoner(nomsId, user, username, csvData, prisonerDetailsByPrisonerId)
    }
    return csvData
  }

  private async handlePrisoner(
    nomsId: string,
    user: UserDetails,
    username: string,
    csvData: BulkRemandCalculationRow[],
    prisonerDetailsByPrisonerId: Map<string, PrisonerSearchApiPrisoner>,
  ) {
    let prisonDetails,
      bookingId,
      nomisAdjustments,
      nomisRemand,
      nomisUnusedRemand,
      courtDates,
      calculatedRemand,
      sentences,
      imprisonmentStatuses

    try {
      if (prisonerDetailsByPrisonerId.has(nomsId)) {
        prisonDetails = prisonerDetailsByPrisonerId.get(nomsId)
      } else {
        // lazy load for specific list of prisoner ids so we can handle missing prisoners without breaking the whole run.
        // if you're loading for a whole prison then it's impossible for this to be missing.
        prisonDetails = await this.prisonerSearchService.getPrisonerDetails(nomsId, user)
      }
      bookingId = prisonDetails.bookingId
      nomisAdjustments = await this.prisonerService.getBookingAndSentenceAdjustments(bookingId, username)
      nomisRemand = nomisAdjustments.sentenceAdjustments
        .filter(it => it.type === 'REMAND' || it.type === 'RECALL_SENTENCE_REMAND')
        .filter(it => it.active)
      nomisUnusedRemand = nomisAdjustments.sentenceAdjustments
        .filter(it => it.type === 'UNUSED_REMAND')
        .filter(it => it.active)
      courtDates = await this.prisonerService.getCourtDateResults(nomsId, username)
      imprisonmentStatuses = await this.prisonerService.getImprisonmentStatuses(nomsId, username)

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
          imprisonmentStatuses,
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
          imprisonmentStatuses || [],
          ex,
        ),
      )
    }
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
    imprisonmentStatuses: PrisonApiImprisonmentStatusHistoryDto[],
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
        IMPRISONMENT_STATUSES: JSON.stringify(imprisonmentStatuses, null, 2),

        IS_REMAND_SAME: !ex && isDatesSame && isDaysSame ? 'Y' : 'N',
        IS_DATES_SAME: !ex && isDatesSame ? 'Y' : 'N',
        IS_DAYS_SAME: !ex && isDaysSame ? 'Y' : 'N',
        UPGRADE_DOWNGRADE_REMAND_PERIODS: ex ? 0 : this.countUpgradeDowngradeRemandPeriods(calculatedRemand),
        UPGRADE_DOWNGRADE_CHARGES: ex ? 0 : this.countUpgradeDowngradeCharges(calculatedRemand),

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
        VALIDATION_MESSAGES: ex
          ? ''
          : this.importantErrors(calculatedRemand, sentencesAndOffences, bookingId)
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

  private countUpgradeDowngradeRemandPeriods(calculatedRemand: RemandResult): number {
    return this.getUpgradeDowngradePeriods(calculatedRemand).length
  }

  private countUpgradeDowngradeCharges(calculatedRemand: RemandResult): number {
    return this.getUpgradeDowngradePeriods(calculatedRemand).flatMap(it => it.chargeIds).length
  }

  private getUpgradeDowngradePeriods(calculatedRemand: RemandResult): ChargeRemand[] {
    return (calculatedRemand?.chargeRemand || []).filter(it =>
      ['CASE_NOT_CONCLUDED', 'NOT_SENTENCED'].includes(it.status),
    )
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
    result: RemandResult,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
    bookingId: string,
  ): LegacyDataProblem[] {
    const sentenceAndOffencesOnActiveBooking = sentencesAndOffences.filter(it => it.bookingId.toString() === bookingId)
    return new DetailedRemandCalculationAndSentence(
      new DetailedRemandCalculation(result),
      sentenceAndOffencesOnActiveBooking,
    ).mostImportantErrors()
  }
}
