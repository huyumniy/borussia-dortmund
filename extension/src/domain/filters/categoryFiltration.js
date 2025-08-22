export function categoryFiltration(
  availableRows,
  categoryToQuantity,
  categoryIdToCategory
) {
  let result = []
  for (let row of availableRows) {
    let priceCategories = row.availabilityInfo.priceCategories;
    for (let priceCategory of priceCategories) {
      const categoryName = categoryIdToCategory[priceCategory.priceCategory].name
      const availableAmount = priceCategory.amount
      const settingsAmount = categoryToQuantity[categoryName]
      
      if (settingsAmount) {
        if (availableAmount >= settingsAmount) {
          result.push(row)
        }
      } else if (!categoryToQuantity && availableAmount > 0) {
        result.push(row)
      }
    }
  }

  return result;
}
