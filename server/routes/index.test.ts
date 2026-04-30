import type { Express } from 'express'
import request from 'supertest'
import { appWithAllRoutes } from './testutils/appSetup'
import config from '../config'

let app: Express

beforeEach(() => {
  app = appWithAllRoutes({})
})

afterEach(() => {
  config.maintenanceMode = false
  jest.resetAllMocks()
})

describe('GET /', () => {
  it('should render index page', () => {
    return request(app)
      .get('/')
      .expect('Content-Type', /html/)
      .expect(res => {
        expect(res.text).toContain('This site is under construction...')
      })
  })

  it('should render maintenance page', () => {
    config.maintenanceMode = true
    return request(appWithAllRoutes({}))
      .get('/')
      .expect(503)
      .expect(res => {
        expect(res.text).toContain('Sorry, there is a problem with the service')
        expect(res.text).toContain('courtcasesandreleasedates@justice.gov.uk')
      })
  })
})
