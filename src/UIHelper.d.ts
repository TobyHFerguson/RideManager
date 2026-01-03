/// <reference path="./gas-globals.d.ts" />

import type { ValidationResult } from './ValidationCore';

/**
 * Confirmation result
 */
export interface ConfirmationResult {
    confirmed: boolean;
    processableRows: InstanceType<typeof RowCore>[];
}

/**
 * Cancellation confirmation result
 */
export interface CancellationConfirmationResult extends ConfirmationResult {
    sendCancellationNotice: boolean;
}

/**
 * Reinstatement confirmation result
 */
export interface ReinstatementConfirmationResult extends ConfirmationResult {
    sendReinstatementNotice: boolean;
}

/**
 * Reason prompt result
 */
export interface ReasonPromptResult {
    cancelled: boolean;
    reason: string;
}

/**
 * Confirmation options
 */
export interface ConfirmationOptions {
    operationName: string;
    rows: InstanceType<typeof RowCore>[];
    validation: Map<InstanceType<typeof RowCore>, ValidationResult>;
    force?: boolean;
}

/**
 * UI Helper utilities for Google Apps Script
 */
declare class UIHelper {
    /**
     * Confirm operation with user
     */
    static confirmOperation(options: ConfirmationOptions): ConfirmationResult;

    /**
     * Build validation message for display
     */
    static buildValidationMessage(
        operationName: string,
        rows: InstanceType<typeof RowCore>[],
        validation: Map<InstanceType<typeof RowCore>, ValidationResult>
    ): string;

    /**
     * Show success message
     */
    static showSuccess(message: string): void;

    /**
     * Show error message
     */
    static showError(title: string, error: Error | string): void;

    /**
     * Confirm cancellation with announcement handling
     */
    static confirmCancellationWithAnnouncements(
        rows: InstanceType<typeof RowCore>[],
        validation: Map<InstanceType<typeof RowCore>, ValidationResult>,
        rowsWithAnnouncements: InstanceType<typeof RowCore>[]
    ): CancellationConfirmationResult;

    /**
     * Confirm reinstatement with announcement handling
     */
    static confirmReinstatementWithAnnouncements(
        rows: InstanceType<typeof RowCore>[],
        validation: Map<InstanceType<typeof RowCore>, ValidationResult>,
        rowsWithAnnouncements: InstanceType<typeof RowCore>[]
    ): ReinstatementConfirmationResult;

    /**
     * Prompt user for cancellation reason
     * @param row - Optional row for context in prompt message
     */
    static promptForCancellationReason(row?: InstanceType<typeof RowCore>): ReasonPromptResult;

    /**
     * Prompt user for reinstatement reason
     * @param row - Optional row for context in prompt message
     */
    static promptForReinstatementReason(row?: InstanceType<typeof RowCore>): ReasonPromptResult;
}

export default UIHelper;
