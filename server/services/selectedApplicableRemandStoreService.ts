import { Request } from 'express'
import { RemandApplicableUserSelection, RemandResult } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { sameMembers } from '../utils/utils'

export default class SelectedApplicableRemandStoreService {
  public storeCalculation(req: Request, nomsId: string, calculation: RemandResult): void {
    this.initialiseSession(req, nomsId)
    req.session.storedResults[nomsId] = calculation
  }

  public getCalculation(req: Request, nomsId: string): RemandResult {
    this.initialiseSession(req, nomsId)
    return req.session.storedResults[nomsId]
  }

  public clearCalculation(req: Request, nomsId: string): void {
    this.initialiseSession(req, nomsId)
    req.session.storedResults[nomsId] = undefined
  }

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
    if (!req.session.storedResults) {
      req.session.storedResults = {}
    }
  }
}
