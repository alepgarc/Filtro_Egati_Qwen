/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { StepIndicator } from './components/StepIndicator';
import { UploadStep } from './components/UploadStep';
import { ColumnSelectionStep } from './components/ColumnSelectionStep';
import { DownloadStep } from './components/DownloadStep';
import { Step, UploadResponse, ProcessResponse, DrainageFeatureType } from './types';

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedFeature, setSelectedFeature] = useState<DrainageFeatureType>('drenagem_profunda');
  const [parcialNumber, setParcialNumber] = useState<string>('1');
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [processedResult, setProcessedResult] = useState<ProcessResponse | null>(null);

  const handleUploadSuccess = (data: UploadResponse) => {
    if (data.featureType) {
      setSelectedFeature(data.featureType);
    }
    setUploadData(data);
    setCurrentStep(2);
  };

  const handleProcessComplete = (result: ProcessResponse) => {
    setProcessedResult(result);
    setCurrentStep(3);
  };

  const handleBackToUpload = () => {
    if (uploadData?.fileId) {
      // fire and forget cleanup
      fetch(`/api/cleanup/${uploadData.fileId}`, { method: 'DELETE' }).catch(() => {});
    }
    setUploadData(null);
    setProcessedResult(null);
    setCurrentStep(1);
  };

  const handleBackToSelect = () => {
    setCurrentStep(2);
  };

  const handleReset = () => {
    if (uploadData?.fileId) {
      fetch(`/api/cleanup/${uploadData.fileId}`, { method: 'DELETE' }).catch(() => {});
    }
    setUploadData(null);
    setProcessedResult(null);
    setCurrentStep(1);
  };

  const canNavigateToStep = (step: Step) => {
    if (step === 1) return true;
    if (step === 2) return uploadData !== null;
    if (step === 3) return processedResult !== null;
    return false;
  };

  const handleStepClick = (step: Step) => {
    if (step === 1) {
      handleReset();
      return;
    }
    if (canNavigateToStep(step)) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="h-screen bg-slate-100/60 text-slate-800 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900 overflow-hidden">
      {/* Top Navigation / Brand Header */}
      <Header currentStep={currentStep} onReset={handleReset} />

      {/* Main Container - Single Screen Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-2.5 space-y-2.5 flex flex-col min-h-0 overflow-hidden">
        {/* Wizard Step Indicator - Compact */}
        <StepIndicator
          currentStep={currentStep}
          onStepClick={handleStepClick}
          canNavigateToStep={canNavigateToStep}
        />

        {/* Dynamic Content by Step */}
        <div className="flex-1 relative min-h-0 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="h-full flex flex-col min-h-0 overflow-y-auto lg:overflow-hidden"
              >
                <UploadStep
                  selectedFeature={selectedFeature}
                  onFeatureChange={setSelectedFeature}
                  parcialNumber={parcialNumber}
                  onParcialChange={setParcialNumber}
                  onUploadSuccess={handleUploadSuccess}
                />
              </motion.div>
            )}

            {currentStep === 2 && uploadData && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="h-full flex flex-col min-h-0"
              >
                <ColumnSelectionStep
                  uploadData={uploadData}
                  initialFeatureType={selectedFeature}
                  onFeatureChange={setSelectedFeature}
                  parcialNumber={parcialNumber}
                  onParcialChange={setParcialNumber}
                  onBackToUpload={handleBackToUpload}
                  onProcessComplete={handleProcessComplete}
                />
              </motion.div>
            )}

            {currentStep === 3 && processedResult && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="h-full flex flex-col justify-center min-h-0 overflow-y-auto"
              >
                <DownloadStep
                  result={processedResult}
                  onReset={handleReset}
                  onBackToSelect={handleBackToSelect}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer - Minimalist */}
      <footer className="border-t border-slate-200 bg-white py-1.5 shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center justify-between text-[10px] text-slate-500">
          <span>EPR Paraná • Processamento de Planilhas XLSX & PDF</span>
          <span className="text-slate-400">Integridade total de fotos e dados</span>
        </div>
      </footer>
    </div>
  );
}
