export type EvaluationStatus = 'SUCCESS' | 'EVALUATION_ERROR' | 'JSHELL_ERROR' | 'PARSE_ERROR' | 'SETUP_ERROR';

export interface EvaluationResult {
    output: string;
    errorOutput: string;
    durationInMs: number;
    augmentedOutput: AugmentedOutput;
    evaluationStatus: EvaluationStatus;
}

export interface AugmentedOutput {
    name: string;
    type: string;
    output: string;
}