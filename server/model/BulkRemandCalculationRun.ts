import BulkRemandCalculationRow from './BulkRemandCalculationRow'

type BulkRemandCalculationRun = {
  id: string
  status: 'RUNNING' | 'DONE'
  results: BulkRemandCalculationRow[] | null
}

export default BulkRemandCalculationRun
