import { Request, Response } from 'express'
import path from 'path'
import PrisonerService from '../services/prisonerService'

const placeHolderImage = path.join(process.cwd(), '/assets/images/prisoner-profile-image.png')

export default class PrisonerImageRoutes {
  constructor(private readonly prisonerService: PrisonerService) {}

  getImage = async (req: Request, res: Response): Promise<void> => {
    const { nomsId } = req.params

    return this.prisonerService
      .getPrisonerImage(res.locals.user.token, nomsId)
      .then(data => {
        res.set('Cache-control', 'private, max-age=86400')
        res.removeHeader('pragma')
        res.type('image/jpeg')
        data.pipe(res)
      })
      .catch(_error => {
        res.sendFile(placeHolderImage)
      })
  }
}
