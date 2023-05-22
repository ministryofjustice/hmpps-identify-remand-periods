import AdjustmentsClient from '../api/adjustmentsClient'
import { AdjustmentDetails, CreateResponse } from '../@types/adjustments/adjustmentsTypes'

export default class AdjustmentsService {
  public async create(adjustment: AdjustmentDetails, token: string): Promise<CreateResponse> {
    return new AdjustmentsClient(token).create(adjustment)
  }
}
