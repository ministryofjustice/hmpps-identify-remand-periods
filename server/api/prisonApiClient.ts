import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import type {
  PrisonApiAdjustment,
  PrisonApiBookingAndSentenceAdjustments,
  PrisonApiCharge,
  PrisonApiCourtCase,
  PrisonApiCourtDateResult,
  PrisonApiPrisoner,
  PrisonApiSentence,
  PrisonApiUserCaseloads,
} from '../@types/prisonApi/prisonClientTypes'

export default class PrisonApiClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Prison API', config.apis.prisonApi as ApiConfig, token)
  }

  async getPrisonerDetail(nomsId: string): Promise<PrisonApiPrisoner> {
    return this.restClient.get({ path: `/api/offenders/${nomsId}` }) as Promise<PrisonApiPrisoner>
  }

  async getUsersCaseloads(): Promise<PrisonApiUserCaseloads[]> {
    return this.restClient.get({ path: `/api/users/me/caseLoads` }) as Promise<PrisonApiUserCaseloads[]>
  }

  async createCourtCase(bookingId: number, courtCase: PrisonApiCourtCase): Promise<number> {
    return this.restClient.post({
      path: `/api/digital-warrant/booking/${bookingId}/court-case`,
      data: courtCase,
    }) as Promise<number>
  }

  async createCharge(bookingId: number, charge: PrisonApiCharge): Promise<number> {
    return this.restClient.post({
      path: `/api/digital-warrant/booking/${bookingId}/charge`,
      data: charge,
    }) as Promise<number>
  }

  async createSentence(bookingId: number, sentence: PrisonApiSentence): Promise<number> {
    return this.restClient.post({
      path: `/api/digital-warrant/booking/${bookingId}/sentence`,
      data: sentence,
    }) as Promise<number>
  }

  async createAdjustment(bookingId: number, sentence: PrisonApiAdjustment): Promise<number> {
    return this.restClient.post({
      path: `/api/digital-warrant/booking/${bookingId}/adjustment`,
      data: sentence,
    }) as Promise<number>
  }

  async getCourtDateResults(nomsId: string): Promise<PrisonApiCourtDateResult[]> {
    return this.restClient.get({
      path: `/api/digital-warrant/court-date-results/${nomsId}`,
    }) as Promise<PrisonApiCourtDateResult[]>
  }

  async getBookingAndSentenceAdjustments(bookingId: number): Promise<PrisonApiBookingAndSentenceAdjustments> {
    return this.restClient.get({
      path: `/api/adjustments/${bookingId}/sentence-and-booking`,
    }) as Promise<PrisonApiBookingAndSentenceAdjustments>
  }
}
