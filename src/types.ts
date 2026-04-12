export interface UserProfile {
  name: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  gender: 'male' | 'female';
  activity: 'sedentary' | 'lightly active' | 'moderately active';
  goal: 'lose' | 'maintain' | 'gain';
  diseases: string[];
  allergies: string[];
  dietPref: 'veg' | 'nonveg' | 'both';
  streak?: number;
  lastLoginDate?: string;
}

export interface FoodItem {
  name: string;
  cal: number;
  type: 'Morning' | 'Afternoon' | 'Night';
  diet: 'veg' | 'nonveg';
  highSugar: boolean;
  highSodium: boolean;
  allergens: string[];
  time: string;
  serving?: string;
  image?: string;
}

export interface MealPlan {
  Morning: FoodItem[];
  Afternoon: FoodItem[];
  Night: FoodItem[];
}

export interface AIPrescriptionData {
  assessment: string;
  guidelines: string[];
  supplements: string[];
  warnings: string[];
}
