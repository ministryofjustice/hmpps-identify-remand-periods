import nock from 'nock'
import HmppsAuthClient from '../data/hmppsAuthClient'
import config from '../config'
import PrisonerSearchService from './prisonerSearchService'
import { PrisonerSearchApiPrisoner } from '../@types/prisonerSearchApi/prisonerSearchTypes'
import FullPageErrorType from '../model/FullPageErrorType'
import { UserDetails } from './userService'

jest.mock('../data/hmppsAuthClient')

const prisonerDetails = {
  prisonerNumber: 'A1234AB',
  firstName: 'Anon',
  lastName: 'Nobody',
  prisonId: 'MDI',
} as PrisonerSearchApiPrisoner

const username = 'some-user'

describe('Prisoner search service related tests', () => {
  let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
  let prisonerSearchService: PrisonerSearchService
  let fakeApi: nock.Scope
  beforeEach(() => {
    config.apis.prisonerSearchApi.url = 'http://localhost:8110'
    fakeApi = nock(config.apis.prisonerSearchApi.url)
    hmppsAuthClient = new HmppsAuthClient(null) as jest.Mocked<HmppsAuthClient>
    hmppsAuthClient.getSystemClientToken.mockResolvedValue('token')
    prisonerSearchService = new PrisonerSearchService(hmppsAuthClient)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('Test getting prisoner details', async () => {
    fakeApi.get(`/prisoner/A1234AB`).reply(200, prisonerDetails)

    const result = await prisonerSearchService.getPrisonerDetails('A1234AB', {
      username,
      caseloads: ['MDI'],
      roles: [],
    } as UserDetails)

    expect(result).toEqual(prisonerDetails)
  })
  it('Test getting prisoner details OUT without inactive booking role', async () => {
    fakeApi.get(`/prisoner/A1234AB`).reply(200, { ...prisonerDetails, prisonId: 'OUT' })

    try {
      await prisonerSearchService.getPrisonerDetails('A1234AB', {
        username,
        caseloads: ['MDI'],
        roles: [],
      } as UserDetails)
    } catch (error) {
      expect(error.errorKey).toBe(FullPageErrorType.NOT_IN_CASELOAD)
      expect(error.status).toBe(404)
    }
  })

  it('Test getting prisoner details OUT with inactive booking role', async () => {
    fakeApi.get(`/prisoner/A1234AB`).reply(200, { ...prisonerDetails, prisonId: 'OUT' })

    const result = await prisonerSearchService.getPrisonerDetails('A1234AB', {
      username,
      caseloads: ['MDI'],
      roles: ['INACTIVE_BOOKINGS'],
    } as UserDetails)

    expect(result).toEqual({ ...prisonerDetails, prisonId: 'OUT' })
  })

  it('Test getting prisoner details when caseload is different', async () => {
    fakeApi.get(`/prisoner/A1234AB`).reply(200, { ...prisonerDetails, agencyId: 'LEX' })

    try {
      await prisonerSearchService.getPrisonerDetails('A1234AB', {
        username,
        caseloads: ['MDI'],
        roles: [],
      } as UserDetails)
    } catch (error) {
      expect(error.errorKey).toBe(FullPageErrorType.NOT_IN_CASELOAD)
      expect(error.status).toBe(404)
    }
  })
})
