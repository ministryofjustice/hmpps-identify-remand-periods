import { LegacyDataProblem } from '../@types/identifyRemandPeriods/identifyRemandPeriodsTypes'
import ValidationError from '../model/validationError'

const properCase = (word: string): string =>
  word.length >= 1 ? word[0].toUpperCase() + word.toLowerCase().slice(1) : word

const isBlank = (str: string): boolean => !str || /^\s*$/.test(str)

/**
 * Converts a name (first name, last name, middle name, etc.) to proper case equivalent, handling double-barreled names
 * correctly (i.e. each part in a double-barreled is converted to proper case).
 * @param name name to be converted.
 * @returns name converted to proper case.
 */
const properCaseName = (name: string): string => (isBlank(name) ? '' : name.split('-').map(properCase).join('-'))

export const convertToTitleCase = (sentence: string): string =>
  isBlank(sentence) ? '' : sentence.split(' ').map(properCaseName).join(' ')

export const initialiseName = (fullName?: string): string | null => {
  // this check is for the authError page
  if (!fullName) return null

  const array = fullName.split(' ')
  return `${array[0][0]}. ${array.reverse()[0]}`
}

export const sameMembers = <T>(array1: T[], array2: T[]) => containsAll(array1, array2) && containsAll(array2, array1)

export const containsAll = <T>(array1: T[], array2: T[]) =>
  array2.every(arr2Item => array1.find(arr1Item => deepEqual(arr1Item, arr2Item)))

export const deepEqual = <T>(x: T, y: T): boolean => {
  const ok = Object.keys
  const tx = typeof x
  const ty = typeof y
  return x && y && tx === 'object' && tx === ty
    ? ok(x).length === ok(y).length &&
        ok(x).every(key => deepEqual((x as Record<string, unknown>)[key], (y as Record<string, unknown>)[key]))
    : x === y
}

// This date arithmetic is inclusive  of both end boundaries, e.g. 2023-01-01 to 2023-01-01 is 1 day
export const daysBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / (1000 * 3600 * 24) + 1

export function onlyUnique<T>(value: T, index: number, array: T[]) {
  return array.indexOf(value) === index
}

export const distinct = <T>(all: T[]): T[] => {
  return all.filter(onlyUnique)
}

export const fieldHasErrors = (errors: ValidationError[], field: string) => {
  return !!errors.find(error => error.fields.indexOf(field) !== -1)
}

export const isImportantError = (
  problem: LegacyDataProblem,
  activeSentenceCourtCases: string[],
  activeSentenceStatues: string[],
): boolean => {
  if (['UNSUPPORTED_OUTCOME', 'MISSING_COURT_OUTCOME'].includes(problem.type)) {
    return false
  }
  if (
    [
      'MISSING_RECALL_EVENT',
      'MISSING_COURT_EVENT_FOR_IMPRISONMENT_STATUS_REMAND',
      'MISSING_COURT_EVENT_FOR_IMPRISONMENT_STATUS_RECALL',
      'MISSING_COURT_EVENT_FOR_IMPRISONMENT_STATUS_SENTENCING',
    ].includes(problem.type)
  ) {
    return true
  }
  return (
    activeSentenceStatues.includes(problem.offence.statute) || activeSentenceCourtCases.includes(problem.courtCaseRef)
  )
}
