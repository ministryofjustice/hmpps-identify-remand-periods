import type { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes, user } from './testutils/appSetup'
import PrisonerService from '../services/prisonerService'
import IdentifyRemandPeriodsService from '../services/identifyRemandPeriodsService'
import './testutils/toContainInOrder'
import { remandResult, conclusiveRemandResult, onePlusremandDaysRemandResult } from './testutils/testData'
import CachedDataService from '../services/cachedDataService'
import AdjustmentsService from '../services/adjustmentsService'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'
import {
  IdentifyRemandDecision,
  RemandApplicableUserSelection,
  RemandResult,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import CalculateReleaseDatesService from '../services/calculateReleaseDatesService'
import BulkRemandCalculationService from '../services/bulkRemandCalculationService'

let app: Express

jest.mock('../services/adjustmentsService')
jest.mock('../services/prisonerService')
jest.mock('../services/identifyRemandPeriodsService')
jest.mock('../services/cachedDataService')
jest.mock('../services/calculateReleaseDatesService')
jest.mock('../services/bulkRemandCalculationService')

const adjustmentsService = new AdjustmentsService(null) as jest.Mocked<AdjustmentsService>
const prisonerService = new PrisonerService(null) as jest.Mocked<PrisonerService>
const identifyRemandPeriodsService = new IdentifyRemandPeriodsService(null) as jest.Mocked<IdentifyRemandPeriodsService>
const cachedDataService = new CachedDataService(null) as jest.Mocked<CachedDataService>
const calculateReleaseDatesService = new CalculateReleaseDatesService(null) as jest.Mocked<CalculateReleaseDatesService>
const bulkRemandCalculationService = new BulkRemandCalculationService(
  null,
  null,
  null,
  null,
) as jest.Mocked<BulkRemandCalculationService>

const NOMS_ID = 'ABC123'

const emptyRemandResult = {
  adjustments: [],
  chargeRemand: [],
  intersectingSentences: [],
  charges: {},
  issuesWithLegacyData: [],
} as RemandResult

beforeEach(() => {
  app = appWithAllRoutes({
    services: {
      prisonerService,
      identifyRemandPeriodsService,
      cachedDataService,
      adjustmentsService,
      calculateReleaseDatesService,
      bulkRemandCalculationService,
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
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue(remandResult)

    return request(app)
      .get(`/prisoner/${NOMS_ID}`)
      .expect(302)
      .expect('Location', `/prisoner/${NOMS_ID}/validation-errors`)
  })
  it('should not trigger u/d if there is only conclusive charges and charge as is Not Sentenced', () => {
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
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue({
      ...conclusiveRemandResult,
      issuesWithLegacyData: [],
    })

    return request(app).get(`/prisoner/${NOMS_ID}`).expect(302).expect('Location', `/prisoner/${NOMS_ID}/remand`)
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
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue({
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
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue({
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
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue({
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
  it('should render the results page with remand', () => {
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
    cachedDataService.getCalculation.mockResolvedValue(remandResult)
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
          'Days on remand',
          '11 days',
          'Remand period',
          '10 Jan 2023 to 20 Jan 2023',
        ])
        expect(res.text).toContainInOrder([
          'Previous sentences that may overlap remand periods',
          'Sentenced on 17 Aug 2022',
          '16 Jan 2023',
          'Burglary dwelling and theft  - no violence',
          '18 Jun 2022',
          'Recalled on 17 Jan 2023',
          '18 Jan 2023',
          'Escape from lawful custody within booking 46201A',
          '18 Jun 2021',
          'Recalled on 17 Jan 2023',
          '18 Jan 2023',
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

  it('If a period out of prison is present it should be displayed', () => {
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
    cachedDataService.getCalculation.mockResolvedValue({
      ...remandResult,
      periodsOutOfPrison: [
        {
          from: '2023-04-20',
          to: '2023-05-20',
          days: 30,
        },
      ],
    })
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
        expect(res.text).toContain('Days deducted from the relevant remand periods')
        expect(res.text).toContain(
          'Time spent not in custody or spent serving an overlapping sentence are deducted from the relevant remand periods above.',
        )
        expect(res.text).toContainInOrder([
          '<h3 class="govuk-heading-s">Time spent not in custody</h3>',
          '20 Apr 2023',
          '20 May 2023',
          '30',
        ])
      })
  })

  it('The section is omitted if no intersecting sentences and no periods out of prison', () => {
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
    cachedDataService.getCalculation.mockResolvedValue({
      ...remandResult,
      intersectingSentences: [],
    })
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
        expect(res.text).not.toContain('Days deducted from the relevant remand periods')
        expect(res.text).not.toContain(
          'Time spent not in custody or spent serving an overlapping sentence are deducted from the relevant remand periods above.',
        )
        expect(res.text).not.toContain('Previous sentences that may overlap remand periods')
        expect(res.text).not.toContain('<h3 class="govuk-heading-s">Time spent not in custody</h3>')
      })
  })

  it('Zero day periods not in prison and periods where the from date is after the to date are not displayed', () => {
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
    cachedDataService.getCalculation.mockResolvedValue({
      ...remandResult,
      periodsOutOfPrison: [
        {
          from: '2023-04-20',
          to: '2023-04-20',
          days: 0,
        },
        {
          from: '2023-04-20',
          to: '2023-04-10',
          days: 30,
        },
      ],
    })
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
        expect(res.text).not.toContain('<h3 class="govuk-heading-s">Time spent not in custody</h3>')
      })
  })

  it('should render the results page with correct content for zero day remand identified', () => {
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
    cachedDataService.getCalculation.mockResolvedValue(emptyRemandResult)
    adjustmentsService.findByPerson.mockResolvedValue([
      {
        days: 0,
        adjustmentType: 'REMAND',
      } as Adjustment,
    ])
    return request(app)
      .get(`/prisoner/${NOMS_ID}/remand`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain(
          'Explain why there should be remand to be applied. This will help our support team improve the accuracy of the remand tool.',
        )
        expect(res.text).toContain('No remand to be applied')
      })
  })
  it('should render the results page with correct content for non zero day remand identified', () => {
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
    cachedDataService.getCalculation.mockResolvedValue(onePlusremandDaysRemandResult)
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
        expect(res.text).not.toContain('No remand to be applied')
        expect(res.text).toContain(
          'Explain why the remand to be applied is incorrect. This will help our support team improve the accuracy of the remand tool.',
        )
      })
  })

  it('should render the results page with zero remand identified', () => {
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
    cachedDataService.getCalculation.mockResolvedValue(emptyRemandResult)
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
        expect(res.text).not.toContain('Applicable')
        expect(res.text).toContain('The number of remand days recorded has changed')
        expect(res.text).toContain(
          'The remand tool calculates remand to be applied by identifying relevant remand periods',
        )
        expect(res.text).not.toContain('Confirm the identified remand is correct')
      })
  })
  it('Should redirect to the confirm and save page', () => {
    identifyRemandPeriodsService.saveRemandDecision.mockResolvedValue({ days: 10 } as IdentifyRemandDecision)
    return request(app)
      .post(`/prisoner/${NOMS_ID}/remand`)
      .send({
        decision: 'no',
        comment: 'Wrong',
      })
      .type('form')
      .expect(302)
      .expect('Location', '/prisoner/ABC123/confirm-and-save')
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
      .expect('Location', '/prisoner/ABC123/confirm-and-save')
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
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue(remandResult)
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
  it('Should display error page without cached result', () => {
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
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue(remandResult)
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
  it('Should display redirect with no errors', () => {
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
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue(emptyRemandResult)
    return request(app).get(`/prisoner/${NOMS_ID}/validation-errors`).expect(302).expect('Location', '/prisoner/ABC123')
  })
})

describe('Remand replaced offences /prisoner/{prisonerId}', () => {
  it('Should display intercept', () => {
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue(remandResult)
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
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue(remandResult)
    cachedDataService.getSelections.mockReturnValue([])
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
        expect(res.text).not.toContain('A sentence charge, way before the remand dates')
        expect(res.text).toContainInOrder([
          '23 Nov 2022 to 15 Dec 2022',
          '23 Nov 2021 to 15 Dec 2021',
          'Offence 1 of 1',
          'Is this remand period relevant?',
          'No, this remand period is not relevant',
          'value="4444"',
          'Yes, this offence was replaced with <strong>offence on another booking</strong> committed on 10 Jan 2022',
          'value="2222"',
          'Yes, this offence was replaced with <strong>Abstract water without a licence</strong> committed on 10 Jan 2022',
        ])
      })
  })
  it('Should show choices for editing select applicable', () => {
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue(remandResult)
    cachedDataService.getSelections.mockReturnValue([{ chargeIdsToMakeApplicable: [3933924], targetChargeId: 2222 }])
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
          'Is this remand period relevant?',
          'No, this remand period is not relevant',
          'Yes, this offence was replaced with <strong>Abstract water without a licence</strong> committed on 10 Jan 2022',
        ])
      })
  })

  it('Should submit choices for select applicable', () => {
    cachedDataService.getCalculationWithoutSelections.mockResolvedValue(remandResult)
    return request(app)
      .post(`/prisoner/${NOMS_ID}/replaced-offence?chargeIds=3933924`)
      .send({
        selection: 2222,
      })
      .type('form')
      .expect(302)
      .expect('Location', '/prisoner/ABC123/remand')
      .expect(res => {
        expect(cachedDataService.storeSelection.mock.calls).toHaveLength(1)
        expect(cachedDataService.storeSelection.mock.calls[0][2]).toStrictEqual({
          chargeIdsToMakeApplicable: [3933924],
          targetChargeId: 2222,
        } as RemandApplicableUserSelection)
      })
  })
})

describe('Overview page', () => {
  it('Overview page contains the correct information', () => {
    cachedDataService.getCalculation.mockResolvedValue(remandResult)
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
  it('Should show confirm and save page with remand', () => {
    cachedDataService.getCalculation.mockResolvedValue(remandResult)
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
        expect(res.text).toContain('<a href="/prisoner/ABC123/remand" class="govuk-back-link">Back</a>')
        expect(res.text).toContain('http://localhost:3000/adj/ABC123/')
      })
  })

  it('Should show confirm and save page with remand that is being rejected', () => {
    cachedDataService.getCalculation.mockResolvedValue(remandResult)
    cachedDataService.getRejectedRemandDecision.mockReturnValue({
      accepted: false,
      rejectComment: 'Rejected',
    } as IdentifyRemandDecision)
    return request(app)
      .get(`/prisoner/${NOMS_ID}/confirm-and-save`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('<a href="/prisoner/ABC123/remand" class="govuk-back-link">Back</a>')
        expect(res.text).toContain('http://localhost:3000/adj/ABC123/')
        expect(res.text).toContain('The remand tool suggested the below remand')
        expect(res.text).toContain('The reason for rejection was: <strong>Rejected</strong>')
        expect(calculateReleaseDatesService.unusedDeductionsHandlingCRDError.mock.calls.length).toBe(0)
      })
  })

  it('Should show confirm and save page with no remand and an accepted decision', () => {
    cachedDataService.getCalculation.mockResolvedValue(emptyRemandResult)
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
      unusedDeductions: 0,
      validationMessages: [],
    })
    return request(app)
      .get(`/prisoner/${NOMS_ID}/confirm-and-save`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('No remand to be applied')
        expect(res.text).toContain('The remand tool has calculated that there is no remand to be applied.')
        expect(res.text).toContain('<a href="/prisoner/ABC123/remand" class="govuk-back-link">Back</a>')
      })
  })

  it('Should show confirm and save page with no remand that has been rejected', () => {
    cachedDataService.getCalculation.mockResolvedValue(emptyRemandResult)
    cachedDataService.getRejectedRemandDecision.mockReturnValue({
      accepted: false,
      rejectComment: 'Rejected',
    } as IdentifyRemandDecision)
    return request(app)
      .get(`/prisoner/${NOMS_ID}/confirm-and-save`)
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain(
          `You are rejecting the remand tool's calculation that there is no remand to be applied.`,
        )
        expect(res.text).toContain('The reason for rejection was: <strong>Rejected</strong>')
        expect(res.text).toContain('<a href="/prisoner/ABC123/remand" class="govuk-back-link">Back</a>')
        expect(calculateReleaseDatesService.unusedDeductionsHandlingCRDError.mock.calls.length).toBe(0)
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
  it('Should submit confirm and save page and display the rejected message', () => {
    identifyRemandPeriodsService.saveRemandDecision.mockResolvedValue({ days: 10 } as IdentifyRemandDecision)
    cachedDataService.getRejectedRemandDecision.mockReturnValue({
      accepted: false,
      rejectComment: 'Rejected',
    } as IdentifyRemandDecision)
    return request(app)
      .post(`/prisoner/${NOMS_ID}/confirm-and-save`)
      .expect(302)
      .expect(
        'Location',
        'http://localhost:3000/adj/ABC123/success?message=%7B%22type%22:%22REMAND%22,%22days%22:10,%22action%22:%22REJECTED%22%7D',
      )
  })
})

describe('bulk comparison', () => {
  it('should start a bulk comparison run for a specific list of prisoners', () => {
    bulkRemandCalculationService.startRun.mockResolvedValue('999')
    return request(app)
      .post(`/bulk`)
      .send({ prisonerIds: 'A1234BC\nD5678EF' })
      .expect(302)
      .expect('Location', '/bulk-in-progress/999')
      .expect(_ => {
        expect(bulkRemandCalculationService.startRun).toHaveBeenCalledWith(user, ['A1234BC', 'D5678EF'], undefined)
      })
  })
  it('should start a bulk comparison run for a whole prison', () => {
    bulkRemandCalculationService.startRun.mockResolvedValue('999')
    return request(app)
      .post(`/bulk`)
      .send({ prisonId: 'KMI' })
      .expect(302)
      .expect('Location', '/bulk-in-progress/999')
      .expect(_ => {
        expect(bulkRemandCalculationService.startRun).toHaveBeenCalledWith(user, [], 'KMI')
      })
  })
  it('should render in progress if still running', () => {
    bulkRemandCalculationService.getRun.mockResolvedValue({ id: '999', status: 'RUNNING', results: null })
    return request(app)
      .get(`/bulk-in-progress/999`)
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Calculation in progress')
      })
  })
  it('should render complete if run is complete', () => {
    bulkRemandCalculationService.getRun.mockResolvedValue({ id: '999', status: 'DONE', results: [] })
    return request(app)
      .get(`/bulk-in-progress/999`)
      .expect(200)
      .expect(res => {
        expect(res.text).toContain('Calculation complete')
      })
  })
})
