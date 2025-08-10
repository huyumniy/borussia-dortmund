/**
 * Finds non-overlapping sequences of seat-IDs (as strings) which,
 * when interpreted numerically, form a maximal run where each step
 * is +1 or +2, and only returns runs of length ≥ quantity.
 *
 * @param {Object} seats         – array with objects that contains availability info and id.
 * @param {number} quantity      – minimum chain length
 * @returns {string[][]}         – array of valid chains
 */
export function filterSeatChain(
  seats,
  quantity
) {
    console.log(quantity, 'quantity')
    const nums = seats
    .filter(seat => seat.available)
    .map(seat => seat.id)

    console.log(nums, 'nums')

    if (nums.length === 0) {
        return [];
    }

    const results = [];
    let currentChain = [ nums[0] ];

    for (let i = 1; i < nums.length; i++) {
        const diff = nums[i] - nums[i - 1];
        if (diff === 1 || diff === 2) {
        currentChain.push(nums[i]);
        } else {
        if (currentChain.length >= quantity) {
            results.push(currentChain.map(String));
        }
        currentChain = [ nums[i] ];
        }
    }

    if (currentChain.length >= quantity) {
        results.push(currentChain.map(String));
    }

    return results;
}
