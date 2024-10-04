import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonerSearchApiClient from '../api/prisonerSearchApiClient'
import { HmppsAuthClient } from '../data'
import FullPageError from '../model/FullPageError'
import { UserDetails } from './userService'

export default class PrisonerSearchService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonerDetails(nomsId: string, user: UserDetails): Promise<PrisonerSearchApiPrisoner> {
    try {
      const prisonerDetails = await new PrisonerSearchApiClient(
        await this.getSystemClientToken(user.username),
      ).getPrisonerDetails(nomsId)
      if (this.getCaseloadsForUser(user).includes(prisonerDetails.prisonId)) {
        return prisonerDetails
      }
      throw FullPageError.notInCaseLoadError()
    } catch (error) {
      if (error?.status === 404) {
        throw FullPageError.notInCaseLoadError()
      } else {
        throw error
      }
    }
  }

  private getCaseloadsForUser(user: UserDetails): string[] {
    const caseloads = [...user.caseloads]
    caseloads.push('TRN')
    if (user.roles.includes('INACTIVE_BOOKINGS')) {
      caseloads.push('OUT')
    }
    return caseloads
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
