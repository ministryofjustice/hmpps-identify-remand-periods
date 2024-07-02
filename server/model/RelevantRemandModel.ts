import dayjs from 'dayjs'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
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

  public activeSentenceCourtCases: string[]

  public activeSentenceStatues: string[]

  constructor(
    public prisonerNumber: string,
    public relevantRemand: RemandResult,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
  ) {
    this.relevantChargeRemand = this.relevantRemand.chargeRemand.filter(it => this.isRelevant(it))
    this.notRelevantChargeRemand = this.relevantRemand.chargeRemand.filter(it => !this.isRelevant(it))
    this.activeSentenceStatues = sentencesAndOffences
      .filter(it => it.sentenceStatus === 'A')
      .flatMap(it => it.offences.map(off => off.offenceStatute))
    this.activeSentenceCourtCases = sentencesAndOffences
      .filter(it => it.sentenceStatus === 'A' && !!it.caseReference)
      .map(it => it.caseReference)
  }

  public isApplicable(sentenceRemand: Remand): boolean {
    return this.relevantRemand.sentenceRemand.some(it => it.charge.chargeId === sentenceRemand.charge.chargeId)
  }

  public returnToAdjustments(): string {
    return `${config.services.adjustmentServices.url}/${this.prisonerNumber}`
  }

  public intersectingSentenceTable() {
    return {
      head: [
        {
          text: 'Sentence',
        },
        {
          text: 'From',
        },
        {
          text: 'To',
        },
      ],
      rows: this.relevantRemand.intersectingSentences.map(it => {
        return [
          {
            html: `${it.charge.offence.description}<br />
            <span class="govuk-hint">Date of offence: 
                ${
                  it.charge.offenceDate &&
                  it.charge.offenceEndDate &&
                  it.charge.offenceEndDate !== it.charge.offenceDate
                    ? `${dayjs(it.charge.offenceDate).format('D MMM YYYY')} to ${dayjs(it.charge.offenceEndDate).format(
                        'D MMM YYYY',
                      )}`
                    : `${dayjs(it.charge.offenceDate).format('D MMM YYYY')}`
                }
            </span>`,
          },
          {
            text:
              (it.from === it.sentence.sentenceDate ? 'Sentenced on ' : 'Recalled on ') +
              dayjs(it.from).format('D MMM YYYY'),
          },
          {
            text:
              (it.from === it.sentence.sentenceDate ? 'Release on ' : 'Post recall release on ') +
              dayjs(it.to).format('D MMM YYYY'),
          },
        ]
      }),
    }
  }

  public mostImportantErrors(): LegacyDataProblem[] {
    return this.relevantRemand.issuesWithLegacyData.filter(it => {
      return this.isImportantError(it)
    })
  }

  private isImportantError(problem: LegacyDataProblem): boolean {
    return (
      problem.type !== 'UNSUPPORTED_OUTCOME' &&
      (this.activeSentenceStatues.indexOf(problem.offence.statute) !== -1 ||
        this.activeSentenceCourtCases.indexOf(problem.courtCaseRef) !== -1)
    )
  }

  public otherErrors(): LegacyDataProblem[] {
    return this.relevantRemand.issuesWithLegacyData.filter(it => {
      return !this.isImportantError(it)
    })
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
