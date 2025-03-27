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

describe('Remand entrypoint /prisoner/{prisonerId}', () => {
  it('should redirect to error page', () => {
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
      .get(`/prisoner/${NOMS_ID}`)
      .expect(302)
      .expect('Location', `/prisoner/${NOMS_ID}/validation-errors`)
  })
  it('should redirect to replace offence', () => {
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
    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue({
      ...remandResult,
      issuesWithLegacyData: [],
    })

    return request(app)
      .get(`/prisoner/${NOMS_ID}`)
      .expect(302)
      .expect('Location', `/prisoner/${NOMS_ID}/replaced-offence-intercept`)
  })
  it('should redirect to tool if already accepted previously', () => {
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
    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue({
      ...remandResult,
      issuesWithLegacyData: [],
    })
    identifyRemandPeriodsService.getRemandDecision.mockResolvedValue({
      accepted: true,
      options: {
        includeRemandCalculation: false,
        userSelections: [{ chargeIdsToMakeApplicable: [3933924], targetChargeId: 2222 }],
      },
    })

    return request(app).get(`/prisoner/${NOMS_ID}`).expect(302).expect('Location', `/prisoner/${NOMS_ID}/remand`)
  })
  it('should redirect to straight to results if no replace choices', () => {
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
    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue({
      ...remandResult,
      chargeRemand: remandResult.chargeRemand.filter(
        it => it.status !== 'CASE_NOT_CONCLUDED' && it.status !== 'NOT_SENTENCED',
      ),
      issuesWithLegacyData: [],
    })

    return request(app).get(`/prisoner/${NOMS_ID}`).expect(302).expect('Location', `/prisoner/${NOMS_ID}/remand`)
  })
})
describe('Remand results page /prisoner/{prisonerId}/remand', () => {
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
        adjustmentType: 'REMAND',
      } as Adjustment,
    ])
    return request(app)
      .get(`/prisoner/${NOMS_ID}/remand`)
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
        // Remand card test
        expect(res.text).toContainInOrder([
          'Court name',
          'Birmingham Crown Court',
          'Case number',
          'CASE1234',
          'Offence outcome',
          'Imprisonment',
          'Remand',
          '11 days',
          'Period',
          '10 Jan 2023 to 20 Jan 2023',
        ])
        expect(res.text).toContainInOrder([
          'Previous sentences that may overlap remand periods',
          'Sentenced on 17 Aug 2022',
          '16 Jan 2023',
          'Burglary dwelling and theft  - no violence',
          '18 Jun 2022',
          'Recalled on 18 May 2023',
          '4 Oct 2023',
          'Escape from lawful custody within booking 46201A',
          '18 Jun 2021',
          'Recalled on 18 May 2023',
          '1 Oct 2023',
          'Escape from lawful custody within booking 46201X',
          '18 Jun 2021',
        ])
        expect(res.text).toContain('Applicable')
        expect(res.text).toContain('Case Not Concluded')
        expect(res.text).toContain('Shared')
        expect(res.text).toContain('The number of remand days recorded has changed')
        expect(res.text).not.toContain('Confirm the identified remand is correct')
      })
  })

  it('Should submit reject', () => {
    identifyRemandPeriodsService.saveRemandDecision.mockResolvedValue({ days: 10 } as IdentifyRemandDecision)
    return request(app)
      .post(`/prisoner/${NOMS_ID}/remand`)
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
      .post(`/prisoner/${NOMS_ID}/remand`)
      .send({
        decision: 'yes',
      })
      .type('form')
      .expect(302)
      .expect('Location', '/prisoner/ABC123/overview')
  })
})
describe('Validation error page /prisoner/{prisonerId}/validation-errors', () => {
  it('Should display error page', () => {
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
    selectedApplicableRemandStoreService.getCalculation.mockReturnValue(remandResult)
    return request(app)
      .get(`/prisoner/${NOMS_ID}/validation-errors`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContainInOrder([
          'There is information missing in NOMIS that could impact the remand time.',
          'This is an important message',
          'This is also important message',
          'To ensure the remand time is calculated correctly, add the missing information in NOMIS, then ',
        ])
      })
  })
})

describe('Remand replaced offences /prisoner/{prisonerId}', () => {
  it('Should display intercept', () => {
    selectedApplicableRemandStoreService.getCalculation.mockReturnValue(remandResult)
    return request(app)
      .get(`/prisoner/${NOMS_ID}/replaced-offence-intercept`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain(
          'Before you can continue to this service, you need to check if any offences without a sentence have been replaced.',
        )
        expect(res.text).toContain('/prisoner/ABC123/replaced-offence?chargeIds=3933924')
      })
  })
  it('Should show choices for select applicable', () => {
    selectedApplicableRemandStoreService.getCalculation.mockReturnValue(remandResult)
    selectedApplicableRemandStoreService.getSelections.mockReturnValue([])
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
      .get(`/prisoner/${NOMS_ID}/replaced-offence?chargeIds=3933924`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContainInOrder([
          'Offence 1 of 1',
          'Has this offence been replaced?',
          'No, this offence has not been replaced',
          'Yes, this offence was replaced with <strong>Abstract water without a licence</strong> committed on 10 Jan 2022',
        ])
      })
  })
  it('Should show choices for editting select applicable', () => {
    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue(remandResult)
    selectedApplicableRemandStoreService.getSelections.mockReturnValue([
      { chargeIdsToMakeApplicable: [3933924], targetChargeId: 2222 },
    ])
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
      .get(`/prisoner/${NOMS_ID}/replaced-offence/edit?chargeIds=3933924`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).not.toContain('Offence 1 of 1')
        expect(res.text).toContain('type="radio" value="2222" checked>')
        expect(res.text).toContain('<a href="/prisoner/ABC123/remand" class="govuk-back-link">Back</a>')
        expect(res.text).toContainInOrder([
          'Has this offence been replaced?',
          'No, this offence has not been replaced',
          'Yes, this offence was replaced with <strong>Abstract water without a licence</strong> committed on 10 Jan 2022',
        ])
      })
  })

  it('Should submit choices for select applicable', () => {
    selectedApplicableRemandStoreService.getCalculation.mockReturnValue(remandResult)
    return request(app)
      .post(`/prisoner/${NOMS_ID}/replaced-offence?chargeIds=3933924`)
      .send({
        selection: 2222,
      })
      .type('form')
      .expect(302)
      .expect('Location', '/prisoner/ABC123/remand')
      .expect(res => {
        expect(selectedApplicableRemandStoreService.storeSelection.mock.calls).toHaveLength(1)
        expect(selectedApplicableRemandStoreService.storeSelection.mock.calls[0][2]).toStrictEqual({
          chargeIdsToMakeApplicable: [3933924],
          targetChargeId: 2222,
        } as RemandApplicableUserSelection)
      })
  })
})

describe('Overview page', () => {
  it('Overview page contains the correct information', () => {
    identifyRemandPeriodsService.calculateRelevantRemand.mockResolvedValue(remandResult)
    prisonerService.getSentencesAndOffences.mockResolvedValue([
      {
        offences: [
          {
            offenceDescription: 'Doing bad things',
            offenceStartDate: '2022-04-27',
            offenderChargeId: 3933870,
          },
        ],
        caseReference: 'CASE1234',
        sentenceStatus: 'A',
      },
    ])
    return request(app)
      .get(`/prisoner/${NOMS_ID}/overview`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('10 January 2023')
        expect(res.text).toContain('20 January 2023')
        expect(res.text).toContain('11')
        expect(res.text).toContain('Doing bad things')
        expect(res.text).toContain('27 April 2022')
        expect(res.text).toContain('Total days')
        expect(res.text).toContain('<strong>11 days</strong>')
        expect(res.text).toContain('Committed on <span class="govuk-!-white-space-nowrap">27 April 2022</span>')
      })
  })
})

describe('Confirm and save /prisoner/{prisonerId}/confirm-and-save', () => {
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
        expect(res.text).toContain('http://localhost:3000/adj/ABC123/')
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
