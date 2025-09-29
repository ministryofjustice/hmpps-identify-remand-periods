import { RedisClient } from '../redisClient'
import RedisBulkRemandCalculationRunStore from './redisBulkRemandCalculationRunStore'
import BulkRemandCalculationRun from '../../model/BulkRemandCalculationRun'

const redisClient = {
  get: jest.fn(),
  set: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
  isOpen: true,
} as unknown as jest.Mocked<RedisClient>

describe('tokenStore', () => {
  let resultsStore: RedisBulkRemandCalculationRunStore

  beforeEach(() => {
    resultsStore = new RedisBulkRemandCalculationRunStore(redisClient as unknown as RedisClient)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('get token', () => {
    it('Can retrieve token', async () => {
      const run: BulkRemandCalculationRun = { id: '1', status: 'RUNNING', results: null }
      redisClient.get.mockResolvedValue(JSON.stringify(run))

      await expect(resultsStore.getRun('run-1')).resolves.toStrictEqual(run)

      expect(redisClient.get).toHaveBeenCalledWith('bulkRun:run-1')
    })

    it('Connects when no connection calling getToken', async () => {
      ;(redisClient as unknown as Record<string, boolean>).isOpen = false
      const run: BulkRemandCalculationRun = { id: '1', status: 'RUNNING', results: null }
      redisClient.get.mockResolvedValue(JSON.stringify(run))

      await resultsStore.getRun('run-1')

      expect(redisClient.connect).toHaveBeenCalledWith()
    })
  })

  describe('set token', () => {
    it('Can set token', async () => {
      const run: BulkRemandCalculationRun = { id: '1', status: 'RUNNING', results: null }
      await resultsStore.setRun('run-1', run, 10)

      expect(redisClient.set).toHaveBeenCalledWith('bulkRun:run-1', JSON.stringify(run), { EX: 10 })
    })

    it('Connects when no connection calling set token', async () => {
      ;(redisClient as unknown as Record<string, boolean>).isOpen = false

      await resultsStore.setRun('run-1', { id: '1', status: 'RUNNING', results: null }, 10)

      expect(redisClient.connect).toHaveBeenCalledWith()
    })
  })
})
