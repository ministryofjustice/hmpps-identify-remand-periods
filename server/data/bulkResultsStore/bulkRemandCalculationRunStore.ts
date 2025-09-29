import BulkRemandCalculationRun from '../../model/BulkRemandCalculationRun'

export default interface BulkRemandCalculationRunStore {
  setRun(id: string, run: BulkRemandCalculationRun, durationSeconds: number): Promise<void>
  getRun(id: string): Promise<BulkRemandCalculationRun | null>
}
