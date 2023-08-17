import dayjs from 'dayjs'
import { PrisonApiPrisoner } from '../@types/prisonApi/prisonClientTypes'
import { Remand, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import config from '../config'

export default class RelevantRemandModel {
  constructor(
    public prisonerDetail: PrisonApiPrisoner,
    public relevantRemand: RemandResult,
  ) {}

  public isNotRelevant(sentenceRemand: Remand): boolean {
    return !this.relevantRemand.sentenceRemand.find(it => it.charge.chargeId === sentenceRemand.charge.chargeId)
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

  public errorList() {
    return this.relevantRemand.issuesWithLegacyData.map(it => {
      return {
        text: it,
      }
    })
  }
}
