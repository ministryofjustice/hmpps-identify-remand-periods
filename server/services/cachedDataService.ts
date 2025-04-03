import { Request } from 'express'
import {
  IdentifyRemandDecision,
  RemandApplicableUserSelection,
  RemandResult,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { sameMembers } from '../utils/utils'
import IdentifyRemandPeriodsService from './identifyRemandPeriodsService'

export default class CachedDataService {
  constructor(private identifyRemandPeriodsService: IdentifyRemandPeriodsService) {}

  public async getCalculation(
    req: Request,
    nomsId: string,
    username: string,
    clear: boolean = false,
  ): Promise<RemandResult> {
    this.initialiseSession(req, nomsId)
    let calculation = req.session.storedCalculations[nomsId]
    if (!calculation) {
      calculation = await this.identifyRemandPeriodsService.calculateRelevantRemand(
        nomsId,
        {
          includeRemandCalculation: false,
          userSelections: this.getSelections(req, nomsId),
        },
        username,
      )
      req.session.storedCalculations[nomsId] = calculation
    }

    if (clear) {
      req.session.storedCalculations[nomsId] = undefined
      req.session.storedCalculationsWithoutSelection[nomsId] = undefined
    }
    return calculation
  }

  public async getCalculationWithoutSelections(
    req: Request,
    nomsId: string,
    username: string,
    clear: boolean = false,
  ): Promise<RemandResult> {
    this.initialiseSession(req, nomsId)
    let calculation = req.session.storedCalculationsWithoutSelection[nomsId]
    if (!calculation) {
      calculation = await this.identifyRemandPeriodsService.calculateRelevantRemand(
        nomsId,
        {
          includeRemandCalculation: false,
          userSelections: [],
        },
        username,
      )
      req.session.storedCalculationsWithoutSelection[nomsId] = calculation
    }

    if (clear) {
      req.session.storedCalculations[nomsId] = undefined
      req.session.storedCalculationsWithoutSelection[nomsId] = undefined
    }
    return calculation
  }

  public storeSelection(req: Request, nomsId: string, selection: RemandApplicableUserSelection): void {
    this.initialiseSession(req, nomsId)
    req.session.selectedApplicableRemand[nomsId].push(selection)
    req.session.storedCalculations[nomsId] = undefined
  }

  public removeSelection(req: Request, nomsId: string, chargeIds: number[]): void {
    this.initialiseSession(req, nomsId)
    req.session.selectedApplicableRemand[nomsId] = req.session.selectedApplicableRemand[nomsId].filter(
      (it: RemandApplicableUserSelection) => !sameMembers(it.chargeIdsToMakeApplicable, chargeIds),
    )
    req.session.storedCalculations[nomsId] = undefined
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
    if (!req.session.storedCalculations) {
      req.session.storedCalculations = {}
    }
    if (!req.session.storedCalculationsWithoutSelection) {
      req.session.storedCalculationsWithoutSelection = {}
    }
    if (!req.session.rejectedRemandDecision) {
      req.session.rejectedRemandDecision = {}
    }
    if (!req.session.rejectedRemandDecision[nomsId]) {
      req.session.rejectedRemandDecision[nomsId] = undefined
    }
  }
}
