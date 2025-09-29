import { dataAccess } from '../data'
import AdjustmentsService from './adjustmentsService'
import BulkRemandCalculationService from './bulkRemandCalculationService'
import CalculateReleaseDatesService from './calculateReleaseDatesService'
import FeComponentsService from './feComponentsService'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'
import CachedDataService from './cachedDataService'
import UserService from './userService'

export const services = () => {
  const { hmppsAuthClient, applicationInfo, manageUsersApiClient, feComponentsClient, bulkRemandCalculationRunStore } =
    dataAccess()

  const prisonerService = new PrisonerService(hmppsAuthClient)
  const userService = new UserService(manageUsersApiClient, prisonerService)
  const prisonerSearchService = new PrisonerSearchService(hmppsAuthClient)
  const identifyRemandPeriodsService = new IdentifyRemandPeriodsService(hmppsAuthClient)
  const bulkRemandCalculationService = new BulkRemandCalculationService(
    prisonerSearchService,
    prisonerService,
    identifyRemandPeriodsService,
    bulkRemandCalculationRunStore,
  )
  const cachedDataService = new CachedDataService(identifyRemandPeriodsService)
  const feComponentsService = new FeComponentsService(feComponentsClient)
  const adjustmentsService = new AdjustmentsService(hmppsAuthClient)
  const calculateReleaseDatesService = new CalculateReleaseDatesService(hmppsAuthClient)
  return {
    applicationInfo,
    userService,
    prisonerService,
    identifyRemandPeriodsService,
    bulkRemandCalculationService,
    prisonerSearchService,
    feComponentsService,
    cachedDataService,
    adjustmentsService,
    calculateReleaseDatesService,
  }
}

export type Services = ReturnType<typeof services>

export { UserService }
