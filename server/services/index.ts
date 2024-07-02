import { dataAccess } from '../data'
import BulkRemandCalculationService from './bulkRemandCalculationService'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'
import UserService from './userService'

export const services = () => {
  const { hmppsAuthClient, applicationInfo, manageUsersApiClient } = dataAccess()

  const prisonerService = new PrisonerService(hmppsAuthClient)
  const userService = new UserService(manageUsersApiClient, prisonerService)
  const prisonerSearchService = new PrisonerSearchService(hmppsAuthClient)
  const identifyRemandPeriodsService = new IdentifyRemandPeriodsService(hmppsAuthClient)
  const bulkRemandCalculationService = new BulkRemandCalculationService(
    prisonerSearchService,
    prisonerService,
    identifyRemandPeriodsService,
  )
  return {
    applicationInfo,
    userService,
    prisonerService,
    identifyRemandPeriodsService,
    bulkRemandCalculationService,
    prisonerSearchService,
  }
}

export type Services = ReturnType<typeof services>

export { UserService }
