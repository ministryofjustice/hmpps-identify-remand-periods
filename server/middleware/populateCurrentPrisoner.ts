import { RequestHandler } from 'express'
import FullPageError from '../model/FullPageError'
import logger from '../../logger'
import PrisonerSearchService from '../services/prisonerSearchService'

export default function populateCurrentPrisoner(prisonerSearchService: PrisonerSearchService): RequestHandler {
  return async (req, res, next) => {
    const { username, caseloads } = res.locals.user
    const { nomsId } = req.params

    if (username && nomsId) {
      try {
        const prisoner = await prisonerSearchService.getPrisonerDetails(nomsId, caseloads, username)
        res.locals.prisoner = prisoner
        if (!caseloads.includes(prisoner.prisonId)) {
          throw FullPageError.notInCaseLoadError()
        }
      } catch (error) {
        logger.error(error, `Failed to get prisoner with prisoner number: ${nomsId}`)
        return next(error)
      }
    }

    return next()
  }
}
