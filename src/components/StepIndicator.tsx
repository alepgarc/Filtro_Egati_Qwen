import React from 'react';
import { UploadCloud, CheckSquare, Download, Check } from 'lucide-react';
import { Step } from '../types';

interface StepIndicatorProps {
  currentStep: Step;
  onStepClick?: (step: Step) => void;
  canNavigateToStep?: (step: Step) => boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onStepClick,
  canNavigateToStep,
}) => {
  const steps = [
    {
      step: 1 as Step,
      title: '1. Enviar Planilha',
      icon: UploadCloud,
    },
    {
      step: 2 as Step,
      title: '2. Configurar & Filtrar',
      icon: CheckSquare,
    },
    {
      step: 3 as Step,
      title: '3. Baixar Resultados',
      icon: Download,
    },
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs shrink-0">
      <div className="grid grid-cols-3 gap-1.5">
        {steps.map((item) => {
          const isCompleted = currentStep > item.step;
          const isCurrent = currentStep === item.step;
          const isClickable = canNavigateToStep ? canNavigateToStep(item.step) : false;
          const IconComponent = item.icon;

          return (
            <button
              key={item.step}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick && onStepClick(item.step)}
              className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all select-none ${
                isCurrent
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs'
                  : isCompleted
                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 cursor-pointer'
                  : 'text-slate-400 border border-transparent cursor-not-allowed opacity-60'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : <IconComponent className="w-3 h-3" />}
              </div>
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
