import { LegacyDataProblem } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import DetailedRemandCalculation from './DetailedRemandCalculation'
import { PrisonApiOffenderSentenceAndOffences } from '../@types/prisonApi/prisonClientTypes'

export default class DetailedRemandCalculationAndSentence {
  public activeSentenceCourtCases: string[]

  public activeSentenceStatues: string[]

  constructor(
    public detailedRemandCalculation: DetailedRemandCalculation,
    sentencesAndOffences: PrisonApiOffenderSentenceAndOffences[],
  ) {
    this.activeSentenceStatues = sentencesAndOffences.flatMap(it => it.offences.map(off => off.offenceStatute))
    this.activeSentenceCourtCases = sentencesAndOffences.filter(it => !!it.caseReference).map(it => it.caseReference)
  }

  public mostImportantErrors(): LegacyDataProblem[] {
    return this.detailedRemandCalculation.remandCalculation.issuesWithLegacyData.filter(it => {
      return this.isImportantError(it, this.activeSentenceCourtCases, this.activeSentenceStatues)
    })
  }

  public otherErrors(): LegacyDataProblem[] {
    return this.detailedRemandCalculation.remandCalculation.issuesWithLegacyData.filter(it => {
      return !this.isImportantError(it, this.activeSentenceCourtCases, this.activeSentenceStatues)
    })
  }

  private isImportantError(
    problem: LegacyDataProblem,
    activeSentenceCourtCases: string[],
    activeSentenceStatues: string[],
  ): boolean {
    if (['UNSUPPORTED_OUTCOME', 'MISSING_COURT_OUTCOME'].includes(problem.type)) {
      return false
    }
    if (
      [
        'MISSING_RECALL_EVENT',
        'MISSING_COURT_EVENT_FOR_IMPRISONMENT_STATUS_REMAND',
        'MISSING_COURT_EVENT_FOR_IMPRISONMENT_STATUS_RECALL',
        'MISSING_COURT_EVENT_FOR_IMPRISONMENT_STATUS_SENTENCING',
      ].includes(problem.type)
    ) {
      return true
    }
    return (
      activeSentenceStatues.includes(problem.offence.statute) || activeSentenceCourtCases.includes(problem.courtCaseRef)
    )
  }
}
