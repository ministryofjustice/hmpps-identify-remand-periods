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
    service.cachedDataService,
    service.adjustmentsService,
    service.calculateReleaseDatesService,
  )
  const prisonerImageRoutes = new PrisonerImageRoutes(service.prisonerService)
  get('/:nomsId/image', prisonerImageRoutes.getImage)

  get('/', (req, res, next) => {
    res.render('pages/index')
  })

  get('/prisoner/:nomsId', remandRoutes.entry)

  get('/prisoner/:nomsId/validation-errors', remandRoutes.validationErrors)

  get('/prisoner/:nomsId/replaced-offence-intercept', remandRoutes.replacedOffenceIntercept)
  get('/prisoner/:nomsId/replaced-offence/:edit?', remandRoutes.selectApplicable)
  post('/prisoner/:nomsId/replaced-offence/:edit?', remandRoutes.submitApplicable)

  get('/prisoner/:nomsId/remand', remandRoutes.remand)
  post('/prisoner/:nomsId/remand', remandRoutes.remandSubmit)

  get('/prisoner/:nomsId/overview', remandRoutes.overview)

  get('/prisoner/:nomsId/confirm-and-save', remandRoutes.confirmAndSave)
  post('/prisoner/:nomsId/confirm-and-save', remandRoutes.submitConfirmAndSave)

  get('/bulk', remandRoutes.bulkRemand)
  post('/bulk', remandRoutes.submitBulkRemand)

  return router
}
