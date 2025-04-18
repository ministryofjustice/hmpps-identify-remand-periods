import express, { Express } from 'express'
import cookieSession from 'cookie-session'
import { NotFound } from 'http-errors'

import routes from '../index'
import nunjucksSetup from '../../utils/nunjucksSetup'
import errorHandler from '../../errorHandler'
import * as auth from '../../authentication/auth'
import type { Services } from '../../services'
import type { ApplicationInfo } from '../../applicationInfo'
import { PrisonerSearchApiPrisoner } from '../../@types/prisonerSearchApi/prisonerSearchTypes'

const testAppInfo: ApplicationInfo = {
  applicationName: 'test',
  buildNumber: '1',
  gitRef: 'long ref',
  gitShortHash: 'short ref',
  branchName: 'main',
}

export const user: Express.User = {
  name: 'FIRST LAST',
  userId: 'id',
  token: 'token',
  username: 'user1',
  displayName: 'First Last',
  active: true,
  activeCaseLoadId: 'MDI',
  authSource: 'NOMIS',
}

const defaultPrisoner: PrisonerSearchApiPrisoner = {
  prisonerNumber: 'ABC123',
  firstName: 'Anon',
  lastName: 'Nobody',
  dateOfBirth: '24/06/2000',
  bookingId: '1204935',
  prisonId: 'LDS',
  imprisonmentStatusDescription: 'Life imprisonment',
} as PrisonerSearchApiPrisoner

export const flashProvider = jest.fn()

function appSetup(
  services: Services,
  production: boolean,
  userSupplier: () => Express.User,
  prisoner: PrisonerSearchApiPrisoner,
): Express {
  const app = express()

  app.set('view engine', 'njk')

  nunjucksSetup(app, testAppInfo)
  app.use(cookieSession({ keys: [''] }))
  app.use((req, res, next) => {
    req.user = userSupplier()
    req.flash = flashProvider
    res.locals = {
      user: { ...req.user },
      prisoner,
    }
    next()
  })
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(routes(services))
  app.use((req, res, next) => next(new NotFound()))
  app.use(errorHandler(production))

  return app
}

export function appWithAllRoutes({
  production = false,
  services = {},
  userSupplier = () => user,
  prisoner = defaultPrisoner,
}: {
  production?: boolean
  services?: Partial<Services>
  userSupplier?: () => Express.User
  prisoner?: PrisonerSearchApiPrisoner
}): Express {
  auth.default.authenticationMiddleware = () => (req, res, next) => next()
  return appSetup(services as Services, production, userSupplier, prisoner)
}
