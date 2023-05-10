const { PRICE_PER_LITRE } = require('../constants/constants');

function calculateTotalSpent(openedAt, closedAt, flowVolume) {
    const secondsOpen = (new Date(closedAt) - new Date(openedAt)) / 1000;
    const totalSpent = secondsOpen * flowVolume * PRICE_PER_LITRE;
    return Number(totalSpent.toFixed(2));
}

module.exports = {
    calculateTotalSpent,
};
