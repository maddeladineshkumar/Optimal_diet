import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Droplet, Flame, FileText, Download, ChevronRight, ChevronLeft, CheckCircle2, X, ArrowLeft } from 'lucide-react';
import { UserProfile, MealPlan, AIPrescriptionData, FoodItem } from './types';
import { FOOD_DB, RECIPE_DB } from './data/foodDb';
import { ai } from './lib/gemini';
import Chatbot from './components/Chatbot';
import PrescriptionPDF from './components/PrescriptionPDF';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [aiPrescription, setAiPrescription] = useState<AIPrescriptionData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<{ name: string, recipe: any, mealType: string, cal: number } | null>(null);

  // Temporary state for onboarding form
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '', age: 25, weight: 70, height: 175, gender: 'male',
    activity: 'moderately active', goal: 'maintain',
    diseases: [], allergies: [], dietPref: 'both'
  });

  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const loadAccounts = () => {
    const data = localStorage.getItem('optimalDietAccounts');
    try {
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to parse accounts from localStorage', e);
      return {};
    }
  };

  const saveAccounts = (accounts: any) => {
    localStorage.setItem('optimalDietAccounts', JSON.stringify(accounts));
  };

  useEffect(() => {
    const loggedInUser = localStorage.getItem('optimalDietLoggedInUser');
    if (loggedInUser) {
      const accounts = loadAccounts();
      if (accounts[loggedInUser]) {
        const account = accounts[loggedInUser];
        // Keep user authenticated but don't restore dashboard state.
        // Pre-fill only the name so they don't have to type it again.
        const savedName = account.profile?.name || '';
        setFormData(prev => ({ ...prev, name: savedName }));
        setAuthMode(null);
        setOnboardingStep(0); // Send to welcome screen; they must re-fill health details.
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const accounts = loadAccounts();
    if (accounts[authUsername] && accounts[authUsername].password === authPassword) {
      localStorage.setItem('optimalDietLoggedInUser', authUsername);
      setAuthError('');

      const account = accounts[authUsername];
      // Pre-fill only the name; user must re-enter health details for a fresh plan.
      const savedName = account.profile?.name || '';
      setFormData(prev => ({ ...prev, name: savedName }));
      setAuthMode(null);
      setOnboardingStep(0); // Go to welcome screen, not dashboard.
    } else {
      setAuthError('Invalid username or password');
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername || !authPassword) {
      setAuthError('Please fill in all fields');
      return;
    }
    const accounts = loadAccounts();
    if (accounts[authUsername]) {
      setAuthError('Username already exists');
      return;
    }
    accounts[authUsername] = {
      password: authPassword,
      profile: null,
      mealPlan: null
    };
    saveAccounts(accounts);
    localStorage.setItem('optimalDietLoggedInUser', authUsername);
    setAuthError('');
    setAuthMode(null);
    setOnboardingStep(0);
  };

  const handleLogout = () => {
    localStorage.removeItem('optimalDietLoggedInUser');
    setUser(null);
    setMealPlan(null);
    setAuthMode('login');
    setAuthUsername('');
    setAuthPassword('');
    setOnboardingStep(0);
  };

  const handleStart = () => setOnboardingStep(1);

  const handleNext = () => setOnboardingStep(prev => prev + 1);
  const handlePrev = () => setOnboardingStep(prev => prev - 1);

  const toggleArrayItem = (field: 'diseases' | 'allergies', value: string) => {
    setFormData(prev => {
      const arr = prev[field] || [];
      if (value === 'none') return { ...prev, [field]: [] };
      if (arr.includes(value)) return { ...prev, [field]: arr.filter(i => i !== value) };
      return { ...prev, [field]: [...arr, value] };
    });
  };

  const estimateServingGrams = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('rice') || n.includes('biryani') || n.includes('pulao')) return 300;
    if (n.includes('curry') || n.includes('dal') || n.includes('gravy') || n.includes('chole') || n.includes('rajma')) return 250;
    if (n.includes('roti') || n.includes('chapati') || n.includes('paratha') || n.includes('naan') || n.includes('thepla')) return 120;
    if (n.includes('idli')) return 150;
    if (n.includes('dosa') || n.includes('cheela') || n.includes('chilla')) return 120;
    if (n.includes('upma') || n.includes('poha') || n.includes('pongal')) return 200;
    if (n.includes('oats') || n.includes('porridge') || n.includes('muesli') || n.includes('corn flakes')) return 250;
    if (n.includes('sandwich')) return 180;
    if (n.includes('salad') || n.includes('bowl')) return 250;
    if (n.includes('soup')) return 250;
    if (n.includes('egg')) return 120;
    if (n.includes('toast')) return 100;
    if (n.includes('shake') || n.includes('smoothie')) return 300;
    return 250;
  };

  const calculatePlan = () => {
    const w = formData.weight || 70;
    const h = formData.height || 175;
    const a = formData.age || 25;
    const g = formData.gender || 'male';
    const act = formData.activity || 'sedentary';
    const goal = formData.goal || 'maintain';

    let bmr = (10 * w) + (6.25 * h) - (5 * a) + (g === 'male' ? 5 : -161);
    const factors = { "sedentary": 1.2, "lightly active": 1.375, "moderately active": 1.55 };
    const goals = { "lose": -500, "maintain": 0, "gain": 500 };

    let target = Math.round((bmr * factors[act]) + goals[goal]);
    if (target < 1200) target = 1200;
    setTargetCalories(target);

    const mealCals = {
      "Morning": target * 0.30,
      "Afternoon": target * 0.40,
      "Night": target * 0.30
    };

    const generateCombo = (mealType: string, pool: FoodItem[]) => {
      let combo: FoodItem[] = [];
      for (let i = 0; i < 3 && pool.length > 0; i++) {
        let item = pool[Math.floor(Math.random() * pool.length)];
        let safety = 0;
        while (combo.includes(item) && safety < 20) {
          item = pool[Math.floor(Math.random() * pool.length)];
          safety++;
        }
        combo.push(item);
      }
      return combo;
    };

    // Generate meals
    const newMealPlan: MealPlan = { Morning: [], Afternoon: [], Night: [] };
    ['Morning', 'Afternoon', 'Night'].forEach(mealType => {
      let pool = FOOD_DB.filter(f => f.type === mealType);
      if (formData.dietPref === 'veg') pool = pool.filter(f => f.diet === 'veg');
      else if (formData.dietPref === 'nonveg') pool = pool.filter(f => f.diet === 'nonveg');

      if (formData.diseases?.includes('diabetes')) pool = pool.filter(f => !f.highSugar);
      if (formData.diseases?.includes('bp') || formData.diseases?.includes('heart')) pool = pool.filter(f => !f.highSodium);

      formData.allergies?.forEach(allergen => {
        pool = pool.filter(f => !f.allergens.includes(allergen));
      });

      if (pool.length === 0) {
        pool = FOOD_DB.filter(f => f.type === mealType && f.diet === 'veg' && !f.highSugar && !f.highSodium && f.allergens.length === 0);
      }

      newMealPlan[mealType as keyof MealPlan] = generateCombo(mealType, pool as FoodItem[]);
    });

    setMealPlan(newMealPlan);
    const loggedInUser = localStorage.getItem('optimalDietLoggedInUser');
    let currentStreak = 1;
    let lastLogin = new Date().toDateString();

    if (loggedInUser) {
      const accounts = loadAccounts();
      if (accounts[loggedInUser] && accounts[loggedInUser].profile) {
        currentStreak = accounts[loggedInUser].profile.streak || 1;
        lastLogin = accounts[loggedInUser].profile.lastLoginDate || new Date().toDateString();
      }
    }

    const finalProfile = { ...formData, streak: currentStreak, lastLoginDate: lastLogin } as UserProfile;
    setUser(finalProfile);
    setOnboardingStep(4); // Dashboard

    if (loggedInUser) {
      const accounts = loadAccounts();
      if (accounts[loggedInUser]) {
        accounts[loggedInUser].profile = finalProfile;
        accounts[loggedInUser].mealPlan = newMealPlan;
        accounts[loggedInUser].targetCalories = target;
        saveAccounts(accounts);
      }
    }
  };

  const swapFoodItem = (mealType: string, idx: number) => {
    if (!mealPlan || !user) return;
    let pool = FOOD_DB.filter(f => f.type === mealType);
    if (formData.dietPref === 'veg' || user.dietPref === 'veg') pool = pool.filter(f => f.diet === 'veg');
    else if (formData.dietPref === 'nonveg' || user.dietPref === 'nonveg') pool = pool.filter(f => f.diet === 'nonveg');
    if (user.diseases?.includes('diabetes')) pool = pool.filter(f => !f.highSugar);
    if (user.diseases?.includes('bp') || user.diseases?.includes('heart')) pool = pool.filter(f => !f.highSodium);
    user.allergies?.forEach(allergen => { pool = pool.filter(f => !f.allergens.includes(allergen)); });
    if (pool.length === 0) pool = FOOD_DB.filter(f => f.type === mealType && f.diet === 'veg');

    const currentMeal = mealPlan[mealType as keyof MealPlan];
    const currentNames = currentMeal.map(f => f.name);
    const candidates = pool.filter(f => f.name !== currentMeal[idx].name && !currentNames.includes(f.name));
    if (candidates.length === 0) return; // no other options

    const newItem = candidates[Math.floor(Math.random() * candidates.length)];
    const newMeal = [...currentMeal];
    newMeal[idx] = newItem;
    const newPlan = { ...mealPlan, [mealType]: newMeal };
    setMealPlan(newPlan);
  };

  const generateAIPrescription = async () => {
    if (!user || !mealPlan) return;
    setIsGenerating(true);
    setShowPrescriptionModal(true);

    try {
      const systemPrompt = `You are a world-renowned clinical nutritionist and metabolic expert. Create a highly professional, medical-grade "Dietary Prescription & Lifestyle Guide" for your client based on the provided data. 
      Output ONLY valid JSON matching this exact structure:
      {
        "assessment": "Detailed 2-3 sentence clinical assessment...",
        "guidelines": ["Guideline 1", "Guideline 2", "Guideline 3", "Guideline 4", "Guideline 5"],
        "supplements": ["Supplement 1 with dosage", "Supplement 2 with dosage", "Supplement 3 with dosage"],
        "warnings": ["Warning 1", "Warning 2"]
      }`;

      const userPrompt = `Client Name: ${user.name}
      Age: ${user.age}, Height: ${user.height}cm, Weight: ${user.weight}kg, Gender: ${user.gender}
      Primary Goal: ${user.goal}
      Caloric Target: ${targetCalories} kcal/day
      Diet Preference: ${user.dietPref || 'None'}
      Medical Conditions: ${user.diseases.join(', ') || 'None'}
      Allergies: ${user.allergies.join(', ') || 'None'}
      
      Prescribed Meals:
      Morning: ${mealPlan.Morning.map(m => m.name).join(', ')}
      Afternoon: ${mealPlan.Afternoon.map(m => m.name).join(', ')}
      Night: ${mealPlan.Night.map(m => m.name).join(', ')}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
          maxOutputTokens: 1500,
          responseMimeType: 'application/json'
        }
      });

      const jsonOutput = response.text || '';
      try {
        const data = JSON.parse(jsonOutput);
        setAiPrescription(data);
      } catch (parseError) {
        console.error("Failed to parse JSON", parseError);
        setAiPrescription(null);
      }
    } catch (error) {
      console.error("Failed to generate prescription", error);
      setAiPrescription(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-pink-500/30 overflow-x-hidden">

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-600/10 blur-[120px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 print:hidden">

        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
            OptimalDiet.ai
          </div>
          {user && authMode === null && onboardingStep === 4 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-orange-500/10 text-orange-400 px-3 py-1.5 rounded-full border border-orange-500/20">
                <Flame size={16} className={user.streak && user.streak > 0 ? "text-orange-500 fill-orange-500" : "text-orange-500"} />
                <span className="text-sm font-bold">{user.streak || 0} Day Streak</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-full border border-white/5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-300">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-white transition-colors">
                Logout
              </button>
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">

          {/* Auth Screens */}
          {authMode === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto mt-20 bg-slate-900/50 p-8 rounded-3xl border border-white/10"
            >
              <button
                onClick={() => setAuthMode(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
              >
                <ArrowLeft size={20} /> Back
              </button>
              <h2 className="text-3xl font-bold mb-6 text-center">Welcome Back</h2>
              {authError && <div className="bg-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-sm text-center">{authError}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Enter your username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Enter your password"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-xl transition-colors mt-4"
                >
                  Log In
                </button>
              </form>
              <p className="text-center text-slate-400 mt-6 text-sm">
                Don't have an account?{' '}
                <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} className="text-indigo-400 hover:text-indigo-300 font-medium">
                  Sign up
                </button>
              </p>
            </motion.div>
          )}

          {authMode === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto mt-20 bg-slate-900/50 p-8 rounded-3xl border border-white/10"
            >
              <button
                onClick={() => setAuthMode(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
              >
                <ArrowLeft size={20} /> Back
              </button>
              <h2 className="text-3xl font-bold mb-6 text-center">Create Account</h2>
              {authError && <div className="bg-red-500/20 text-red-400 p-3 rounded-xl mb-4 text-sm text-center">{authError}</div>}
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Choose a username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Choose a password"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-colors mt-4"
                >
                  Create Account
                </button>
              </form>
              <p className="text-center text-slate-400 mt-6 text-sm">
                Already have an account?{' '}
                <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-indigo-400 hover:text-indigo-300 font-medium">
                  Log in
                </button>
              </p>
            </motion.div>
          )}

          {/* Welcome Screen */}
          {authMode === null && onboardingStep === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto text-center mt-20"
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
                Your Personal <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  AI Nutritionist
                </span>
              </h1>
              <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
                Get a medically-tailored, AI-generated diet plan and clinical prescription based on your unique metabolic profile.
              </p>
              <button
                onClick={handleStart}
                className="bg-white text-slate-950 px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              >
                Start Assessment
              </button>
            </motion.div>
          )}

          {/* Onboarding Step 1: Basic Stats */}
          {authMode === null && onboardingStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-xl mx-auto bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
            >
              <button
                onClick={() => setOnboardingStep(0)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
              >
                <ArrowLeft size={20} /> Back
              </button>
              <h2 className="text-3xl font-bold mb-2">Personal Stats</h2>
              <p className="text-slate-400 mb-8">Let's calculate your metabolic rate.</p>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" placeholder="John Doe" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Age</label>
                    <input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: Number(e.target.value) })} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Weight (kg)</label>
                    <input type="number" value={formData.weight} onChange={e => setFormData({ ...formData, weight: Number(e.target.value) })} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Height (cm)</label>
                    <input type="number" value={formData.height} onChange={e => setFormData({ ...formData, height: Number(e.target.value) })} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <button onClick={handleNext} disabled={!formData.name} className="w-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold py-4 rounded-xl mt-4 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                  Next Step <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Onboarding Step 2: Health Profile */}
          {authMode === null && onboardingStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-xl mx-auto bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
            >
              <h2 className="text-3xl font-bold mb-2">Health Profile</h2>
              <p className="text-slate-400 mb-8">Select any existing conditions.</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { id: 'diabetes', label: 'Diabetes' },
                  { id: 'bp', label: 'Hypertension' },
                  { id: 'heart', label: 'Heart Condition' },
                  { id: 'none', label: 'None / Healthy' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => toggleArrayItem('diseases', opt.id)}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${(opt.id === 'none' && formData.diseases?.length === 0) || formData.diseases?.includes(opt.id)
                        ? 'bg-indigo-500/20 border-indigo-500 text-white'
                        : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${(opt.id === 'none' && formData.diseases?.length === 0) || formData.diseases?.includes(opt.id)
                        ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                      }`}>
                      {((opt.id === 'none' && formData.diseases?.length === 0) || formData.diseases?.includes(opt.id)) && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <span className="font-medium text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Activity Level</label>
                  <select value={formData.activity} onChange={e => setFormData({ ...formData, activity: e.target.value as any })} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500">
                    <option value="sedentary">Sedentary (Office Job)</option>
                    <option value="lightly active">Lightly Active (1-3 days)</option>
                    <option value="moderately active">Moderately Active (3-5 days)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Goal</label>
                  <select value={formData.goal} onChange={e => setFormData({ ...formData, goal: e.target.value as any })} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500">
                    <option value="lose">Lose Weight (-500 kcal)</option>
                    <option value="maintain">Maintain Weight</option>
                    <option value="gain">Build Muscle (+500 kcal)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={handlePrev} className="w-1/3 bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                  <ChevronLeft size={20} /> Back
                </button>
                <button onClick={handleNext} className="w-2/3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  Next Step <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Onboarding Step 3: Allergies */}
          {authMode === null && onboardingStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-xl mx-auto bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
            >
              <h2 className="text-3xl font-bold mb-2">Final Touches</h2>
              <p className="text-slate-400 mb-8">Any allergies or dietary preferences?</p>

              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Allergies</label>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { id: 'gluten', label: 'Gluten (Wheat)' },
                  { id: 'lactose', label: 'Lactose (Dairy)' },
                  { id: 'nut', label: 'Nuts' },
                  { id: 'egg', label: 'Eggs' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => toggleArrayItem('allergies', opt.id)}
                    className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${formData.allergies?.includes(opt.id)
                        ? 'bg-pink-500/20 border-pink-500 text-white'
                        : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/20'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.allergies?.includes(opt.id) ? 'border-pink-500 bg-pink-500' : 'border-slate-600'
                      }`}>
                      {formData.allergies?.includes(opt.id) && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <span className="font-medium text-sm">{opt.label}</span>
                  </button>
                ))}
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Diet Preference</label>
                <select value={formData.dietPref} onChange={e => setFormData({ ...formData, dietPref: e.target.value as any })} className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500">
                  <option value="both">Veg & Non-Veg</option>
                  <option value="veg">Veg Only</option>
                  <option value="nonveg">Non-Veg Only</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button onClick={handlePrev} className="w-1/3 bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                  <ChevronLeft size={20} /> Back
                </button>
                <button onClick={calculatePlan} className="w-2/3 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                  Generate Plan ✨
                </button>
              </div>
            </motion.div>
          )}

          {/* Dashboard */}
          {authMode === null && onboardingStep === 4 && user && mealPlan && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-5xl mx-auto"
            >
              <button
                onClick={() => {
                  setOnboardingStep(0);
                  setUser(null);
                  setMealPlan(null);
                  setFormData({
                    name: '', age: 25, weight: 70, height: 175, gender: 'male',
                    activity: 'moderately active', goal: 'maintain',
                    diseases: [], allergies: [], dietPref: 'both'
                  });
                }}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
              >
                <ArrowLeft size={20} /> Back to Start
              </button>
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400">
                    <Flame size={32} />
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{targetCalories}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Calories</div>
                  </div>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Activity size={32} />
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{Math.round(user.weight * 2)}g</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Protein Target</div>
                  </div>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Droplet size={32} />
                  </div>
                  <div>
                    <div className="text-3xl font-bold">3.5L</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Water Intake</div>
                  </div>
                </div>
              </div>

              {/* Meals & Prescription Action */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Meals Column */}
                <div className="lg:col-span-2 space-y-6">
                  <h2 className="text-2xl font-bold mb-4">Your Daily Meals</h2>
                  {['Morning', 'Afternoon', 'Night'].map((mealTime) => (
                    <div key={mealTime} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                      <h3 className="text-lg font-bold mb-4 text-indigo-300">{mealTime}</h3>
                      <div className="space-y-3">
                        {mealPlan[mealTime as keyof MealPlan].map((food, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-slate-800/50 p-4 rounded-2xl border border-white/5 hover:border-indigo-500/50 hover:bg-slate-800 transition-all group"
                          >
                            <div
                              className="flex items-center gap-4 flex-1 cursor-pointer"
                              onClick={() => setSelectedRecipe({ name: food.name, recipe: RECIPE_DB[food.name as keyof typeof RECIPE_DB], mealType: mealTime, cal: food.cal })}
                            >
                              <img
                                src={`https://tse2.mm.bing.net/th?q=${encodeURIComponent(food.name + ' delicious healthy food high resolution professional photography')}&w=500&h=400&c=7&rs=1`}
                                alt={food.name}
                                loading="lazy"
                                onLoad={e => (e.currentTarget.classList.add('loaded'))}
                                className="img-fade w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">{food.name}</div>
                                <div className="text-xs text-slate-500 mt-1">{food.cal} kcal • {food.time} • Serving: ~{Math.floor(food.cal * 0.8)}g</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2 shrink-0">
                              <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${food.diet === 'veg' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                {food.diet}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); swapFoodItem(mealTime, idx); }}
                                title="Suggest a different item"
                                className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors whitespace-nowrap"
                              >
                                ↻ Change
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Prescription Column */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-indigo-900/80 to-pink-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                    <FileText size={48} className="mx-auto text-pink-300 mb-6" />
                    <h3 className="text-2xl font-bold mb-2">Clinical Prescription</h3>
                    <p className="text-sm text-indigo-200 mb-8">
                      Generate a medical-grade PDF prescription tailored to your metabolic profile.
                    </p>
                    <button
                      onClick={generateAIPrescription}
                      className="w-full bg-white text-slate-950 font-bold py-4 rounded-xl hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
                    >
                      <FileText size={18} /> Generate PDF
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Prescription Modal (Preview) */}
      <AnimatePresence>
        {showPrescriptionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md print:hidden"
          >
            <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <FileText className="text-pink-500" /> Prescription Preview
              </h2>
              <div className="flex items-center gap-4">
                <button onClick={() => setShowPrescriptionModal(false)} className="text-slate-400 hover:text-white transition-colors px-4 py-2 font-medium">
                  Cancel
                </button>
                <button
                  onClick={handlePrint}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Download size={18} /> Print / Save PDF
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 my-auto">
                  <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-6" />
                  <p className="text-lg font-medium">Analyzing metabolic profile...</p>
                  <p className="text-sm mt-2">Crafting your clinical prescription.</p>
                </div>
              ) : aiPrescription ? (
                <div className="w-full max-w-[210mm] bg-white text-black rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 overflow-hidden relative">
                  <PrescriptionPDF user={user} mealPlan={mealPlan} targetCalories={targetCalories} data={aiPrescription} />
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipe Modal */}
      <AnimatePresence>
        {selectedRecipe && selectedRecipe.recipe && (() => {
          const dailyTarget = targetCalories || 2000;
          const currentMeal = selectedRecipe.mealType || 'Morning';

          let ratio = 0.3;
          if (currentMeal === 'Morning') ratio = 0.25;
          if (currentMeal === 'Afternoon') ratio = 0.40;
          if (currentMeal === 'Night') ratio = 0.35;

          const mealTarget = Math.round(dailyTarget * ratio);
          const servingGrams = estimateServingGrams(selectedRecipe.name);
          const servingsNeeded = (mealTarget / selectedRecipe.cal).toFixed(1);
          const totalGrams = Math.round(Number(servingsNeeded) * servingGrams);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm print:hidden"
              onClick={() => setSelectedRecipe(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                <div className="relative h-48 w-full bg-slate-800 shrink-0">
                  <img
                    src={`https://tse2.mm.bing.net/th?q=${encodeURIComponent(selectedRecipe.name + ' delicious healthy food high resolution professional photography')}&w=500&h=400&c=7&rs=1`}
                    alt={selectedRecipe.name}
                    loading="lazy"
                    onLoad={e => (e.currentTarget.classList.add('loaded'))}
                    className="img-fade w-full h-full object-cover opacity-80"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  <button onClick={() => setSelectedRecipe(null)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 p-2 rounded-full backdrop-blur-md transition-colors">
                    <X size={24} />
                  </button>
                  <div className="absolute bottom-6 left-6 right-6">
                    <h2 className="text-2xl font-bold text-white mb-2 shadow-sm">
                      {selectedRecipe.name}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
                        {selectedRecipe.cal} kcal/serving
                      </span>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedRecipe.name + ' healthy recipe')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 backdrop-blur-md hover:bg-rose-500/40 transition-colors flex items-center gap-1"
                      >
                        ▶ Watch on YouTube
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-8 overflow-y-auto flex-1 space-y-8">
                  {/* PORTION GUIDE SECTION */}
                  <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-blue-400 text-sm uppercase tracking-wider font-bold">Target & Serving Size</h3>
                      <span className="text-xs text-slate-400">Calorie Target for {currentMeal}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-2xl font-bold text-white leading-tight">
                          <span className="text-pink-400">{servingsNeeded}</span> Servings
                        </div>
                        <div className="text-sm text-slate-400">
                          Total <span className="text-white font-bold">{totalGrams}</span>g to reach <span className="text-white font-bold">{mealTarget}</span> kcal
                        </div>
                      </div>
                      <div className="text-right text-sm bg-white/5 p-2 px-3 rounded-xl">
                        <div>1 Serving =</div>
                        <div className="font-bold text-white text-lg">{servingGrams}g</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Ingredients</h3>
                    <ul className="grid grid-cols-2 gap-3">
                      {selectedRecipe.recipe.ing.map((ingredient: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Preparation Steps</h3>
                    <div className="space-y-4">
                      {selectedRecipe.recipe.step.map((step: string, i: number) => (
                        <div key={i} className="flex gap-4 items-start">
                          <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                            {i + 1}
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* AI Chatbot */}
      {authMode === null && onboardingStep === 4 && (
        <Chatbot userProfile={user} mealPlan={mealPlan} />
      )}

      {/* Hidden Printable Prescription (Only visible during window.print()) */}
      {user && mealPlan && aiPrescription && (
        <div className="hidden print:block absolute inset-0 bg-white text-black z-[100]">
          <PrescriptionPDF user={user} mealPlan={mealPlan} targetCalories={targetCalories} data={aiPrescription} />
        </div>
      )}

    </div>
  );
}
