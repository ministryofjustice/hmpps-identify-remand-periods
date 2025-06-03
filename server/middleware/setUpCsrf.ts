import { Router, RequestHandler, Request, Response, NextFunction } from 'express'
// eslint-disable-next-line import/no-extraneous-dependencies
import cookieParser from 'cookie-parser'
import Csrf from 'csrf'

const tokens = new Csrf()
const testMode = process.env.NODE_ENV === 'test'

export default function setUpCsrf(): Router {
  const router = Router({ mergeParams: true })

  // Ensure cookie-parser is used
  router.use(cookieParser())

  if (!testMode) {
    const csrfMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
      const isHtmlRequest = req.headers.accept?.includes('text/html')

      if (isHtmlRequest) {
        if (req.method === 'GET') {
          const secret = tokens.secretSync()
          const token = tokens.create(secret)
          res.cookie('csrf-secret', secret, { httpOnly: true, sameSite: 'strict' })
          res.locals.csrfToken = token
          next()
          return
        }

        // eslint-disable-next-line no-underscore-dangle
        const token = req.body._csrf || req.headers['x-csrf-token']
        const secret = req.cookies['csrf-secret']

        if (!secret || !token || !tokens.verify(secret, token)) {
          res.status(403).send('Invalid CSRF token')
          return
        }
      }

      next()
    }

    router.use(csrfMiddleware)
  }

  return router
}
