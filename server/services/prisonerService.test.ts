import nock from 'nock'
import HmppsAuthClient from '../data/hmppsAuthClient'
import config from '../config'
import PrisonerService from './prisonerService'
import { PrisonApiPrisoner } from '../@types/prisonApi/prisonClientTypes'
import FullPageErrorType from '../model/FullPageErrorType'

jest.mock('../data/hmppsAuthClient')

const prisonerDetails = {
  offenderNo: 'A1234AA',
  firstName: 'Anon',
  lastName: 'Nobody',
  latestLocationId: 'LEI',
  locationDescription: 'Inside - Leeds HMP',
  dateOfBirth: '24/06/2000',
  age: 21,
  activeFlag: true,
  legalStatus: 'REMAND',
  category: 'Cat C',
  imprisonmentStatus: 'LIFE',
  imprisonmentStatusDescription: 'Serving Life Imprisonment',
  religion: 'Christian',
  agencyId: 'MDI',
} as PrisonApiPrisoner

const token = 'token'

describe('Prisoner service related tests', () => {
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let prisonerService: PrisonerService
  let fakeApi: nock.Scope
  beforeEach(() => {
    config.apis.prisonApi.url = 'http://localhost:8100'
    fakeApi = nock(config.apis.prisonApi.url)
    hmppsAuthClient = new HmppsAuthClient(null) as jest.Mocked<HmppsAuthClient>
    prisonerService = new PrisonerService(hmppsAuthClient)
  })
  afterEach(() => {
    nock.cleanAll()
  })

  describe('prisonerService', () => {
    describe('getPrisonerDetail', () => {
      it('Test getting prisoner details', async () => {
        fakeApi.get(`/api/offenders/A1234AB`).reply(200, prisonerDetails)

        const result = await prisonerService.getPrisonerDetail('A1234AB', ['MDI'], token)

        expect(result).toEqual(prisonerDetails)
      })

      it('Test getting prisoner details when caseload is different', async () => {
        fakeApi.get(`/api/offenders/A1234AB`).reply(200, { ...prisonerDetails, agencyId: 'LEX' })

        try {
          await prisonerService.getPrisonerDetail('A1234AB', ['MDI'], token)
        } catch (error) {
          expect(error.errorKey).toBe(FullPageErrorType.NOT_IN_CASELOAD)
          expect(error.status).toBe(404)
        }
      })
    })
  })
})
