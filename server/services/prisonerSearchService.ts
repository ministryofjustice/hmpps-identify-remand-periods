import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import PrisonerSearchApiClient from '../api/prisonerSearchApiClient'
import { HmppsAuthClient } from '../data'
import FullPageError from '../model/FullPageError'

export default class PrisonerSearchService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonerDetails(
    nomsId: string,
    userCaseloads: string[],
    username: string,
  ): Promise<PrisonerSearchApiPrisoner> {
    try {
      const prisonerDetails = await new PrisonerSearchApiClient(
        await this.getSystemClientToken(username),
      ).getPrisonerDetails(nomsId)
      if (userCaseloads.includes(prisonerDetails.prisonId)) {
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

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
