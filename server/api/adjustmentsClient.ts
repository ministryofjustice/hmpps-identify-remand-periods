import config, { ApiConfig } from '../config'
import RestClient from '../data/restClient'
import { Adjustment, CreateResponse } from '../@types/adjustments/adjustmentsTypes'

export default class AdjustmentsClient {
  restClient: RestClient

  constructor(token: string) {
    this.restClient = new RestClient('Adjustments API', config.apis.adjustments as ApiConfig, token)
  }

  async create(adjustment: Adjustment): Promise<CreateResponse> {
    return this.restClient.post({ path: `/adjustments`, data: adjustment }) as Promise<CreateResponse>
  }
}
