import { dataAccess } from '../data'
import AdjustmentsService from './adjustmentsService'
import BulkRemandCalculationService from './bulkRemandCalculationService'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'
import PrisonerService from './prisonerService'
import UserService from './userService'

export const services = () => {
  const { hmppsAuthClient, applicationInfo } = dataAccess()

  const userService = new UserService(hmppsAuthClient)
  const prisonerService = new PrisonerService(hmppsAuthClient)
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
