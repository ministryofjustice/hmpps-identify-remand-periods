import { type RequestHandler, Router } from 'express'

import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import RemandRoutes from './remandRoutes'
import PrisonerImageRoutes from './prisonerImageRoutes'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function routes(service: Services): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))
  const post = (path: string, handler: RequestHandler) => router.post(path, asyncMiddleware(handler))

  const remandRoutes = new RemandRoutes(
    service.prisonerService,
    service.identifyRemandPeriodsService,
    service.bulkRemandCalculationService,
    service.selectedApplicableRemandStoreService,
    service.adjustmentsService,
    service.calculateReleaseDatesService,
  )
  const prisonerImageRoutes = new PrisonerImageRoutes(service.prisonerService)
  get('/:nomsId/image', prisonerImageRoutes.getImage)

  get('/', (req, res, next) => {
    res.render('pages/index')
  })

  get('/bulk', remandRoutes.bulkRemand)
  post('/bulk', remandRoutes.submitBulkRemand)
  get('/prisoner/:nomsId', remandRoutes.remand)
  post('/prisoner/:nomsId', remandRoutes.remandSubmit)
  get('/prisoner/:nomsId/select-applicable', remandRoutes.selectApplicable)
  post('/prisoner/:nomsId/select-applicable', remandRoutes.submitApplicable)
  get('/prisoner/:nomsId/select-applicable/remove', remandRoutes.removeSelection)
  get('/prisoner/:nomsId/confirm-and-save', remandRoutes.confirmAndSave)
  post('/prisoner/:nomsId/confirm-and-save', remandRoutes.submitConfirmAndSave)

  return router
}
