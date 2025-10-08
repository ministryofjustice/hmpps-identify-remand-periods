/* eslint-disable import/first */
/*
 * Do appinsights first as it does some magic instrumentation work, i.e. it affects other 'require's
 * In particular, applicationinsights automatically collects bunyan logs
 */
import { initialiseAppInsights, buildAppInsightsClient } from '../utils/azureAppInsights'
import applicationInfoSupplier from '../applicationInfo'

const applicationInfo = applicationInfoSupplier()
initialiseAppInsights()
buildAppInsightsClient(applicationInfo)

import HmppsAuthClient from './hmppsAuthClient'
import ManageUsersApiClient from './manageUsersApiClient'
import { createRedisClient } from './redisClient'
import RedisTokenStore from './tokenStore/redisTokenStore'
import InMemoryTokenStore from './tokenStore/inMemoryTokenStore'
import config from '../config'
import FeComponentsClient from './feComponentsClient'
import RedisBulkRemandCalculationRunStore from './bulkResultsStore/redisBulkRemandCalculationRunStore'
import InMemoryBulkRemandCalculationRunStore from './bulkResultsStore/inMemoryBulkRemandCalculationRunStore'

type RestClientBuilder<T> = (token: string) => T

export const dataAccess = () => {
  const redisClient = createRedisClient()
  return {
    applicationInfo,
    hmppsAuthClient: new HmppsAuthClient(
      config.redis.enabled ? new RedisTokenStore(redisClient) : new InMemoryTokenStore(),
    ),
    manageUsersApiClient: new ManageUsersApiClient(),
    feComponentsClient: new FeComponentsClient(),
    bulkRemandCalculationRunStore: config.redis.enabled
      ? new RedisBulkRemandCalculationRunStore(redisClient)
      : new InMemoryBulkRemandCalculationRunStore(),
  }
}

export type DataAccess = ReturnType<typeof dataAccess>

export { HmppsAuthClient, RestClientBuilder, ManageUsersApiClient }
