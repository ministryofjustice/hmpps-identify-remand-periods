/* eslint-disable no-param-reassign */
import path from 'path'
import nunjucks from 'nunjucks'
import express from 'express'
import dayjs from 'dayjs'
import {
  personDateOfBirth,
  personProfileName,
  personStatus,
} from '@ministryofjustice/hmpps-court-cases-release-dates-design/hmpps/utils/utils'
import { initialiseName } from './utils'
import { ApplicationInfo } from '../applicationInfo'
import config from '../config'

const production = process.env.NODE_ENV === 'production'

export default function nunjucksSetup(app: express.Express, applicationInfo: ApplicationInfo): void {
  app.set('view engine', 'njk')

  app.locals.asset_path = '/assets/'
  app.locals.applicationName = 'Identify Remand Periods'
  app.locals.environmentName = config.environmentName
  app.locals.environmentNameColour = config.environmentName === 'PRE-PRODUCTION' ? 'govuk-tag--green' : ''
  app.locals.appInsightsConnectionString = config.analytics.appInsightsConnectionString
  app.locals.appInsightsApplicationName = applicationInfo.applicationName
  app.locals.buildNumber = config.buildNumber

  if (config.environmentName === 'LOCAL') {
    app.locals.environment = 'local'
  } else if (config.environmentName === 'DEV') {
    app.locals.environment = 'dev'
  } else if (config.environmentName === 'PRE-PRODUCTION') {
    app.locals.environment = 'pre'
  } else {
    app.locals.environment = 'prod'
  }

  // Cachebusting version string
  if (production) {
    // Version only changes with new commits
    app.locals.version = applicationInfo.gitShortHash
  } else {
    // Version changes every request
    app.use((req, res, next) => {
      res.locals.version = Date.now().toString()
      return next()
    })
  }

  const njkEnv = nunjucks.configure(
    [
      path.join(__dirname, '../../server/views'),
      'node_modules/govuk-frontend/dist/',
      'node_modules/@ministryofjustice/frontend/',
      'node_modules/@ministryofjustice/hmpps-court-cases-release-dates-design/',
    ],
    {
      autoescape: true,
      express: app,
    },
  )

  njkEnv.addGlobal('digitalPrisonServicesUrl', config.services.digitalPrisonServices.url)
  njkEnv.addGlobal('adjustmentsServiceUrl', config.services.adjustmentServices.url)

  njkEnv.addFilter('initialiseName', initialiseName)

  njkEnv.addFilter('date', (date, format) => dayjs(date).format(format))

  njkEnv.addFilter('personProfileName', personProfileName)
  njkEnv.addFilter('personDateOfBirth', personDateOfBirth)
  njkEnv.addFilter('personStatus', personStatus)
}
