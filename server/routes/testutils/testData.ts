import { RemandResult } from '../../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'

const remandResult = {
  chargeRemand: [
    {
      from: '2022-11-23',
      to: '2022-12-15',
      charge: {
        chargeId: 3933924,
        offence: { code: 'TP47017', statute: 'TP47', description: 'Accidentally allow a chimney to be on fire' },
        offenceDate: '2023-02-01',
        bookingId: 1204935,
        bookNumber: '41938A',
        offenceEndDate: null,
        sentenceSequence: null,
        sentenceDate: null,
        courtCaseRef: 'CASE5678',
        courtLocation: 'Birmingham Crown Court',
        resultDescription: 'Imprisonment',
      },
      days: 23,
    },
    {
      from: '2023-01-10',
      to: '2023-01-20',
      charge: {
        chargeId: 3933870,
        offence: { code: 'WR91001', statute: 'WR91', description: 'Abstract water without a licence' },
        offenceDate: '2022-01-10',
        bookingId: 1204935,
        bookNumber: '41938A',
        offenceEndDate: null,
        sentenceSequence: 1,
        sentenceDate: '2023-03-21',
        courtCaseRef: 'CASE1234',
        courtLocation: 'Birmingham Crown Court',
        resultDescription: 'Imprisonment',
      },
      days: 11,
    },
    {
      from: '2023-02-01',
      to: '2023-03-20',
      charge: {
        chargeId: 3933870,
        offence: { code: 'WR91001', statute: 'WR91', description: 'Abstract water without a licence' },
        offenceDate: '2022-01-10',
        bookingId: 1204935,
        bookNumber: '41938A',
        offenceEndDate: null,
        sentenceSequence: 1,
        sentenceDate: '2023-03-21',
        courtCaseRef: 'CASE1234',
        courtLocation: 'Birmingham Crown Court',
        resultDescription: 'Imprisonment',
      },
      days: 48,
    },
    {
      from: '2023-02-01',
      to: '2023-03-20',
      charge: {
        chargeId: 2222,
        offence: { code: 'WR91001', statute: 'WR91', description: 'Abstract water without a licence' },
        offenceDate: '2022-01-10',
        bookingId: 1204935,
        bookNumber: '41938A',
        offenceEndDate: null,
        sentenceSequence: 1,
        sentenceDate: '2023-03-21',
        courtCaseRef: 'CASE1234',
        courtLocation: 'Birmingham Crown Court',
        resultDescription: 'Imprisonment',
      },
      days: 48,
    },
  ],
  sentenceRemand: [
    {
      from: '2023-01-10',
      to: '2023-01-20',
      charge: {
        chargeId: 3933870,
        offence: { code: 'WR91001', statute: 'WR91', description: 'Abstract water without a licence' },
        offenceDate: '2022-01-10',
        bookingId: 1204935,
        bookNumber: '41938A',
        offenceEndDate: null,
        sentenceSequence: 1,
        sentenceDate: '2023-03-21',
        courtCaseRef: 'CASE1234',
        courtLocation: 'Birmingham Crown Court',
        resultDescription: 'Imprisonment',
      },
      days: 11,
    },
    {
      from: '2023-02-01',
      to: '2023-03-20',
      charge: {
        chargeId: 3933870,
        offence: { code: 'WR91001', statute: 'WR91', description: 'Abstract water without a licence' },
        offenceDate: '2022-01-10',
        bookingId: 1204935,
        bookNumber: '41938A',
        offenceEndDate: null,
        sentenceSequence: 1,
        sentenceDate: '2023-03-21',
        courtCaseRef: 'CASE1234',
        courtLocation: 'Birmingham Crown Court',
        resultDescription: 'Imprisonment',
      },
      days: 48,
    },
  ],
  intersectingSentences: [
    {
      from: '2022-08-17',
      to: '2022-11-16',
      sentence: { sequence: 3, sentenceDate: '2022-08-17', recallDate: null, bookingId: 1209333 },
      charge: {
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
      },
      days: 92,
    },
    {
      from: '2023-05-18',
      to: '2023-10-04',
      sentence: { sequence: 6, sentenceDate: '2022-08-17', recallDate: '2023-05-18', bookingId: 1209333 },
      charge: {
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
      },
      days: 140,
    },
  ],
  issuesWithLegacyData: [
    {
      message: 'This is an important message',
      offence: { code: 'ASD', statute: 'WR91', description: 'An offence with same statute' },
      bookingId: 1204935,
      bookNumber: '41938A',
      courtCaseRef: 'CASE5678',
    },
    {
      message: 'This is also important message',
      offence: { code: 'A', statute: 'B', description: 'C' },
      bookingId: 1204935,
      bookNumber: '41938A',
      courtCaseRef: 'CASE1234',
    },
    {
      message: 'This is not an important message',
      offence: { code: 'TP47017', statute: 'TP47', description: 'Accidentally allow a chimney to be on fire' },
      bookingId: 1204935,
      bookNumber: '41938A',
      courtCaseRef: 'CASE5678',
    },
  ],
} as RemandResult

export default remandResult
