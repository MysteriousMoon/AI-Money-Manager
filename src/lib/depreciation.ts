/**
 * 固定资产折旧计算工具
 * 支持直线法和余额递减法，精确到日
 */

export interface DepreciationResult {
    bookValue: number;              // 当前账面价值（原值 - 累计折旧）
    accumulatedDepreciation: number; // 累计已折旧金额
    remainingLife: number;           // 剩余使用年限（年）
    dailyDepreciation: number;       // 日折旧额
    annualDepreciation: number;      // 年折旧额
}

/**
 * 计算两个日期之间的天数
 */
function getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * 计算直线法折旧
 * 公式：年折旧额 = (原值 - 残值) / 使用年限
 * 日折旧额均匀分摊到使用年限内
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

    // 计算累计折旧（上限为可折旧金额）
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
 * 计算余额递减法折旧（双倍余额递减法）
 * 公式：折旧率 = (1 / 使用年限) × 2
 * 每年折旧额 = 账面价值 × 折旧率
 * 
 * 注意：这种方法在前期折旧快，后期慢
 * 我们逐年计算，然后根据天数按比例计算当年的折旧
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

    // 逐年计算折旧
    for (let year = 0; year < Math.floor(yearsElapsed); year++) {
        const yearDepreciation = Math.min(
            bookValue * depreciationRate,
            bookValue - salvageValue
        );
        accumulatedDepreciation += yearDepreciation;
        bookValue -= yearDepreciation;

        // 如果达到残值则停止
        if (bookValue <= salvageValue) {
            bookValue = salvageValue;
            break;
        }
    }

    // 处理非整年部分（如果有）
    const partialYear = yearsElapsed - Math.floor(yearsElapsed);
    if (partialYear > 0 && bookValue > salvageValue) {
        const partialYearDepreciation = Math.min(
            bookValue * depreciationRate * partialYear,
            bookValue - salvageValue
        );
        accumulatedDepreciation += partialYearDepreciation;
        bookValue -= partialYearDepreciation;
    }

    // 确保账面价值不低于残值
    bookValue = Math.max(bookValue, salvageValue);
    accumulatedDepreciation = Math.min(accumulatedDepreciation, purchasePrice - salvageValue);

    const remainingLife = Math.max(0, usefulLifeYears - yearsElapsed);

    // 计算当前的年折旧率和日折旧率
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
 * 折旧计算主函数
 * 根据折旧类型决定使用哪种方法
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
