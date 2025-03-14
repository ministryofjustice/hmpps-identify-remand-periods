import { Readable } from 'stream'
import type HmppsAuthClient from '../data/hmppsAuthClient'
import PrisonApiClient from '../api/prisonApiClient'
import {
  PrisonApiBookingAndSentenceAdjustments,
  PrisonApiCourtDateResult,
  PrisonApiImprisonmentStatusHistoryDto,
  PrisonApiOffenderSentenceAndOffences,
  PrisonApiUserCaseloads,
} from '../@types/prisonApi/prisonClientTypes'

export default class PrisonerService {
  constructor(private readonly hmppsAuthClient: HmppsAuthClient) {}

  async getPrisonerImage(username: string, prisonerNumber: string): Promise<Readable> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getPrisonerImage(prisonerNumber)
  }

  async getUsersCaseloads(token: string): Promise<PrisonApiUserCaseloads[]> {
    return new PrisonApiClient(token).getUsersCaseloads()
  }

  public async getCourtDateResults(nomsId: string, username: string): Promise<PrisonApiCourtDateResult[]> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getCourtDateResults(nomsId)
  }

  async getBookingAndSentenceAdjustments(
    bookingId: string,
    username: string,
  ): Promise<PrisonApiBookingAndSentenceAdjustments> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getBookingAndSentenceAdjustments(bookingId)
  }

  async getSentencesAndOffences(bookingId: string, username: string): Promise<PrisonApiOffenderSentenceAndOffences[]> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getSentencesAndOffences(bookingId)
  }

  async getImprisonmentStatuses(nomsId: string, username: string): Promise<PrisonApiImprisonmentStatusHistoryDto[]> {
    return new PrisonApiClient(await this.getSystemClientToken(username)).getImprisonmentStatuses(nomsId)
  }

  private async getSystemClientToken(username: string): Promise<string> {
    return this.hmppsAuthClient.getSystemClientToken(username)
  }
}
