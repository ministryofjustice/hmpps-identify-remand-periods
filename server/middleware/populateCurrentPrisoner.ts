import { RequestHandler } from 'express'
import logger from '../../logger'
import PrisonerSearchService from '../services/prisonerSearchService'
import { UserDetails } from '../services/userService'

export default function populateCurrentPrisoner(prisonerSearchService: PrisonerSearchService): RequestHandler {
  return async (req, res, next) => {
    const user = res.locals.user as UserDetails
    const nomsId = Array.isArray(req.params.nomsId) ? req.params.nomsId[0] : req.params.nomsId

    if (user.username && nomsId) {
      try {
        const prisoner = await prisonerSearchService.getPrisonerDetails(nomsId, user)
        res.locals.prisoner = prisoner
      } catch (error) {
        logger.error(error, `Failed to get prisoner with prisoner number: ${nomsId}`)
        return next(error)
      }
    }

    return next()
  }
}
