import type { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes } from './testutils/appSetup'
import { PrisonApiPrisoner } from '../@types/prisonApi/prisonClientTypes'
import PrisonerService from '../services/prisonerService'
import IdentifyRemandPeriodsService from '../services/identifyRemandPeriodsService'
import './testutils/toContainInOrder'
import remandResult from './testutils/testData'

let app: Express

jest.mock('../services/prisonerService')
jest.mock('../services/identifyRemandPeriodsService')

const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const identifyRemandPeriodsService = new IdentifyRemandPeriodsService() as jest.Mocked<IdentifyRemandPeriodsService>

const NOMS_ID = 'ABC123'

const stubbedPrisonerData = {
  offenderNo: NOMS_ID,
  firstName: 'Anon',
  lastName: 'Nobody',
  dateOfBirth: '24/06/2000',
  bookingId: 12345,
} as PrisonApiPrisoner

beforeEach(() => {
  app = appWithAllRoutes({
    services: { prisonerService, identifyRemandPeriodsService },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /{prisonerId}', () => {
  it('should render the results page', () => {
    prisonerService.getPrisonerDetail.mockResolvedValue(stubbedPrisonerData)
    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue(remandResult)
    return request(app)
      .get(`/${NOMS_ID}`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContainInOrder([
          'These errors relate to offences that have relevant remand.',
          'This is an important message',
          'This is also important message',
          'There are more errors with nomis data that is unrelated to the given relevant remand',
          'This is not an important message',
        ])
        expect(res.text).toContainInOrder([
          'Previous sentences that may intersect remand periods',
          'Sentenced at 17 Aug 2022',
          'Release at 16 Nov 2022',
          'Recalled at 18 May 2023',
          'Post recall release at 4 Oct 2023',
        ])
      })
  })
})
