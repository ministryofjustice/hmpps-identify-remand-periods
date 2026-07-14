import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
import {
  LegacyDataProblem,
  RemandApplicableUserSelection,
  RemandResult,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import config from '../config'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import { daysBetween } from '../utils/utils'
import RemandCardModel from './RemandCardModel'
import DetailedRemandCalculationAndSentence from './DetailedRemandCalculationAndSentence'
import DetailedRemandCalculation, { RemandAndCharge } from './DetailedRemandCalculation'
import RemandTableModel, { createRemandTableFromAdjustments } from '../views/components/remand-table/RemandTableModel'

export default class RelevantRemandModel extends RemandCardModel {
  public relevantChargeRemand: RemandAndCharge[]

  public notRelevantChargeRemand: RemandAndCharge[]

  private detailedRemandAndSentence: DetailedRemandCalculationAndSentence

  public adjustments: (Adjustment & { daysBetween: number })[]

  public remandTable: RemandTableModel

  constructor(
    public prisonerNumber: string,
    relevantRemand: RemandResult,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
    public selections: RemandApplicableUserSelection[],
    private existingAdjustments: Adjustment[],
    private calculationWithoutSelections: RemandResult,
  ) {
    super(prisonerNumber, relevantRemand, sentencesAndOffences)
    const chargeRemandAndCharges = this.relevantRemand.chargeRemand.map(it =>
      DetailedRemandCalculation.toRemandAndCharge(it, relevantRemand),
    )
    this.relevantChargeRemand = chargeRemandAndCharges.filter(it => this.isRelevant(it))
    this.notRelevantChargeRemand = chargeRemandAndCharges.filter(it => !this.isRelevant(it))
    this.detailedRemandAndSentence = new DetailedRemandCalculationAndSentence(
      new DetailedRemandCalculation(relevantRemand),
      sentencesAndOffences,
    )
    this.adjustments = RelevantRemandModel.getAdjustments(relevantRemand)
    this.remandTable = createRemandTableFromAdjustments(this.adjustments, relevantRemand.charges, true)
  }

  public returnToAdjustments(): string {
    return `${config.services.adjustmentServices.url}/${this.prisonerNumber}`
  }

  private static getAdjustments(relevantRemand: RemandResult): (Adjustment & { daysBetween: number })[] {
    return relevantRemand.adjustments
      .filter(it => it.status === 'ACTIVE')
      .map(it => {
        return { ...it, daysBetween: daysBetween(new Date(it.fromDate), new Date(it.toDate)) }
      }) as (Adjustment & { daysBetween: number })[]
  }

  public totalDays(): number {
    return this.adjustments.map(a => a.daysBetween).reduce((sum, current) => sum + current, 0)
  }

  public adjustmentCharges(adjustment: Adjustment) {
    return adjustment.remand.chargeId.map(it => this.relevantRemand.charges[it])
  }

  public mostImportantErrors(): LegacyDataProblem[] {
    return this.detailedRemandAndSentence.mostImportantErrors()
  }

  public otherErrors(): LegacyDataProblem[] {
    return this.detailedRemandAndSentence.otherErrors()
  }

  public chargeIdsOfRemand(remand: RemandAndCharge): number[] {
    return remand.charges.map(it => it.chargeId)
  }

  public changesNumberOfDays(): boolean {
    const adjustmentDays = this.existingAdjustments
      .filter(a => a.adjustmentType === 'REMAND')
      .map(a => a.days)
      .reduce((sum, current) => sum + current, 0)
    const identifiedDays = this.relevantRemand.adjustments
      .filter(it => it.status === 'ACTIVE')
      .map(it => daysBetween(new Date(it.fromDate), new Date(it.toDate)))
      .reduce((sum, current) => sum + current, 0)
    return adjustmentDays !== 0 && adjustmentDays !== identifiedDays
  }

  public detailedBreakdownLink() {
    return `/prisoner/${this.prisonerNumber}/detailed-breakdown`
  }

  public backLink(): string | null {
    const replaceableCharges = new DetailedRemandCalculation(
      this.calculationWithoutSelections,
    ).getReplaceableChargeRemandGroupedByChargeIds()
    if (replaceableCharges && replaceableCharges.length > 0) {
      const nextChargeIds = replaceableCharges[replaceableCharges.length - 1].chargeIds.join(',')
      return `/prisoner/${this.prisonerNumber}/replaced-offence?chargeIds=${nextChargeIds}`
    }
    return null
  }
}
