import dayjs from 'dayjs'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
import {
  ChargeRemand,
  IntersectingSentence,
  LegacyDataProblem,
  RemandApplicableUserSelection,
  RemandResult,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import config from '../config'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import { daysBetween } from '../utils/utils'
import RemandCardModel, { RemandAndCharge } from './RemandCardModel'

export default class RelevantRemandModel extends RemandCardModel {
  public relevantChargeRemand: RemandAndCharge[]

  public notRelevantChargeRemand: RemandAndCharge[]

  public activeSentenceCourtCases: string[]

  public activeSentenceStatues: string[]

  constructor(
    public prisonerNumber: string,
    relevantRemand: RemandResult,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
    public includeInactive: boolean = false,
    public selections: RemandApplicableUserSelection[],
  ) {
    super(relevantRemand, sentencesAndOffences)
    const chargeRemandAndCharges = this.relevantRemand.chargeRemand
      .map(it => this.toRemandAndCharge(it))
      .filter(it => {
        if (includeInactive) {
          return true
        }
        return it.status !== 'INACTIVE'
      })

    this.relevantChargeRemand = chargeRemandAndCharges.filter(it => this.isRelevant(it))
    this.notRelevantChargeRemand = chargeRemandAndCharges.filter(it => !this.isRelevant(it))
    this.activeSentenceStatues = sentencesAndOffences
      .filter(it => it.sentenceStatus === 'A')
      .flatMap(it => it.offences.map(off => off.offenceStatute))
    this.activeSentenceCourtCases = sentencesAndOffences
      .filter(it => it.sentenceStatus === 'A' && !!it.caseReference)
      .map(it => it.caseReference)
  }

  public returnToAdjustments(): string {
    return `${config.services.adjustmentServices.url}/${this.prisonerNumber}`
  }

  public adjustments() {
    return this.filterAdjustments().map(it => {
      return { ...it, daysBetween: daysBetween(new Date(it.fromDate), new Date(it.toDate)) }
    })
  }

  private filterAdjustments() {
    if (this.includeInactive) {
      return this.relevantRemand.adjustments
    }
    return this.relevantRemand.adjustments.filter(it => it.status === 'ACTIVE')
  }

  public adjustmentCharges(adjustment: Adjustment) {
    return adjustment.remand.chargeId.map(it => this.relevantRemand.charges[it])
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
        const charge = this.relevantRemand.charges[it.chargeId]
        return [
          {
            html: `${charge.offence.description}${this.bookNumberForIntersectingSentenceText(it)}<br />
            <span class="govuk-hint">Date of offence: 
                ${this.offenceDateText(charge)}
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

  public selectionTable() {
    return {
      head: [
        {
          text: 'Charges',
        },
        {
          text: 'Applicable to',
        },
        {
          html: '<span class="govuk-visually-hidden">Remove this selection</span>',
        },
      ],
      rows: this.selections.map(it => {
        const charges = it.chargeIdsToMakeApplicable.map(charge => this.relevantRemand.charges[charge])
        const target = this.relevantRemand.charges[it.targetChargeId]
        return [
          {
            html: charges
              .map(
                charge => `<strong>${charge.offence.description}</strong> commited on ${this.offenceDateText(charge)}`,
              )
              .join('<br/>'),
          },
          {
            html: `<strong>${target.offence.description}</strong> commited on ${this.offenceDateText(target)}`,
          },
          {
            html: `<a href="/prisoner/${this.prisonerNumber}/select-applicable/remove?chargeIds=${it.chargeIdsToMakeApplicable.join(',')}">Remove</a>`,
          },
        ]
      }),
    }
  }

  private bookNumberForIntersectingSentenceText(sentence: IntersectingSentence) {
    const numberOfSentencesWithSameFromDate = this.relevantRemand.intersectingSentences.filter(
      it => it.from === sentence.from,
    ).length

    if (numberOfSentencesWithSameFromDate > 1) {
      const charge = this.relevantRemand.charges[sentence.chargeId]
      return ` within booking ${charge.bookNumber}`
    }
    return ''
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

  public hasInactivePeriod() {
    return this.relevantRemand.chargeRemand.some(it => it.status === 'INACTIVE')
  }

  public canBeMarkedAsApplicable(charge: ChargeRemand): boolean {
    return charge.status === 'CASE_NOT_CONCLUDED' || charge.status === 'NOT_SENTENCED'
  }

  public chargeIdsOfRemand(remand: RemandAndCharge): number[] {
    return remand.charges.map(it => it.chargeId)
  }
}
