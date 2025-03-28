import dayjs from 'dayjs'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'
import {
  IntersectingSentence,
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

export default class RelevantRemandModel extends RemandCardModel {
  public relevantChargeRemand: RemandAndCharge[]

  public notRelevantChargeRemand: RemandAndCharge[]

  private intersectingSentences: IntersectingSentence[]

  private detailedRemandAndSentence: DetailedRemandCalculationAndSentence

  public adjustments: (Adjustment & { daysBetween: number })[]

  constructor(
    public prisonerNumber: string,
    relevantRemand: RemandResult,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
    public selections: RemandApplicableUserSelection[],
    private existingAdjustments: Adjustment[],
  ) {
    super(prisonerNumber, relevantRemand, sentencesAndOffences)
    const chargeRemandAndCharges = this.relevantRemand.chargeRemand.map(it =>
      DetailedRemandCalculation.toRemandAndCharge(it, relevantRemand),
    )
    this.relevantChargeRemand = chargeRemandAndCharges.filter(it => this.isRelevant(it))
    this.notRelevantChargeRemand = chargeRemandAndCharges.filter(it => !this.isRelevant(it))
    this.intersectingSentences = this.filterIntersectingSentences(this.relevantRemand.intersectingSentences)
    this.detailedRemandAndSentence = new DetailedRemandCalculationAndSentence(
      new DetailedRemandCalculation(relevantRemand),
      sentencesAndOffences,
    )
    this.adjustments = RelevantRemandModel.getAdjustments(relevantRemand)
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

  public intersectingSentenceTable() {
    return {
      head: [
        {
          text: 'From',
        },
        {
          text: 'To',
        },
        {
          text: 'Offence details',
        },
        {
          text: 'Committed on',
        },
      ],
      rows: this.intersectingSentences.map(it => {
        const charge = this.relevantRemand.charges[it.chargeId]
        return [
          {
            text:
              (it.from === it.sentence.sentenceDate ? 'Sentenced on ' : 'Recalled on ') +
              dayjs(it.from).format('D MMM YYYY'),
          },
          {
            text: dayjs(it.to).format('D MMM YYYY'),
          },
          {
            html: `${charge.offence.description}${this.bookNumberForIntersectingSentenceText(it)}`,
          },
          {
            text: this.offenceDateText(charge),
          },
        ]
      }),
    }
  }

  private bookNumberForIntersectingSentenceText(sentence: IntersectingSentence) {
    const numberOfSentencesWithSameFromDate = this.intersectingSentences.filter(it => it.from === sentence.from).length

    if (numberOfSentencesWithSameFromDate > 1) {
      const charge = this.relevantRemand.charges[sentence.chargeId]
      return ` within booking ${charge.bookNumber}`
    }
    return ''
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

  private filterIntersectingSentences(intersectingSentences: IntersectingSentence[]): IntersectingSentence[] {
    const filteredIntersectingSentences = this.filterHistoricIntersectingSentences(intersectingSentences)
    const groupedByFromAndBookNumber: Record<string, IntersectingSentence[]> = {}
    filteredIntersectingSentences.forEach(it => {
      const charge = this.relevantRemand.charges[it.chargeId]
      const fromAndBookNo = `${it.from}${charge.bookNumber}`
      if (!groupedByFromAndBookNumber[fromAndBookNo]) {
        groupedByFromAndBookNumber[fromAndBookNo] = []
      }
      groupedByFromAndBookNumber[fromAndBookNo].push(it)
    })

    const results: IntersectingSentence[] = []
    Object.values(groupedByFromAndBookNumber).forEach(sentences => {
      if (sentences.length > 1) {
        results.push(sentences.sort((a, b) => (new Date(a.to) > new Date(b.to) ? -1 : 1))[0])
      } else {
        results.push(sentences[0])
      }
    })
    return results
  }

  private filterHistoricIntersectingSentences(intersectingSentences: IntersectingSentence[]): IntersectingSentence[] {
    const chargeRemand = [
      ...this.relevantChargeRemand,
      ...this.notRelevantChargeRemand.filter(it => it.status === 'INTERSECTED_BY_SENTENCE'),
    ]
    if (chargeRemand.length) {
      let earliestApplicableChargeRemand = new Date()
      chargeRemand
        .map(it => new Date(it.from))
        .forEach(it => {
          if (it < earliestApplicableChargeRemand) {
            earliestApplicableChargeRemand = it
          }
        })
      return intersectingSentences.filter(it => new Date(it.to) > earliestApplicableChargeRemand)
    }
    return intersectingSentences
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
}
