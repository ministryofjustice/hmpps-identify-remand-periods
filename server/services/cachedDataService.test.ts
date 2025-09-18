import { Request } from 'express'
import CachedDataService from './cachedDataService'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import { RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'

jest.mock('./identifyRemandPeriodsService')

afterEach(() => {
  jest.resetAllMocks()
})

let service: CachedDataService
let mockIdentifyService: jest.Mocked<IdentifyRemandPeriodsService>
let mockRequest: Request

const nomsId = 'ABC123'
const username = 'testUser'

const rrWithInconclusiveCharges = {
  adjustments: [],
  chargeRemand: [{ chargeIds: [1] }, { chargeIds: [2] }],
  intersectingSentences: [],
  charges: {
    1: { isInconclusive: true },
    2: { isInconclusive: false },
  },
  issuesWithLegacyData: [],
  periodsOutOfPrison: [],
} as unknown as RemandResult

const rrWithNoInconclusiveCharges = {
  adjustments: [],
  chargeRemand: [
    { chargeIds: [1] }, // assuming minimal mock
    { chargeIds: [2] },
  ],
  intersectingSentences: [],
  charges: {
    1: { isInconclusive: false },
    2: { isInconclusive: false },
  },
  issuesWithLegacyData: [],
  periodsOutOfPrison: [],
} as unknown as RemandResult

const createMockReq = (): Request =>
  ({
    session: {
      selectedApplicableRemand: {},
      storedCalculations: {},
      storedCalculationsWithoutSelection: {},
      rejectedRemandDecision: {},
    },
  }) as unknown as Request

beforeEach(() => {
  mockIdentifyService = new IdentifyRemandPeriodsService(null) as jest.Mocked<IdentifyRemandPeriodsService>
  service = new CachedDataService(mockIdentifyService)
  mockRequest = createMockReq()
})

describe('CachedDataService - getCalculationWithOnlyInconclusiveChargeRemands', () => {
  it('returns only remands with inconclusive charges', async () => {
    mockIdentifyService.calculateRelevantRemand.mockResolvedValue(rrWithInconclusiveCharges)

    const result = await service.getCalculationWithoutSelections(mockRequest, nomsId, username)

    expect(result.chargeRemand).toEqual([{ chargeIds: [1] }])
  })

  it('returns empty array when no inconclusive charges', async () => {
    mockIdentifyService.calculateRelevantRemand.mockResolvedValue(rrWithNoInconclusiveCharges)

    const result = await service.getCalculationWithoutSelections(mockRequest, nomsId, username)

    expect(result.chargeRemand).toEqual([])
  })
})
