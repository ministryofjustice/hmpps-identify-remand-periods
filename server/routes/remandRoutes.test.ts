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
    prisonerService.getSentencesAndOffences.mockResolvedValue([
      {
        offences: [
          {
            offenceStatute: 'WR91',
          },
        ],
        caseReference: 'CASE1234',
        sentenceStatus: 'A',
      },
    ])
    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue(remandResult)
    return request(app)
      .get(`/${NOMS_ID}`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContainInOrder([
          'There is information missing in NOMIS that could impact the remand time.',
          'This is an important message',
          'This is also important message',
          'To ensure the remand time is calculated correctly, add the missing information in NOMIS, then ',
          'There are errors with nomis data that may be unrelated to the given relevant remand',
          'This is not an important message',
        ])
        expect(res.text).toContainInOrder([
          'Previous sentences that may overlap remand periods',
          'Sentenced on 17 Aug 2022',
          'Release on 16 Nov 2022',
          'Recalled on 18 May 2023',
          'Post recall release on 4 Oct 2023',
        ])
        expect(res.text).toContain('Applicable')
        expect(res.text).toContain('Not applicable')
        expect(res.text).toContain('Shared')
        expect(res.text).not.toContain('Confirm the identified remand is correct')
      })
  })
})
