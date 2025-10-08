import BulkRemandCalculationRunStore from './bulkRemandCalculationRunStore'
import BulkRemandCalculationRun from '../../model/BulkRemandCalculationRun'

export default class InMemoryBulkRemandCalculationRunStore implements BulkRemandCalculationRunStore {
  map = new Map<string, { results: BulkRemandCalculationRun; expiry: Date }>()

  public async setRun(id: string, results: BulkRemandCalculationRun, durationSeconds: number): Promise<void> {
    this.map.set(id, { results, expiry: new Date(Date.now() + durationSeconds * 1000) })
    return Promise.resolve()
  }

  public async getRun(id: string): Promise<BulkRemandCalculationRun | null> {
    if (!this.map.has(id) || this.map.get(id).expiry.getTime() < Date.now()) {
      return Promise.resolve(null)
    }
    return Promise.resolve(this.map.get(id).results)
  }
}
