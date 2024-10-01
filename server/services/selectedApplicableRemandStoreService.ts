import { Request } from 'express'
import { RemandApplicableUserSelection } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { sameMembers } from '../utils/utils'

export default class SelectedApplicableRemandStoreService {
  public storeSelection(req: Request, nomsId: string, selection: RemandApplicableUserSelection): void {
    this.initialiseSession(req, nomsId)
    req.session.selectedApplicableRemand[nomsId].push(selection)
  }

  public removeSelection(req: Request, nomsId: string, chargeIds: number[]): void {
    this.initialiseSession(req, nomsId)
    req.session.selectedApplicableRemand[nomsId] = req.session.selectedApplicableRemand[nomsId].filter(
      (it: RemandApplicableUserSelection) => !sameMembers(it.chargeIdsToMakeApplicable, chargeIds),
    )
  }

  public getSelections(req: Request, nomsId: string): RemandApplicableUserSelection[] {
    this.initialiseSession(req, nomsId)
    return req.session.selectedApplicableRemand[nomsId]
  }

  private initialiseSession(req: Request, nomsId: string) {
    if (!req.session.selectedApplicableRemand) {
      req.session.selectedApplicableRemand = {}
    }
    if (!req.session.selectedApplicableRemand[nomsId]) {
      req.session.selectedApplicableRemand[nomsId] = []
    }
  }
}
