/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 2.18.565 on 2019-11-07 06:38:26.

interface EvaluationRequest {
    script: string;
    cursorPosition: number;
}

interface AugmentedOutput {
    output: string;
    name: string;
    type: string;
}

interface DocumentationResponse {
    signature: string;
    documentation: string;
}

interface SuggestionResponse {
    cursor: number;
    anchor: number;
    suggestions: Suggestion[];
}

interface Success extends EvaluationResponse {
    output: string;
    errorOutput: string;
    durationInMs: number;
    augmentedOutput: Supplier<AugmentedOutput>;
}

interface Error extends EvaluationResponse {
    error: string;
}

interface EvaluationError extends Error {
    output: string;
    durationInMs: number;
}

interface Suggestion {
    continuation: string;
    matchesType: boolean;
}

interface Supplier<T> {
}

interface EvaluationResponse {
    evaluationStatus: Status;
}

type Status = "EVALUATION_ERROR" | "JSHELL_ERROR" | "PARSE_ERROR" | "SETUP_ERROR" | "SUCCESS";
