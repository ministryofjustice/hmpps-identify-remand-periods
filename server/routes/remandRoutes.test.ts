import type { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes } from './testutils/appSetup'
import PrisonerService from '../services/prisonerService'
import IdentifyRemandPeriodsService from '../services/identifyRemandPeriodsService'
import './testutils/toContainInOrder'
import remandResult from './testutils/testData'
import SelectedApplicableRemandStoreService from '../services/selectedApplicableRemandStoreService'
import AdjustmentsService from '../services/adjustmentsService'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'

let app: Express

jest.mock('../services/prisonerService')
jest.mock('../services/identifyRemandPeriodsService')
jest.mock('../services/selectedApplicableRemandStoreService')
jest.mock('../services/adjustmentsService')

const adjustmentsService = new AdjustmentsService(null) as jest.Mocked<AdjustmentsService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const identifyRemandPeriodsService = new IdentifyRemandPeriodsService(null) as jest.Mocked<IdentifyRemandPeriodsService>
const selectedApplicableRemandStoreService =
  new SelectedApplicableRemandStoreService() as jest.Mocked<SelectedApplicableRemandStoreService>

const NOMS_ID = 'ABC123'

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      prisonerService,
      identifyRemandPeriodsService,
      selectedApplicableRemandStoreService,
      adjustmentsService,
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('GET /prisoner/{prisonerId}', () => {
  it('should render the results page', () => {
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
    adjustmentsService.findByPerson.mockResolvedValue([
      {
        days: 10,
      } as Adjustment,
    ])
    return request(app)
      .get(`/prisoner/${NOMS_ID}`)
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
          'Escape from lawful custody within booking 46201A',
          'Recalled on 18 May 2023',
          'Post recall release on 4 Oct 2023',
          'Escape from lawful custody within booking 46201X',
          'Recalled on 18 May 2023',
          'Post recall release on 1 Oct 2023',
        ])
        expect(res.text).toContain('APPLICABLE')
        expect(res.text).toContain('CASE_NOT_CONCLUDED')
        expect(res.text).toContain('This remand has been incorrectly marked as non-relevant.')
        expect(res.text).toContain('SHARED')
        expect(res.text).toContain('The number of remand days recorded has changed')
        expect(res.text).not.toContain('Confirm the identified remand is correct')
      })
  })
})
