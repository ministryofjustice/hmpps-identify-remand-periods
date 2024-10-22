import AdjustmentsClient from '../api/adjustmentsClient'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import { HmppsAuthClient } from '../data'

export default class AdjustmentsService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  public async findByPerson(person: string, username: string): Promise<Adjustment[]> {
    return new AdjustmentsClient(await this.getSystemClientToken(username)).findByPerson(person, null)
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
