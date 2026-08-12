export const DOWNING_BASE_FIXTURE = {
  allergens: [{ id: "1", name: "Gluten" }, { id: "64", name: "Milk" }],
  business: { id: 705, name: "Downing College Cambridge", currency: "GBP" },
  outlet: { id: 17260, name: "DOWNING STUDENT FOOD PRICES ONLY" },
  menu_groups: [{ id: 4095, name: "Summer 2026 - Week 2", is_active: true }]
};

export const DOWNING_SEARCH_FIXTURE = {
  id: 17260,
  name: "DOWNING STUDENT FOOD PRICES ONLY",
  menus: [{
    id: 184409,
    name: "Summer 2026 - Week 2 - Wednesday",
    weekdays: { sequence: 14, is_sun: false, is_mon: true, is_tue: true, is_wed: true, is_thu: false, is_fri: false, is_sat: false },
    recipes: [
      {
        id: 6180084,
        name: "Honey glazed bacon loin",
        inherited_allergens: [{ id: "1", name: "Gluten" }],
        tags: [{ id: 419, name: "Contains Pork", group: null }],
        prices: [{ price: 3.5, price_text: "£3.50" }]
      },
      {
        id: 1821836,
        name: "Vegetable gyoza",
        inherited_allergens: [{ id: "64", name: "Milk" }],
        tags: [{ id: 256, name: "Suitable for Vegan diet", group: "Dietary" }],
        prices: [{ price: 3.4, price_text: "£3.40" }]
      }
    ]
  }]
};
