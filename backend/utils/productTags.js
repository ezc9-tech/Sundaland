export const PRODUCT_TAGS = [
  "Electronics",
  "Computers & Accessories",
  "Video Games",
  "Home & Kitchen",
  "Furniture",
  "Garden & Outdoor",
  "Tools & Home Improvement",
  "Clothing",
  "Shoes",
  "Jewelry & Accessories",
  "Beauty & Personal Care",
  "Health & Household",
  "Grocery",
  "Baby",
  "Toys & Games",
  "Sports & Outdoors",
  "Automotive",
  "Pet Supplies",
  "Books",
  "Music & Instruments",
  "Arts & Crafts",
  "Office Products",
  "Other",
];

export function validateProductTag(tag) {
  if (typeof tag !== "string" || !PRODUCT_TAGS.includes(tag)) {
    return "Please choose a valid tag";
  }
  return null;
}