/**
 * Maps each Find Companies category to the Overture places that belong to it.
 *
 * Overture files are split by its coarse `basic_category` (one .json.gz per
 * category per city). Each row also carries the finer `taxonomy.primary` as
 * `t`, omitted when it equals the coarse one. A selector names the file to
 * fetch and, optionally, which fine values inside it count; without `t`
 * the whole file counts. Names were taken from release 2026-10-21.0 data.
 */

export interface OvertureSelector {
  /** Overture `basic_category`, i.e. the file name. */
  c: string;
  /** Allowed `taxonomy.primary` values inside that file; omit for all. */
  t?: string[];
}

export const OVERTURE_CATEGORY_SELECTORS: Record<string, OvertureSelector[]> = {
  // -- Food & Drink -----------------------------------------------------
  Restaurant: [{ c: "restaurant" }],
  "Coffee Shop": [{ c: "coffee_shop" }, { c: "cafe" }],
  Bakery: [{ c: "casual_eatery", t: ["bakery"] }],
  "Coffee Roaster": [{ c: "coffee_shop", t: ["coffee_roastery"] }],
  Bar: [{ c: "bar" }, { c: "lounge" }],
  Pub: [{ c: "bar", t: ["pub"] }],
  "Fast Food": [{ c: "fast_food_restaurant" }, { c: "food_truck_stand" }],
  "Ice Cream Shop": [{ c: "casual_eatery", t: ["ice_cream_shop"] }],
  Catering: [{ c: "event_or_party_service", t: ["caterer"] }],
  Butcher: [{ c: "food_and_beverage_store", t: ["butcher_shop"] }],
  Greengrocer: [{ c: "food_and_beverage_store", t: ["produce_store"] }],
  Confectionery: [{ c: "casual_eatery", t: ["candy_store"] }],
  "Tea Shop": [{ c: "non_alcoholic_beverage_venue", t: ["tea_room"] }],
  "Wine Shop": [{ c: "food_and_beverage_store", t: ["liquor_store"] }],

  // -- Retail & Shopping -------------------------------------------------
  Supermarket: [{ c: "food_and_beverage_store", t: ["grocery_store"] }, { c: "superstore" }],
  "Convenience Store": [{ c: "convenience_store" }],
  "Department Store": [{ c: "department_store" }],
  "Clothing Store": [{ c: "fashion_and_apparel_store", t: ["clothing_store", "fashion_boutique"] }],
  "Shoe Store": [{ c: "fashion_and_apparel_store", t: ["shoe_store"] }],
  Bookstore: [{ c: "books_music_and_video_store", t: ["bookstore"] }],
  "Bicycle Shop": [{ c: "sporting_goods_store", t: ["bike_store"] }],
  "Electronics Store": [{ c: "electronics_store" }],
  "Mobile Phone Shop": [
    { c: "electronics_store", t: ["mobile_phone_store", "mobile_phone_accessory_store"] },
  ],
  "Furniture Store": [{ c: "hardware_home_and_garden_store", t: ["furniture_store"] }],
  Florist: [{ c: "flowers_and_gifts_store", t: ["florist"] }],
  "Gift Shop": [{ c: "flowers_and_gifts_store", t: ["gift_shop"] }],
  "Jewelry Store": [{ c: "fashion_and_apparel_store", t: ["jewelry_store"] }],
  "Toy Store": [{ c: "toys_and_games_store" }],
  "Sports Shop": [{ c: "sporting_goods_store" }],
  "Pet Store": [{ c: "animal_and_pet_store" }],
  "Hardware Store": [{ c: "hardware_home_and_garden_store", t: ["hardware_store"] }],
  "Home Improvement Store": [{ c: "hardware_home_and_garden_store", t: ["home_improvement_store"] }],
  "Wholesale Store": [{ c: "wholesaler" }, { c: "warehouse_club_store" }],
  "Stationery Shop": [{ c: "office_supply_store" }],
  "Cosmetics Store": [{ c: "personal_care_and_beauty_store" }],
  Optician: [{ c: "fashion_and_apparel_store", t: ["eyewear_store"] }, { c: "vision_or_eye_care_clinic" }],
  "Second-hand Store": [{ c: "second_hand_store" }],
  "Antique Shop": [{ c: "second_hand_store", t: ["antique_store"] }],
  "Music Shop": [
    { c: "musical_instrument_and_pro_audio_store" },
    { c: "books_music_and_video_store", t: ["music_and_dvd_store"] },
  ],
  "Dry Cleaner": [{ c: "laundry_service" }],
  Tailor: [{ c: "home_service", t: ["tailor", "sewing_and_alterations"] }],
  "Photography Studio": [{ c: "media_service", t: ["photography_service"] }],

  // -- Health & Medical --------------------------------------------------
  "Dental Clinic": [{ c: "dental_clinic" }],
  Pharmacy: [{ c: "pharmacy_and_drug_store" }],
  Hospital: [{ c: "hospital" }, { c: "specialty_hospital" }, { c: "emergency_department" }],
  "Veterinary Clinic": [{ c: "animal_or_pet_service", t: ["veterinarian"] }],
  "Medical Clinic": [
    { c: "primary_care_or_general_clinic" },
    { c: "outpatient_care_facility" },
    { c: "walk_in_clinic" },
    { c: "urgent_care_clinic" },
    { c: "pediatric_clinic" },
    { c: "health_care" },
  ],
  Physiotherapy: [{ c: "physical_medicine_and_rehabilitation" }],

  // -- Beauty & Wellness -------------------------------------------------
  "Yoga Studio": [{ c: "fitness_studio", t: ["yoga_studio"] }],
  Hairdresser: [{ c: "personal_or_beauty_service", t: ["hair_salon", "barber", "hair_stylist"] }],
  "Beauty Salon": [
    { c: "personal_or_beauty_service", t: ["beauty_salon", "nail_salon"] },
    { c: "wellness_service", t: ["spa", "day_spa"] },
  ],
  Gym: [{ c: "gym" }, { c: "fitness_studio" }, { c: "sport_or_fitness_facility", t: ["fitness_trainer"] }],

  // -- Automotive --------------------------------------------------------
  "Car Dealership": [{ c: "auto_dealer" }, { c: "vehicle_dealer" }],
  "Car Repair": [
    { c: "automotive_service", t: ["automotive_repair", "auto_body_shop", "auto_electrical_repair"] },
  ],
  "Car Rental": [{ c: "rental_service", t: ["car_rental_service"] }],
  "Car Wash": [{ c: "automotive_service", t: ["car_wash", "auto_detailing"] }],
  "Fuel Station": [{ c: "gas_station" }, { c: "fueling_station" }],
  "Tire Shop": [{ c: "automotive_service", t: ["tire_dealer_and_repair", "tire_shop"] }],
  "Motorcycle Shop": [
    { c: "vehicle_dealer", t: ["motorcycle_dealer"] },
    { c: "vehicle_service", t: ["motorcycle_repair"] },
  ],

  // -- Home & Trades -----------------------------------------------------
  Plumber: [{ c: "home_service", t: ["plumbing"] }],
  "Interior Design": [{ c: "home_service", t: ["interior_design"] }],
  Landscaping: [{ c: "home_service", t: ["landscaping", "landscape_architect"] }],
  Electrician: [{ c: "home_service", t: ["electrician"] }],
  Carpenter: [{ c: "home_service", t: ["carpenter"] }],
  Painter: [{ c: "home_service", t: ["painting"] }],
  Locksmith: [{ c: "home_service", t: ["key_and_locksmith"] }],
  Shoemaker: [{ c: "personal_or_beauty_service", t: ["shoe_repair"] }],
  Architect: [{ c: "design_service", t: ["architect", "architectural_designer"] }],

  // -- Property & Finance ------------------------------------------------
  "Real Estate Agent": [{ c: "real_estate_service" }],
  "Insurance Agency": [{ c: "financial_service", t: ["insurance_agency", "life_insurance", "auto_insurance"] }],
  Bank: [{ c: "bank_or_credit_union" }],
  Accountant: [{ c: "financial_service", t: ["accountant"] }, { c: "professional_service", t: ["bookkeeper"] }],
  Lawyer: [{ c: "attorney_or_law_firm" }, { c: "legal_service" }],

  // -- Business Services -------------------------------------------------
  "Coworking Space": [
    { c: "professional_service", t: ["coworking_space"] },
    { c: "real_estate_service", t: ["shared_office_space"] },
  ],
  "Advertising Agency": [
    {
      c: "professional_service",
      t: ["advertising_agency", "marketing_agency", "social_media_agency", "internet_marketing_service", "public_relations"],
    },
  ],
  "IT Company": [
    { c: "technical_service", t: ["software_development", "it_service_and_computer_repair", "it_consultant"] },
    { c: "corporate_or_business_office", t: ["information_technology_company"] },
  ],
  "Telecom Company": [
    { c: "telecommunications_service" },
    { c: "technical_service", t: ["internet_service_provider"] },
    { c: "corporate_or_business_office", t: ["telecommunications_company"] },
  ],
  "Employment Agency": [{ c: "professional_service", t: ["employment_agency"] }],
  "Consulting Firm": [
    { c: "professional_service", t: ["business_consulting"] },
    { c: "b2b_office_and_professional_service" },
  ],
  "Print Shop": [{ c: "printing_service" }],

  // -- Education & Learning ----------------------------------------------
  School: [
    { c: "elementary_school" },
    { c: "middle_school" },
    { c: "high_school" },
    { c: "place_of_learning", t: ["school", "private_school", "public_school"] },
  ],
  University: [{ c: "college_university" }],
  College: [{ c: "college_university" }],
  Kindergarten: [{ c: "preschool" }, { c: "family_service", t: ["day_care_preschool"] }],
  "Driving School": [{ c: "specialty_school", t: ["driving_school"] }],
  "Language School": [{ c: "specialty_school", t: ["language_school"] }],
  "Music School": [{ c: "specialty_school", t: ["music_school"] }],
  Library: [{ c: "library" }],

  // -- Hotels & Travel ---------------------------------------------------
  Hotel: [{ c: "hotel" }, { c: "resort" }],
  Hostel: [{ c: "lodging", t: ["hostel"] }],
  "Guest House": [{ c: "bed_and_breakfast" }, { c: "inn" }, { c: "private_lodging", t: ["guest_house"] }],
  "Travel Agency": [{ c: "travel_service", t: ["travel_agent", "travel_service"] }],

  // -- Community & Public ------------------------------------------------
  "Post Office": [{ c: "shipping_or_delivery_service", t: ["post_office"] }],
  "Funeral Home": [{ c: "family_service", t: ["funeral_service"] }],
  "Self Storage": [{ c: "storage_facility" }],
  "Nonprofit Organization": [
    { c: "civic_organization", t: ["charity_organization"] },
    { c: "social_or_community_service" },
  ],

  // -- Entertainment & Leisure -------------------------------------------
  Cinema: [{ c: "movie_theater" }],
  Theatre: [{ c: "theatre_venue" }, { c: "performing_arts_venue" }],
  Nightclub: [{ c: "dance_club" }, { c: "nightlife_venue" }],
  "Bowling Alley": [{ c: "sport_or_fitness_facility", t: ["bowling_alley"] }],
  "Escape Room": [{ c: "gaming_venue", t: ["escape_room"] }],

  // -- Agriculture & Farming ---------------------------------------------
  Farm: [{ c: "farm" }],
  "Farm Shop": [{ c: "farmers_market" }],
};

/**
 * Whether one stored place belongs to a selector.
 *
 * @param place A row from a category file: its coarse `c` and optional fine `t`.
 * @returns True when the file matches and the fine value is allowed (or any is).
 */
export function matchesSelector(place: { c: string; t?: string }, selector: OvertureSelector): boolean {
  if (place.c !== selector.c) return false;
  // A missing `t` means the extract dropped it for equalling `c`.
  return selector.t === undefined || selector.t.includes(place.t ?? place.c);
}
