import { DataTelemetry, EnvelopeTelemetry } from 'applicationinsights/out/Declarations/Contracts'
import jwt from 'jsonwebtoken'
import { addCustomDataToRequests, ContextObject } from './azureAppInsights'

const user = {
  username: 'test-user',
}

const createEnvelope = (properties: Record<string, string | boolean>, baseType = 'RequestData') =>
  ({
    data: {
      baseType,
      baseData: { properties },
    } as DataTelemetry,
  }) as EnvelopeTelemetry

const createContext = (username: string) =>
  ({
    'http.ServerRequest': {
      res: {
        locals: {
          user: {
            username,
          },
        },
      },
    },
  }) as ContextObject

const context = createContext(user.username)

describe('azureAppInsights', () => {
  describe('addUserDataToRequests', () => {
    it('adds user data to properties when present', () => {
      const envelope = createEnvelope({ other: 'things' })

      addCustomDataToRequests(envelope, context)

      expect(envelope.data.baseData.properties).toStrictEqual({
        ...user,
        other: 'things',
      })
    })

    it('adds user_uuid from the auth token when present', () => {
      const envelope = createEnvelope({})
      const token = jwt.sign({ user_name: 'test-user', user_uuid: 'uuid-123' }, 'secret')

      addCustomDataToRequests(envelope, {
        'http.ServerRequest': { res: { locals: { user: { username: 'test-user', token } } } },
      } as ContextObject)

      expect(envelope.data.baseData.properties).toStrictEqual({ ...user, user_uuid: 'uuid-123' })
    })

    it('ignores an invalid token', () => {
      const envelope = createEnvelope({})

      addCustomDataToRequests(envelope, {
        'http.ServerRequest': { res: { locals: { user: { username: 'test-user', token: 'bad' } } } },
      } as ContextObject)

      expect(envelope.data.baseData.properties).toStrictEqual(user)
    })

    it('handles absent user data', () => {
      const envelope = createEnvelope({})

      addCustomDataToRequests(envelope, context)

      expect(envelope.data.baseData.properties).toStrictEqual({
        ...user,
      })
    })

    it('returns true when not RequestData type', () => {
      const envelope = createEnvelope({}, 'NOT_REQUEST_DATA')

      const response = addCustomDataToRequests(envelope, context)

      expect(response).toStrictEqual(true)
    })

    it('handles when no properties have been set', () => {
      const envelope = createEnvelope(undefined)

      addCustomDataToRequests(envelope, context)

      expect(envelope.data.baseData.properties).toStrictEqual(user)
    })

    it('handles missing user details', () => {
      const envelope = createEnvelope({ other: 'things' })

      addCustomDataToRequests(envelope, {
        'http.ServerRequest': {},
      } as ContextObject)

      expect(envelope.data.baseData.properties).toEqual({
        other: 'things',
      })
    })
  })
})
