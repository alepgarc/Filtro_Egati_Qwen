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
      title: '1. Enviar planilha',
      subtitle: 'Upload de arquivo XLSX até 100 MB',
      icon: UploadCloud,
    },
    {
      step: 2 as Step,
      title: '2. Selecionar colunas',
      subtitle: 'Escolha a aba e colunas para remover',
      icon: CheckSquare,
    },
    {
      step: 3 as Step,
      title: '3. Baixar arquivo processado',
      subtitle: 'Resumo e download da nova planilha',
      icon: Download,
    },
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {steps.map((item, idx) => {
          const isCompleted = currentStep > item.step;
          const isCurrent = currentStep === item.step;
          const isClickable = canNavigateToStep ? canNavigateToStep(item.step) : false;
          const IconComponent = item.icon;

          return (
            <div
              key={item.step}
              onClick={() => isClickable && onStepClick && onStepClick(item.step)}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-emerald-50/80 border border-emerald-300 text-emerald-950'
                  : isCompleted
                  ? 'bg-slate-50 border border-slate-200/90 text-slate-800 cursor-pointer hover:bg-slate-100'
                  : 'bg-slate-50/50 border border-transparent text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold transition-colors ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <IconComponent className="w-3.5 h-3.5" />}
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">
                  {item.title}
                </div>
                <div className={`text-[10px] truncate ${isCurrent ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {item.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
