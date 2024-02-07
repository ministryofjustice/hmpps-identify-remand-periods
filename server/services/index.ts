import { dataAccess } from '../data'
import AdjustmentsService from './adjustmentsService'
import BulkRemandCalculationService from './bulkRemandCalculationService'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerService from './prisonerService'
import UserService from './userService'

export const services = () => {
  const { hmppsAuthClient, applicationInfo, manageUsersApiClient } = dataAccess()

  const prisonerService = new PrisonerService(hmppsAuthClient)
  const userService = new UserService(manageUsersApiClient, prisonerService)
  const identifyRemandPeriodsService = new IdentifyRemandPeriodsService()
  const bulkRemandCalculationService = new BulkRemandCalculationService(prisonerService, identifyRemandPeriodsService)
  const adjustmentsService = new AdjustmentsService()
  return {
    applicationInfo,
    userService,
    prisonerService,
    identifyRemandPeriodsService,
    bulkRemandCalculationService,
    adjustmentsService,
  }
}

export type Services = ReturnType<typeof services>

export { UserService }
