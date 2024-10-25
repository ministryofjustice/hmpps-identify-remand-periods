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
import {
  IdentifyRemandDecision,
  RemandApplicableUserSelection,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import CalculateReleaseDatesService from '../services/calculateReleaseDatesService'

let app: Express

jest.mock('../services/adjustmentsService')
jest.mock('../services/prisonerService')
jest.mock('../services/identifyRemandPeriodsService')
jest.mock('../services/selectedApplicableRemandStoreService')
jest.mock('../services/calculateReleaseDatesService')

const adjustmentsService = new AdjustmentsService(null) as jest.Mocked<AdjustmentsService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const identifyRemandPeriodsService = new IdentifyRemandPeriodsService(null) as jest.Mocked<IdentifyRemandPeriodsService>
const selectedApplicableRemandStoreService =
  new SelectedApplicableRemandStoreService() as jest.Mocked<SelectedApplicableRemandStoreService>
const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>

const NOMS_ID = 'ABC123'

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      prisonerService,
      identifyRemandPeriodsService,
      selectedApplicableRemandStoreService,
      adjustmentsService,
      calculateReleaseDatesService,
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

  it('Should submit reject', () => {
    identifyRemandPeriodsService.saveRemandDecision.mockResolvedValue({ days: 10 } as IdentifyRemandDecision)
    return request(app)
      .post(`/prisoner/${NOMS_ID}`)
      .send({
        decision: 'no',
        comment: 'Wrong',
      })
      .type('form')
      .expect(302)
      .expect(
        'Location',
        'http://localhost:3000/adj/ABC123/success?message=%7B%22type%22:%22REMAND%22,%22days%22:10,%22action%22:%22REJECTED%22%7D',
      )
  })

  it('Should submit accept', () => {
    identifyRemandPeriodsService.saveRemandDecision.mockResolvedValue({ days: 10 } as IdentifyRemandDecision)
    return request(app)
      .post(`/prisoner/${NOMS_ID}`)
      .send({
        decision: 'yes',
      })
      .type('form')
      .expect(302)
      .expect('Location', '/prisoner/ABC123/confirm-and-save')
  })

  it('Should show choices for select applicable', () => {
    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue(remandResult)
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
    return request(app)
      .get(`/prisoner/${NOMS_ID}/select-applicable?chargeIds=3933924`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContainInOrder([
          'Accidentally allow a chimney to be on fire</strong> committed on 1 Feb 2023',
          'Select any charge this remand applies to',
          'type="radio"',
          'Abstract water without a licence',
        ])
      })
  })

  it('Should submit choices for select applicable', () => {
    return request(app)
      .post(`/prisoner/${NOMS_ID}/select-applicable?chargeIds=3933924`)
      .send({
        selection: 2222,
      })
      .type('form')
      .expect(302)
      .expect('Location', '/prisoner/ABC123')
      .expect(res => {
        expect(selectedApplicableRemandStoreService.storeSelection.mock.calls).toHaveLength(1)
        expect(selectedApplicableRemandStoreService.storeSelection.mock.calls[0][2]).toStrictEqual({
          chargeIdsToMakeApplicable: [3933924],
          targetChargeId: 2222,
        } as RemandApplicableUserSelection)
      })
  })
  it('Should show confirm and save page', () => {
    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue(remandResult)
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
    adjustmentsService.findByPerson.mockResolvedValue([])
    calculateReleaseDatesService.unusedDeductionsHandlingCRDError.mockResolvedValue({
      unusedDeductions: 10,
      validationMessages: [],
    })
    return request(app)
      .get(`/prisoner/${NOMS_ID}/confirm-and-save`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContainInOrder([
          'When you save this remand, the unused deductions will automatically be recorded. Check that the unused remand alert has been added.',
          '10 Jan 2023 to 20 Jan 2023',
          '11',
          'Total days',
          '11',
        ])
      })
  })
  it('Should submit confirm and save page', () => {
    identifyRemandPeriodsService.saveRemandDecision.mockResolvedValue({ days: 10 } as IdentifyRemandDecision)
    return request(app)
      .post(`/prisoner/${NOMS_ID}/confirm-and-save`)
      .expect(302)
      .expect(
        'Location',
        'http://localhost:3000/adj/ABC123/success?message=%7B%22type%22:%22REMAND%22,%22days%22:10,%22action%22:%22CREATE%22%7D',
      )
  })
})
