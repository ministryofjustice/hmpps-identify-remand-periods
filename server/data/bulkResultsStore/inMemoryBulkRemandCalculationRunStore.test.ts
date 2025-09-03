import InMemoryBulkRemandCalculationRunStore from './inMemoryBulkRemandCalculationRunStore'
import BulkRemandCalculationRunStore from './bulkRemandCalculationRunStore'

describe('inMemoryBulkResultsStore', () => {
  let bulkResultsStore: BulkRemandCalculationRunStore

  beforeEach(() => {
    bulkResultsStore = new InMemoryBulkRemandCalculationRunStore()
  })

  it('Can store and retrieve token', async () => {
    await bulkResultsStore.setRun('run-1', { id: '1', status: 'RUNNING', results: null }, 10)
    expect(await bulkResultsStore.getRun('run-1')).toStrictEqual({ id: '1', status: 'RUNNING', results: null })
  })

  it('Expires token', async () => {
    await bulkResultsStore.setRun('run-2', { id: '2', status: 'DONE', results: [] }, -1)
    expect(await bulkResultsStore.getRun('run-2')).toBe(null)
  })
})
