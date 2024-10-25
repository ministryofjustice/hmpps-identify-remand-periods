import { dataAccess } from '../data'
import AdjustmentsService from './adjustmentsService'
import BulkRemandCalculationService from './bulkRemandCalculationService'
import CalculateReleaseDatesService from './calculateReleaseDatesService'
import FeComponentsService from './feComponentsService'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerSearchService from './prisonerSearchService'
import PrisonerService from './prisonerService'
import SelectedApplicableRemandStoreService from './selectedApplicableRemandStoreService'
import UserService from './userService'

export const services = () => {
  const { hmppsAuthClient, applicationInfo, manageUsersApiClient, feComponentsClient } = dataAccess()

  const prisonerService = new PrisonerService(hmppsAuthClient)
  const userService = new UserService(manageUsersApiClient, prisonerService)
  const prisonerSearchService = new PrisonerSearchService(hmppsAuthClient)
  const identifyRemandPeriodsService = new IdentifyRemandPeriodsService(hmppsAuthClient)
  const bulkRemandCalculationService = new BulkRemandCalculationService(
    prisonerSearchService,
    prisonerService,
    identifyRemandPeriodsService,
  )
  const selectedApplicableRemandStoreService = new SelectedApplicableRemandStoreService()
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
    selectedApplicableRemandStoreService,
    adjustmentsService,
    calculateReleaseDatesService,
  }
}

export type Services = ReturnType<typeof services>

export { UserService }
