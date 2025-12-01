/**
 * Depreciation calculation utilities for fixed assets
 * Supports straight-line and declining balance methods with daily precision
 */

export interface DepreciationResult {
    bookValue: number;              // Current book value (purchase price - accumulated depreciation)
    accumulatedDepreciation: number; // Total depreciation to date
    remainingLife: number;           // Remaining useful life in years
    dailyDepreciation: number;       // Daily depreciation amount
    annualDepreciation: number;      // Annual depreciation amount
}

/**
 * Calculate the number of days between two dates
 */
function getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Calculate straight-line depreciation
 * Formula: Annual Depreciation = (Purchase Price - Salvage Value) / Useful Life
 * Daily depreciation is spread evenly across the useful life
 */
export function calculateStraightLineDepreciation(
    purchasePrice: number,
    salvageValue: number,
    usefulLifeYears: number,
    startDate: string,
    currentDate: string = new Date().toISOString().split('T')[0]
): DepreciationResult {
    const depreciableAmount = purchasePrice - salvageValue;
    const annualDepreciation = depreciableAmount / usefulLifeYears;
    const dailyDepreciation = annualDepreciation / 365;

    const daysElapsed = getDaysBetween(startDate, currentDate);
    const totalDaysUsefulLife = usefulLifeYears * 365;

    // Calculate accumulated depreciation (capped at depreciable amount)
    const accumulatedDepreciation = Math.min(
        daysElapsed * dailyDepreciation,
        depreciableAmount
    );

    const bookValue = Math.max(purchasePrice - accumulatedDepreciation, salvageValue);

    const daysRemaining = Math.max(0, totalDaysUsefulLife - daysElapsed);
    const remainingLife = daysRemaining / 365;

    return {
        bookValue,
        accumulatedDepreciation,
        remainingLife,
        dailyDepreciation,
        annualDepreciation
    };
}

/**
 * Calculate declining balance depreciation (Double Declining Balance method)
 * Formula: Depreciation Rate = (1 / Useful Life) × 2
 * Each year's depreciation = Book Value × Depreciation Rate
 * 
 * Note: This method depreciates faster in early years and slower in later years
 * We calculate year by year and then prorate for the current year based on days
 */
export function calculateDecliningBalanceDepreciation(
    purchasePrice: number,
    salvageValue: number,
    usefulLifeYears: number,
    startDate: string,
    currentDate: string = new Date().toISOString().split('T')[0]
): DepreciationResult {
    const depreciationRate = (1 / usefulLifeYears) * 2;
    const daysElapsed = getDaysBetween(startDate, currentDate);
    const yearsElapsed = daysElapsed / 365;

    let bookValue = purchasePrice;
    let accumulatedDepreciation = 0;

    // Calculate depreciation year by year
    for (let year = 0; year < Math.floor(yearsElapsed); year++) {
        const yearDepreciation = Math.min(
            bookValue * depreciationRate,
            bookValue - salvageValue
        );
        accumulatedDepreciation += yearDepreciation;
        bookValue -= yearDepreciation;

        // Stop if we've reached salvage value
        if (bookValue <= salvageValue) {
            bookValue = salvageValue;
            break;
        }
    }

    // Handle the partial year (if any)
    const partialYear = yearsElapsed - Math.floor(yearsElapsed);
    if (partialYear > 0 && bookValue > salvageValue) {
        const partialYearDepreciation = Math.min(
            bookValue * depreciationRate * partialYear,
            bookValue - salvageValue
        );
        accumulatedDepreciation += partialYearDepreciation;
        bookValue -= partialYearDepreciation;
    }

    // Ensure book value doesn't go below salvage value
    bookValue = Math.max(bookValue, salvageValue);
    accumulatedDepreciation = Math.min(accumulatedDepreciation, purchasePrice - salvageValue);

    const remainingLife = Math.max(0, usefulLifeYears - yearsElapsed);

    // Calculate current annual and daily depreciation rates
    const currentAnnualDepreciation = remainingLife > 0
        ? Math.min(bookValue * depreciationRate, bookValue - salvageValue)
        : 0;
    const currentDailyDepreciation = currentAnnualDepreciation / 365;

    return {
        bookValue,
        accumulatedDepreciation,
        remainingLife,
        dailyDepreciation: currentDailyDepreciation,
        annualDepreciation: currentAnnualDepreciation
    };
}

/**
 * Main depreciation calculation function
 * Determines which method to use based on the depreciation type
 */
export function calculateDepreciation(
    purchasePrice: number,
    salvageValue: number,
    usefulLifeYears: number,
    depreciationType: 'STRAIGHT_LINE' | 'DECLINING_BALANCE',
    startDate: string,
    currentDate?: string
): DepreciationResult {
    if (depreciationType === 'STRAIGHT_LINE') {
        return calculateStraightLineDepreciation(
            purchasePrice,
            salvageValue,
            usefulLifeYears,
            startDate,
            currentDate
        );
    } else {
        return calculateDecliningBalanceDepreciation(
            purchasePrice,
            salvageValue,
            usefulLifeYears,
            startDate,
            currentDate
        );
    }
}
