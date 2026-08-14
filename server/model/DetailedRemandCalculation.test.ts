import DetailedRemandCalculation from './DetailedRemandCalculation'
import {
  Charge,
  ChargeRemand,
  IntersectingSentence,
  LegacyDataProblem,
  RemandResult,
} from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import { Adjustment } from '../@types/adjustments/adjustmentsTypes'

describe('DetailedRemandCalculation', () => {
  describe('getReplaceableChargeRemandGroupedByChargeIds', () => {
    it('should return empty array if no remands', () => {
      const remandResult: RemandResult = {
        chargeRemand: [],
        charges: {},
        intersectingSentences: [],
        adjustments: [],
        issuesWithLegacyData: [],
        periodsOutOfPrison: [],
      }
      const model = new DetailedRemandCalculation(remandResult)
      expect(model.getReplaceableChargeRemandGroupedByChargeIds()).toEqual([])
    })

    it('should correctly group replaceable charge remands by charge IDs', () => {
      const charges: { [key: number]: Charge } = {
        1: {
          chargeId: 1,
          offenceDate: '2023-01-15',
          offenceEndDate: '2023-01-20',
          bookingId: 100,
          sentenceSequence: 1,
          sentenceDate: '2024-06-01',
          isInconclusive: true,
        } as Charge,
        2: {
          chargeId: 2,
          offenceDate: '2023-02-10',
          bookingId: 101,
          sentenceSequence: 2,
          sentenceDate: '2024-06-01',
          isInconclusive: true,
        } as Charge,
        3: {
          chargeId: 3,
          offenceDate: '2023-03-05',
          bookingId: 102,
          sentenceSequence: 3,
          sentenceDate: '2024-06-01',
          isInconclusive: true,
        } as Charge,
      }
      const remandResult: RemandResult = {
        charges,
        chargeRemand: [
          {
            from: '2023-01-10',
            to: '2023-02-01',
            chargeIds: [1],
            status: 'CASE_NOT_CONCLUDED',
            fromEvent: { date: '2023-01-10', description: 'Start' },
            toEvent: { date: '2023-02-01', description: 'End' },
            replacedCharges: [],
          },
          {
            from: '2023-02-05',
            to: '2023-03-01',
            chargeIds: [1],
            status: 'NOT_SENTENCED',
            fromEvent: { date: '2023-02-05', description: 'Start' },
            toEvent: { date: '2023-03-01', description: 'End' },
            replacedCharges: [],
          },
          {
            from: '2023-03-10',
            to: '2023-04-01',
            chargeIds: [2, 3],
            status: 'CASE_NOT_CONCLUDED',
            fromEvent: { date: '2023-03-10', description: 'Start' },
            toEvent: { date: '2023-04-01', description: 'End' },
            replacedCharges: [],
          },
          {
            from: '2023-04-05',
            to: '2023-05-01',
            chargeIds: [2, 3],
            status: 'NOT_SENTENCED',
            fromEvent: { date: '2023-04-05', description: 'Start' },
            toEvent: { date: '2023-05-01', description: 'End' },
            replacedCharges: [],
          },
          {
            from: '2023-06-01',
            to: '2023-07-01',
            chargeIds: [4],
            status: 'INACTIVE',
            fromEvent: { date: '2023-06-01', description: 'Start' },
            toEvent: { date: '2023-07-01', description: 'End' },
            replacedCharges: [],
          },
        ],
        intersectingSentences: [],
        adjustments: [],
        issuesWithLegacyData: [],
        periodsOutOfPrison: [],
      }

      const model = new DetailedRemandCalculation(remandResult)
      const result = model.getReplaceableChargeRemandGroupedByChargeIds()

      expect(result.length).toBe(2)
      expect(result[0].chargeIds).toEqual([1])
      expect(result[0].remand.length).toBe(2)
      expect(result[1].chargeIds).toEqual([2, 3])
      expect(result[1].remand.length).toBe(2)
    })

    it('should filter out remands that are not replaceable', () => {
      const charges: { [key: number]: Charge } = {
        1: {
          chargeId: 1,
          offenceDate: '2023-01-15',
          bookingId: 100,
          sentenceSequence: 1,
          sentenceDate: '2024-01-01',
          isInconclusive: false,
        } as Charge,
        2: {
          chargeId: 2,
          offenceDate: '2023-02-10',
          bookingId: 101,
          sentenceSequence: 2,
          sentenceDate: '2024-01-01',
          isInconclusive: true,
        } as Charge,
      }
      const remandResult: RemandResult = {
        charges,
        chargeRemand: [
          {
            from: '2023-01-10',
            to: '2023-02-01',
            chargeIds: [1],
            status: 'CASE_NOT_CONCLUDED',
            fromEvent: { date: '2023-01-10', description: 'Start' },
            toEvent: { date: '2023-02-01', description: 'End' },
            replacedCharges: [],
          },
          {
            from: '2023-02-05',
            to: '2023-03-01',
            chargeIds: [2],
            status: 'APPLICABLE',
            fromEvent: { date: '2023-02-05', description: 'Start' },
            toEvent: { date: '2023-03-01', description: 'End' },
            replacedCharges: [],
          },
        ],
        intersectingSentences: [],
        adjustments: [],
        issuesWithLegacyData: [],
        periodsOutOfPrison: [],
      }

      const model = new DetailedRemandCalculation(remandResult)
      const result = model.getReplaceableChargeRemandGroupedByChargeIds()

      expect(result.length).toBe(0)
    })

    it('should filter out remands where sentence date is before latest remand date', () => {
      const charges: { [key: number]: Charge } = {
        1: {
          chargeId: 1,
          offenceDate: '2023-01-15',
          offenceEndDate: '2023-01-20',
          bookingId: 100,
          sentenceSequence: 1,
          sentenceDate: '2023-01-01',
          isInconclusive: true,
        } as Charge,
      }
      const remandResult: RemandResult = {
        charges,
        chargeRemand: [
          {
            from: '2023-01-10',
            to: '2023-02-01',
            chargeIds: [1],
            status: 'CASE_NOT_CONCLUDED',
            fromEvent: { date: '2023-01-10', description: 'Start' },
            toEvent: { date: '2023-02-01', description: 'End' },
            replacedCharges: [],
          },
        ],
        intersectingSentences: [],
        adjustments: [],
        issuesWithLegacyData: [],
        periodsOutOfPrison: [],
      }

      const model = new DetailedRemandCalculation(remandResult)
      const result = model.getReplaceableChargeRemandGroupedByChargeIds()

      expect(result.length).toBe(0)
    })

    it('should group remands with the same charge IDs together', () => {
      const remandResult = {
        charges: {
          3333: {
            chargeId: 3333,
            offence: {
              code: 'TP47017',
              statute: 'TP47',
              description: 'A sentence charge, way before the remand dates',
            },
            offenceDate: '2023-02-01',
            bookingId: 1204935,
            bookNumber: '41938A',
            offenceEndDate: null,
            sentenceSequence: 88,
            sentenceDate: '2024-03-21',
            courtCaseRef: 'CASE5678',
            courtLocation: 'Birmingham Crown Court',
            resultDescription: 'Imprisonment',
            isInconclusive: true,
          } as Charge,
          3933924: {
            chargeId: 3933924,
            offence: { code: 'TP47017', statute: 'TP47', description: 'Accidentally allow a chimney to be on fire' },
            offenceDate: '2023-02-01',
            bookingId: 1204935,
            bookNumber: '41938A',
            offenceEndDate: null,
            sentenceSequence: 89,
            sentenceDate: '2024-03-21',
            courtCaseRef: 'CASE5678',
            courtLocation: 'Birmingham Crown Court',
            resultDescription: 'Imprisonment',
            isInconclusive: true,
          } as Charge,
          3933870: {
            chargeId: 3933870,
            offence: { code: 'WR91001', statute: 'WR91', description: 'Abstract water without a licence' },
            offenceDate: '2022-01-10',
            bookingId: 1204935,
            bookNumber: '41938A',
            offenceEndDate: null,
            sentenceSequence: 1,
            sentenceDate: '2024-03-21',
            courtCaseRef: 'CASE1234',
            courtLocation: 'Birmingham Crown Court',
            resultDescription: 'Imprisonment',
            isInconclusive: true,
          } as Charge,
          2222: {
            chargeId: 2222,
            offence: { code: 'WR91001', statute: 'WR91', description: 'Abstract water without a licence' },
            offenceDate: '2022-01-10',
            bookingId: 1204940,
            bookNumber: '41938A',
            offenceEndDate: null,
            sentenceSequence: 1,
            sentenceDate: '2024-03-21',
            courtCaseRef: 'CASE1234',
            courtLocation: 'Birmingham Crown Court',
            resultDescription: 'Imprisonment',
            isInconclusive: true,
          } as Charge,
          4444: {
            chargeId: 4444,
            offence: { code: 'WR91001', statute: 'WR91', description: 'offence on another booking' },
            offenceDate: '2022-01-10',
            bookingId: 1204936,
            bookNumber: '41938A',
            offenceEndDate: null,
            sentenceSequence: 1,
            sentenceDate: '2024-03-21',
            courtCaseRef: 'CASE1234',
            courtLocation: 'Birmingham Crown Court',
            resultDescription: 'Imprisonment',
            isInconclusive: true,
          } as Charge,
          3934217: {
            chargeId: 3934217,
            offence: { code: 'TH68036', statute: 'TH68', description: 'Burglary dwelling and theft  - no violence' },
            offenceDate: '2022-06-18',
            bookingId: 1209333,
            bookNumber: '46201A',
            offenceEndDate: null,
            sentenceSequence: 3,
            sentenceDate: '2022-08-17',
            courtCaseRef: null,
            courtLocation: 'Wood Green Crown Court',
            resultDescription: 'Imprisonment',
            isInconclusive: true,
          } as Charge,
          3934220: {
            chargeId: 3934220,
            offence: { code: 'COML016', statute: 'COML', description: 'Escape from lawful custody' },
            offenceDate: '2021-06-18',
            bookingId: 1209333,
            bookNumber: '46201A',
            offenceEndDate: null,
            sentenceSequence: 6,
            sentenceDate: '2022-08-17',
            courtCaseRef: null,
            courtLocation: 'Wood Green Crown Court',
            resultDescription: 'Recall to Prison',
            isInconclusive: true,
          } as Charge,
          3934221: {
            chargeId: 3934221,
            offence: { code: 'COML016', statute: 'COML', description: 'Escape from lawful custody' },
            offenceDate: '2021-06-18',
            bookingId: 1209333,
            bookNumber: '46201X',
            offenceEndDate: null,
            sentenceSequence: 6,
            sentenceDate: '2022-08-17',
            courtCaseRef: null,
            courtLocation: 'Wood Green Crown Court',
            resultDescription: 'Recall to Prison',
            isInconclusive: true,
          } as Charge,
          3934222: {
            chargeId: 3934221,
            offence: { code: 'COML016', statute: 'COML', description: 'A conclusive offence' },
            offenceDate: '2021-06-18',
            bookingId: 1209333,
            bookNumber: '46201X',
            offenceEndDate: null,
            sentenceSequence: 6,
            sentenceDate: '2022-08-17',
            courtCaseRef: null,
            courtLocation: 'Wood Green Crown Court',
            resultDescription: 'Recall to Prison',
            isInconclusive: false,
          } as Charge,
        },
        adjustments: [
          {
            fromDate: '2023-01-10',
            toDate: '2023-01-20',
            remand: {
              chargeId: [3933870],
            },
            days: 11,
            status: 'ACTIVE',
          } as Adjustment,
        ],
        intersectingSentencesUsingHistoricCalculation: [],
        chargeRemand: [
          {
            from: '2022-11-23',
            to: '2022-12-15',
            days: 23,
            chargeIds: [3934222],
            status: 'CASE_NOT_CONCLUDED',
          } as ChargeRemand,
          {
            from: '2022-11-23',
            to: '2022-12-15',
            days: 23,
            chargeIds: [3933924],
            status: 'CASE_NOT_CONCLUDED',
          } as ChargeRemand,
          {
            from: '2021-11-23',
            to: '2021-12-15',
            days: 23,
            chargeIds: [3933924],
            status: 'CASE_NOT_CONCLUDED',
          } as ChargeRemand,
          {
            from: '2023-01-10',
            to: '2023-01-20',
            days: 11,
            chargeIds: [3933870],
            status: 'APPLICABLE',
          } as ChargeRemand,
          {
            from: '2023-02-01',
            to: '2023-03-20',
            days: 48,
            chargeIds: [3933870],
            status: 'APPLICABLE',
          } as ChargeRemand,

          {
            from: '2023-02-01',
            to: '2023-03-20',
            chargeIds: [2222],
            days: 48,
            status: 'NOT_SENTENCED',
          } as ChargeRemand,
        ],
        intersectingSentences: [
          {
            from: '2022-08-17',
            to: '2023-01-16',
            sentence: {
              sequence: 3,
              sentenceDate: '2022-08-17',
              recallDate: null,
              bookingId: 1209333,
              recallDates: [],
            },
            chargeId: 3934217,
            days: 92,
            service: 'HISTORIC',
            errors: [],
            calculationIds: [1],
          } as IntersectingSentence,
          {
            from: '2023-01-17',
            to: '2023-01-18',
            sentence: {
              sequence: 6,
              sentenceDate: '2022-08-17',
              recallDate: '2023-05-18',
              bookingId: 1209333,
              recallDates: [],
            },
            chargeId: 3934220,
            days: 140,
            service: 'HISTORIC',
            errors: [],
            calculationIds: [1],
          } as IntersectingSentence,
          {
            // Same book number and shorter, shouldn't be displayed
            from: '2023-01-17',
            to: '2023-01-18',
            sentence: {
              sequence: 6,
              sentenceDate: '2022-08-17',
              recallDate: '2023-05-18',
              bookingId: 1209333,
              recallDates: [],
            },
            chargeId: 3934220,
            days: 140,
            service: 'HISTORIC',
            errors: [],
            calculationIds: [1],
          } as IntersectingSentence,
          {
            // Different book number should be displayed with text.
            from: '2023-01-17',
            to: '2023-01-18',
            sentence: {
              sequence: 6,
              sentenceDate: '2022-08-17',
              recallDate: '2023-05-18',
              bookingId: 1209333,
              recallDates: [],
            },
            chargeId: 3934221,
            days: 140,
            service: 'HISTORIC',
            errors: [],
            calculationIds: [1],
          } as IntersectingSentence,
          {
            // After most recent adjustment
            from: '2022-08-17',
            to: '2023-01-16',
            sentence: {
              sequence: 3,
              sentenceDate: '2022-08-17',
              recallDate: null,
              bookingId: 1209333,
              recallDates: [],
            },
            chargeId: 3934217,
            days: 92,
            service: 'HISTORIC',
            errors: [],
            calculationIds: [1],
          } as IntersectingSentence,
        ],
        periodsServingSentenceUsingCRDS: [],
        issuesWithLegacyData: [
          {
            message: 'This is an important message',
            offence: { code: 'ASD', statute: 'WR91', description: 'An offence with same statute' },
            bookingId: 1204935,
            bookNumber: '41938A',
            courtCaseRef: 'CASE5678',
          } as LegacyDataProblem,
          {
            message: 'This is also important message',
            offence: { code: 'A', statute: 'B', description: 'C' },
            bookingId: 1204935,
            bookNumber: '41938A',
            courtCaseRef: 'CASE1234',
          } as LegacyDataProblem,
          {
            message: 'This is not an important message',
            offence: { code: 'TP47017', statute: 'TP47', description: 'Accidentally allow a chimney to be on fire' },
            bookingId: 1204935,
            bookNumber: '41938A',
            courtCaseRef: 'CASE5678',
          } as LegacyDataProblem,
        ],
        periodsOutOfPrison: [],
      } as RemandResult

      const model = new DetailedRemandCalculation(remandResult)
      const result = model.getReplaceableChargeRemandGroupedByChargeIds()

      expect(result.length).toBe(2)
      expect(result[0].chargeIds).toEqual([3933924])
      expect(result[0].remand.length).toBe(2)
      expect(result[1].chargeIds).toEqual([2222])
      expect(result[1].remand.length).toBe(1)
    })
  })
})
