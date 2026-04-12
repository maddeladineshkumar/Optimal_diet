import React from 'react';
import { UserProfile, MealPlan, AIPrescriptionData } from '../types';
import { Stethoscope, Activity, FileText, AlertTriangle, PlaySquare } from 'lucide-react';

interface PrescriptionPDFProps {
  user: UserProfile;
  mealPlan: MealPlan;
  targetCalories: number;
  data: AIPrescriptionData;
}

export default function PrescriptionPDF({ user, mealPlan, targetCalories, data }: PrescriptionPDFProps) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const bmi = (user.weight / Math.pow(user.height / 100, 2)).toFixed(1);
  const bmiNum = Number(bmi);
  const bmiCategory = bmiNum < 18.5 ? "Underweight" : bmiNum < 25 ? "Normal" : bmiNum < 30 ? "Overweight" : "Obese";

  // Dummy ID
  const id = `9CVQEM67-1938`; // Hardcoded to match the photo ID for exactly matching.

  const renderMealColumn = (mealType: string, meals: any[]) => {
    return (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
        <div className="bg-slate-50 border-b border-slate-200 text-center py-3 font-bold text-slate-600 tracking-wider text-sm uppercase">
          {mealType}
        </div>
        <div className="p-4 space-y-4 flex-1">
          {meals.map((food, idx) => (
            <div key={idx} className="flex gap-4 items-start">
              <img
                src={`https://tse2.mm.bing.net/th?q=${encodeURIComponent(food.name + ' delicious healthy food high resolution professional photography')}&w=500&h=400&c=7&rs=1`}
                alt={food.name}
                loading="lazy"
                onLoad={e => (e.currentTarget.classList.add('loaded'))}
                className="img-fade w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-sm leading-tight">{food.name}</div>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-xs text-slate-500">Serving: ~{Math.floor(food.cal * 0.8)}g</span>
                  <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px] border border-slate-200">
                    {food.cal} kcal
                  </span>
                </div>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(food.name + ' healthy recipe')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 mt-1.5 transition-colors"
                >
                  <PlaySquare size={12} className="text-blue-500" /> Watch Recipe Video
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full bg-white text-slate-900 font-sans selection:bg-blue-100">
      
      {/* This fixed div repeats on every printed page via CSS */}
      <div className="prescription-page-border hidden" />
      
      <div className="relative z-10 p-6">
        
        {/* Header */}
        <header className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-md">
              <Stethoscope size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-serif font-black text-slate-900 tracking-tight leading-none mb-1">
                OPTIMAL DIET
                <br />
                CLINIC
              </h1>
              <div className="text-[13px] font-bold text-slate-500 tracking-widest uppercase mt-2">
                Official Clinical Prescription
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 leading-relaxed mb-3 font-medium">
              123 Wellness Avenue, Health District<br />
              contact@optimaldiet.ai | +1 (555) 019-8273
            </div>
            <div className="inline-block bg-slate-100 text-slate-800 px-4 py-1.5 font-bold rounded text-[13px]">
              Date: <span className="font-bold">{today}</span>
            </div>
          </div>
        </header>

        <hr className="border-t border-slate-900 mb-8" />

        {/* Prescription Metadata / Document ID */}
        <div className="relative flex justify-between items-center mb-6">
          <div className="text-slate-200 text-[120px] font-serif italic font-bold select-none z-0 tracking-tighter leading-none -ml-4">
            Rx
          </div>
          <div className="text-right flex-1 pt-12">
            <div className="text-[#849fb4] font-bold tracking-widest text-[13px] uppercase">Certificate of Dietary Regimen</div>
            <div className="text-[#849fb4] text-[10px] font-mono mt-1 font-bold">ID: {id}</div>
          </div>
        </div>

        {/* Patient Information Box */}
        <div className="bg-white border border-[#e2e8f0] border-l-[6px] border-l-[#1e293b] rounded p-6 relative z-10 mb-10 shadow-sm">
          <div className="uppercase tracking-widest text-[#7b8eaf] font-bold text-[11px] mb-5">Patient Information</div>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-[10px] text-[#869cb8] font-bold tracking-wider mb-1 uppercase">Name</div>
              <div className="text-slate-900 font-bold text-[15px]">{user.name}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#869cb8] font-bold tracking-wider mb-1 uppercase">Age / Sex</div>
              <div className="text-slate-900 font-bold text-[15px]">{user.age} Y / {user.gender === 'male' ? 'M' : 'F'}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#869cb8] font-bold tracking-wider mb-1 uppercase">Vitals</div>
              <div className="text-slate-900 font-bold text-[15px]">{user.weight} kg | {user.height} cm</div>
            </div>
            <div>
              <div className="text-[10px] text-[#869cb8] font-bold tracking-wider mb-1 uppercase">BMI</div>
              <div className="text-slate-900 font-bold text-[15px]">{bmi} <span className="text-sm font-semibold">({bmiCategory})</span></div>
            </div>
          </div>
          
          <div className="border-t border-[#f1f5f9] pt-4 grid grid-cols-2 gap-4 mt-6">
            <div>
              <div className="text-[10px] text-[#869cb8] font-bold tracking-wider mb-1 uppercase">Medical Conditions</div>
              <div className="text-slate-600 font-medium text-[13px]">
                {user.diseases && user.diseases.length > 0 && !user.diseases.includes('none') 
                  ? user.diseases.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ') 
                  : 'None Reported'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#869cb8] font-bold tracking-wider mb-1 uppercase">Allergies</div>
              <div className="text-slate-600 font-medium text-[13px]">
                {user.allergies && user.allergies.length > 0 && !user.allergies.includes('none')
                  ? user.allergies.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ') 
                  : 'None Reported'}
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Assessment */}
        <div className="mb-12 page-break-after-auto">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-slate-600" size={24} />
            <h2 className="text-xl font-serif font-bold text-slate-900">Clinical Assessment</h2>
          </div>
          <blockquote className="border-l-4 border-[#e2e8f0] pl-6 py-2 bg-slate-50 relative">
            <p className="text-[#475569] font-serif italic text-[15px] leading-relaxed relative z-10">
              "{data.assessment}"
            </p>
          </blockquote>
        </div>

        {/* Dietary Regimen */}
        <div className="mb-8 mt-10" style={{ pageBreakInside: 'avoid' }}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-slate-900">Prescribed Dietary Regimen</h2>
            <div className="bg-[#1e293b] text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-sm">
              Target: {targetCalories} kcal/day
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            {renderMealColumn('Morning', mealPlan.Morning)}
            {renderMealColumn('Afternoon', mealPlan.Afternoon)}
            {renderMealColumn('Night', mealPlan.Night)}
          </div>
        </div>

        {/* Bottom Sections */}
        <div className="grid grid-cols-2 gap-10 mt-6" style={{ pageBreakInside: 'avoid' }}>
          
          {/* Guidelines */}
          <div>
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Clinical Guidelines</h2>
            <ul className="space-y-4">
              {data.guidelines.map((guide, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b] mt-2 shrink-0 opacity-60" />
                  <span className="text-[13px] text-slate-700 leading-relaxed font-medium">{guide}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Supplements & Warnings */}
          <div className="flex flex-col">
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Recommended Supplements</h2>
            <ul className="space-y-4 mb-6">
              {data.supplements.map((supp, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e293b] mt-2 shrink-0 opacity-60" />
                  <span className="text-[13px] text-slate-700 leading-relaxed font-bold">{supp}</span>
                </li>
              ))}
            </ul>

            {data.warnings && data.warnings.length > 0 && (
              <div className="mt-auto bg-[#fff1f2] border border-[#fecdd3] border-l-[3px] border-l-[#e11d48] rounded-lg p-4">
                <div className="text-[#be123c] font-bold text-[11px] tracking-widest uppercase mb-3 flex items-center gap-2">
                  CONTRAINDICATIONS / WARNINGS
                </div>
                <ul className="space-y-2">
                  {data.warnings.map((warn, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[12px] text-[#9f1239] leading-relaxed">
                      <span className="text-[#f43f5e] font-sans">⚠</span> {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
        </div>

      </div>
    </div>
  );
}
