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
declare namespace UIHelper {
    /**
     * Confirm operation with user
     */
    function confirmOperation(options: ConfirmationOptions): ConfirmationResult;

    /**
     * Build validation message for display
     */
    function buildValidationMessage(
        operationName: string,
        rows: InstanceType<typeof RowCore>[],
        validation: Map<InstanceType<typeof RowCore>, ValidationResult>
    ): string;

    /**
     * Show success message
     */
    function showSuccess(message: string): void;

    /**
     * Show error message
     */
    function showError(title: string, error: Error | string): void;

    /**
     * Confirm cancellation with announcement handling
     */
    function confirmCancellationWithAnnouncements(
        rows: InstanceType<typeof RowCore>[],
        validation: Map<InstanceType<typeof RowCore>, ValidationResult>,
        rowsWithAnnouncements: InstanceType<typeof RowCore>[]
    ): CancellationConfirmationResult;

    /**
     * Confirm reinstatement with announcement handling
     */
    function confirmReinstatementWithAnnouncements(
        rows: InstanceType<typeof RowCore>[],
        validation: Map<InstanceType<typeof RowCore>, ValidationResult>,
        rowsWithAnnouncements: InstanceType<typeof RowCore>[]
    ): ReinstatementConfirmationResult;

    /**
     * Prompt user for cancellation reason
     */
    function promptForCancellationReason(row: InstanceType<typeof RowCore>): ReasonPromptResult;

    /**
     * Prompt user for reinstatement reason
     */
    function promptForReinstatementReason(row: InstanceType<typeof RowCore>): ReasonPromptResult;
}

export default UIHelper;
