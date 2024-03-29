import { type RequestHandler, Router } from 'express'

import asyncMiddleware from '../middleware/asyncMiddleware'
import type { Services } from '../services'
import RemandRoutes from './remandRoutes'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function routes(service: Services): Router {
  const router = Router()
  const get = (path: string | string[], handler: RequestHandler) => router.get(path, asyncMiddleware(handler))
  const post = (path: string, handler: RequestHandler) => router.post(path, asyncMiddleware(handler))

  const remandRoutes = new RemandRoutes(
    service.prisonerService,
    service.identifyRemandPeriodsService,
    service.bulkRemandCalculationService,
  )

  get('/', (req, res, next) => {
    res.render('pages/index')
  })

  get('/bulk', remandRoutes.bulkRemand)
  post('/bulk', remandRoutes.submitBulkRemand)
  get('/:nomsId', remandRoutes.remand)
  post('/:nomsId', remandRoutes.remandSubmit)

  return router
}
