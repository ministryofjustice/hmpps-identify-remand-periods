import type { RedisClient } from '../redisClient'

import logger from '../../../logger'
import BulkRemandCalculationRunStore from './bulkRemandCalculationRunStore'
import BulkRemandCalculationRun from '../../model/BulkRemandCalculationRun'

export default class RedisBulkRemandCalculationRunStore implements BulkRemandCalculationRunStore {
  private readonly prefix = 'bulkRun:'

  constructor(private readonly client: RedisClient) {
    client.on('error', error => {
      logger.error(error, `Redis error`)
    })
  }

  private async ensureConnected() {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
  }

  public async setRun(id: string, results: BulkRemandCalculationRun, durationSeconds: number): Promise<void> {
    await this.ensureConnected()
    await this.client.set(`${this.prefix}${id}`, JSON.stringify(results), { EX: durationSeconds })
  }

  public async getRun(id: string): Promise<BulkRemandCalculationRun | null> {
    await this.ensureConnected()
    const result = await this.client.get(`${this.prefix}${id}`)
    if (!result) return null

    const json = Buffer.isBuffer(result) ? result.toString() : result
    return JSON.parse(json) as BulkRemandCalculationRun
  }
}
