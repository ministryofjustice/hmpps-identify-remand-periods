import dayjs from 'dayjs'
import { PrisonApiPrisoner } from '../@types/prisonApi/prisonClientTypes'
import {
  Charge,
  LegacyDataProblem,
  Remand,
  RemandResult,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import config from '../config'

export default class RelevantRemandModel {
  public relevantChargeRemand: Remand[]

  public notRelevantChargeRemand: Remand[]

  constructor(
    public prisonerDetail: PrisonApiPrisoner,
    public relevantRemand: RemandResult,
  ) {
    this.relevantChargeRemand = this.relevantRemand.chargeRemand.filter(it => this.isRelevant(it))
    this.notRelevantChargeRemand = this.relevantRemand.chargeRemand.filter(it => !this.isRelevant(it))
  }

  public isApplicable(sentenceRemand: Remand): boolean {
    return this.relevantRemand.sentenceRemand.some(it => it.charge.chargeId === sentenceRemand.charge.chargeId)
  }

  public returnToAdjustments(): string {
    return `${config.services.adjustmentServices.url}/${this.prisonerDetail.offenderNo}`
  }

  public intersectingSentenceTable() {
    return {
      caption: 'Previous sentences that may intersect remand periods',
      head: [
        {
          text: 'Sentence',
        },
        {
          text: 'Start',
        },
        {
          text: 'End',
        },
      ],
      rows: this.relevantRemand.intersectingSentences.map(it => {
        return [
          {
            html: `${it.charge.offence.description}<br />
            <span class="govuk-hint">
                ${
                  it.charge.offenceDate &&
                  it.charge.offenceEndDate &&
                  it.charge.offenceEndDate !== it.charge.offenceDate
                    ? `Committed from ${dayjs(it.charge.offenceDate).format('D MMM YYYY')} to ${dayjs(
                        it.charge.offenceEndDate,
                      ).format('D MMM YYYY')}`
                    : `Committed on ${dayjs(it.charge.offenceDate).format('D MMMM YYYY')}`
                }
            </span>`,
          },
          {
            text:
              (it.from === it.sentence.sentenceDate ? 'Sentenced at ' : 'Recalled at ') +
              dayjs(it.from).format('D MMM YYYY'),
          },
          {
            text:
              (it.from === it.sentence.sentenceDate ? 'Release at ' : 'Post recall release at ') +
              dayjs(it.to).format('D MMM YYYY'),
          },
        ]
      }),
    }
  }

  public mostImportantErrors(): { text: string }[] {
    return this.relevantRemand.issuesWithLegacyData
      .filter(it => {
        return this.isImportantError(it)
      })
      .map(it => {
        return { text: it.message + (this.includeBookNumberInMessage(it) ? ` within booking ${it.bookNumber}` : '') }
      })
  }

  private isImportantError(problem: LegacyDataProblem): boolean {
    return this.relevantRemand.sentenceRemand.some(
      it =>
        it.charge.offence.statute === problem.offence.statute ||
        (it.charge.courtCaseRef && problem.courtCaseRef && problem.courtCaseRef === it.charge.courtCaseRef),
    )
  }

  public otherErrors(): { text: string }[] {
    return this.relevantRemand.issuesWithLegacyData
      .filter(it => {
        return !this.isImportantError(it)
      })
      .map(it => {
        return { text: it.message + (this.includeBookNumberInMessage(it) ? ` within booking ${it.bookNumber}` : '') }
      })
  }

  public allErrors() {
    return this.mostImportantErrors().concat(this.otherErrors())
  }

  public includeBookNumberInMessage(problem: LegacyDataProblem) {
    return problem.bookingId !== this.prisonerDetail.bookingId
  }

  public sharedRemand(remand: Remand): Charge[] {
    return this.relevantRemand.chargeRemand
      .filter(it => it.charge.sentenceSequence != null)
      .filter(it => {
        return this.overlaps(it, remand)
      })
      .map(it => it.charge)
  }

  private overlaps(one: Remand, two: Remand): boolean {
    return (
      (dayjs(one.from).isAfter(two.from) && dayjs(one.from).isBefore(two.to)) ||
      dayjs(one.from).isSame(two.from) ||
      (dayjs(one.to).isAfter(two.from) && dayjs(one.to).isBefore(two.to)) ||
      dayjs(one.to).isSame(two.to)
    )
  }

  private isRelevant(remand: Remand) {
    return (
      remand.charge.sentenceSequence != null &&
      this.relevantRemand.sentenceRemand.some(it => {
        return this.overlaps(it, remand)
      })
    )
  }
}
