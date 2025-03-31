import { Request } from 'express'
import {
  IdentifyRemandDecision,
  RemandApplicableUserSelection,
  RemandResult,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
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

  public storeRejectedRemandDecision(req: Request, nomsId: string, decision: IdentifyRemandDecision): void {
    this.initialiseSession(req, nomsId)
    req.session.rejectedRemandDecision[nomsId] = decision
  }

  public getRejectedRemandDecision(req: Request, nomsId: string): IdentifyRemandDecision {
    this.initialiseSession(req, nomsId)
    return req.session.rejectedRemandDecision[nomsId]
  }

  public clearRejectedRemandDecision(req: Request, nomsId: string): void {
    this.initialiseSession(req, nomsId)
    req.session.rejectedRemandDecision[nomsId] = undefined
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
    if (!req.session.rejectedRemandDecision) {
      req.session.rejectedRemandDecision = {}
    }
    if (!req.session.rejectedRemandDecision[nomsId]) {
      req.session.rejectedRemandDecision[nomsId] = undefined
    }
  }
}
