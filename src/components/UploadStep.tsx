import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Layers,
  Waves,
  Milestone,
  CircleDot,
  Paintbrush,
  Grid3X3,
  Shield,
  FileCode2,
} from 'lucide-react';
import { UploadResponse, DrainageFeatureType } from '../types';
import { DRAINAGE_FEATURES } from '../constants/presets';
import { getAreaIdentifier } from '../utils/fileNaming';

interface UploadStepProps {
  selectedFeature: DrainageFeatureType;
  onFeatureChange: (feature: DrainageFeatureType) => void;
  parcialNumber: string;
  onParcialChange: (parcial: string) => void;
  onUploadSuccess: (data: UploadResponse) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  selectedFeature,
  onFeatureChange,
  parcialNumber,
  onParcialChange,
  onUploadSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state and file input on mount or feature change
  useEffect(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatusText('');
    setErrorMessage(null);
    setSelectedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedFeature]);

  // Prevent browser from opening files dragged outside the dropzone
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);
    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateAndUpload = async (file: File) => {
    setErrorMessage(null);

    // 1. Validate file extension (.xlsx or .xls)
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setErrorMessage('Formato inválido! Por favor, selecione um arquivo Excel com extensão .xlsx ou .xls.');
      return;
    }

    // 2. Validate file size (600 MB maximum for high-resolution photo spreadsheets)
    const MAX_SIZE = 600 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage(
        `O arquivo ultrapassa o limite de 600 MB (${formatFileSize(file.size)}). Envie uma planilha de até 500-600 MB.`
      );
      return;
    }

    const CHUNK_SIZE = 8 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    setSelectedFileName(file.name);
    setIsUploading(true);
    setUploadProgress(5);
    setUploadStatusText(
      totalChunks > 1
        ? `Preparando envio seguro em ${totalChunks} blocos...`
        : 'Enviando arquivo para o servidor...'
    );

    const keepAliveTimer = setInterval(() => {
      fetch('/api/health', { credentials: 'include' }).catch(() => {});
    }, 20000);

    try {
      let finalData: UploadResponse | null = null;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const isLastChunk = chunkIndex === totalChunks - 1;

        if (totalChunks > 1) {
          setUploadStatusText(
            isLastChunk
              ? `Enviando bloco final ${chunkIndex + 1} de ${totalChunks}...`
              : `Enviando bloco ${chunkIndex + 1} de ${totalChunks} (${formatFileSize(end)} de ${formatFileSize(file.size)})...`
          );
        }

        let attempts = 0;
        let success = false;
        let lastError: Error | null = null;

        while (attempts < 6 && !success) {
          attempts++;

          if (attempts > 1) {
            try {
              const statusRes = await fetch(`/api/upload-status/${uploadId}`, { credentials: 'include' });
              if (statusRes.ok) {
                const statusJson = await statusRes.json();
                if (Array.isArray(statusJson.parts) && statusJson.parts.includes(chunkIndex)) {
                  success = true;
                  break;
                }
              }
            } catch {}
          }

          const chunkBlob = file.slice(start, end);
          const formData = new FormData();
          formData.append('chunk', chunkBlob, file.name);
          formData.append('chunkIndex', String(chunkIndex));
          formData.append('totalChunks', String(totalChunks));
          formData.append('uploadId', uploadId);
          formData.append('fileName', file.name);
          formData.append('featureType', selectedFeature);

          try {
            const chunkRes = await new Promise<any>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', '/api/upload-chunk', true);
              xhr.withCredentials = true;
              xhr.timeout = isLastChunk ? 10 * 60 * 1000 : 4 * 60 * 1000;

              xhr.upload.onprogress = (evt) => {
                if (evt.lengthComputable) {
                  const chunkFraction = evt.loaded / evt.total;
                  const overallPercent = Math.min(
                    95,
                    Math.round(((chunkIndex + chunkFraction) / totalChunks) * 95)
                  );
                  setUploadProgress(Math.max(5, overallPercent));
                }
              };

              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    const resJson = JSON.parse(xhr.responseText);
                    resolve(resJson);
                  } catch (e) {
                    resolve({ status: 'ok' });
                  }
                } else {
                  try {
                    const resJson = JSON.parse(xhr.responseText);
                    reject(new Error(resJson.error || `Erro HTTP ${xhr.status} no servidor.`));
                  } catch {
                    reject(new Error(`Erro no servidor (${xhr.status}).`));
                  }
                }
              };

              xhr.onerror = () => {
                reject(
                  new Error(
                    `Falha de conexão com o servidor ao enviar o bloco ${chunkIndex + 1} de ${totalChunks}.`
                  )
                );
              };

              xhr.ontimeout = () => {
                reject(
                  new Error(
                    `Tempo limite excedido ao enviar o bloco ${chunkIndex + 1} de ${totalChunks}.`
                  )
                );
              };

              xhr.send(formData);
            });

            success = true;
            if (isLastChunk) {
              finalData = chunkRes;
            }
          } catch (chunkErr: any) {
            lastError = chunkErr;
            if (attempts < 6) {
              setUploadStatusText(
                `Reconectando bloco ${chunkIndex + 1}/${totalChunks} (tentativa ${attempts + 1}/6)...`
              );
              try {
                await fetch('/api/health', { credentials: 'include' });
              } catch {}
              await new Promise((r) => setTimeout(r, Math.min(5000, attempts * 1200)));
            }
          }
        }

        if (!success) {
          throw (
            lastError ||
            new Error(
              `Falha ao enviar o bloco ${chunkIndex + 1} de ${totalChunks} após tentativas de conexão.`
            )
          );
        }
      }

      setUploadStatusText('Planilha recebida! Analisando abas e colunas...');
      setUploadProgress(98);

      if (finalData && finalData.fileId) {
        setUploadProgress(100);
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        finalData.featureType = selectedFeature;
        onUploadSuccess(finalData);
      } else {
        throw new Error((finalData as any)?.error || 'Erro ao processar estrutura da planilha.');
      }
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setErrorMessage(err.message || 'Erro durante o envio da planilha.');
    } finally {
      clearInterval(keepAliveTimer);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndUpload(file);
    }
    e.target.value = '';
  };

  const featureOptions: {
    id: DrainageFeatureType;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'drenagem_profunda', label: 'Drenagem Profunda', shortLabel: 'Drenagem Profunda', icon: Layers },
    { id: 'drenagem_superficial', label: 'Drenagem Superficial', shortLabel: 'Drenagem Superficial', icon: Waves },
    { id: 'sinalizacao_vertical', label: 'Sinalização Vertical', shortLabel: 'Sinaliz. Vertical', icon: Milestone },
    { id: 'sinalizacao_horizontal_dispositivo', label: 'SH - Dispositivo', shortLabel: 'SH Dispositivo', icon: CircleDot },
    { id: 'sinalizacao_horizontal_marca_viaria', label: 'SH - Marca Viária', shortLabel: 'SH Marca Viária', icon: Paintbrush },
    { id: 'sinalizacao_horizontal_zebrado', label: 'SH - Zebrado', shortLabel: 'SH Zebrado', icon: Grid3X3 },
    { id: 'eps_defensa', label: 'EPS - Defensa', shortLabel: 'EPS Defensa', icon: Shield },
  ];

  const currentFeatureConfig = DRAINAGE_FEATURES[selectedFeature];

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full py-2">
      {/* 1. Control Card: Mode & Parcial Selection with Clean Wrap */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Selecione a Feature de Processamento:
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-500 font-semibold">Parcial:</span>
              <select
                id="parcial-select-dropdown"
                value={parcialNumber}
                onChange={(e) => onParcialChange(e.target.value)}
                className="font-bold text-emerald-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>
                    Parcial {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Feature Mode Selector: Clean flex-wrap with NO scrollbar */}
        <div className="flex flex-wrap items-center gap-2">
          {featureOptions.map((opt) => {
            const isSelected = selectedFeature === opt.id;
            const IconComponent = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onFeatureChange(opt.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer select-none border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Feature Summary & File naming preview */}
        <div className="text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <span>
            <strong className="text-slate-800 font-semibold">{currentFeatureConfig.name}:</strong> Seleção padrão configurada com <strong>{currentFeatureConfig.fields.length} campos</strong>.
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md self-start sm:self-auto">
            <FileCode2 className="w-3 h-3 text-emerald-600" />
            Parcial {parcialNumber || '1'}{getAreaIdentifier(selectedFeature) || '_'}BR-369.xlsx
          </span>
        </div>
      </div>

      {/* 2. Drag & Drop Upload Zone (Balanced height with comfortable padding) */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed py-8 sm:py-10 px-6 text-center transition-all bg-white flex flex-col items-center justify-center cursor-pointer select-none relative shadow-2xs ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/50 scale-[1.005]'
            : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/60'
        } ${isUploading ? 'pointer-events-none opacity-90' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isUploading}
        />

        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-2xs pointer-events-none">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 tracking-tight pointer-events-none">
          {isUploading ? 'Enviando e analisando planilha...' : `Enviar planilha de ${currentFeatureConfig.name}`}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto pointer-events-none">
          Arraste o arquivo <strong className="text-slate-700 font-semibold">.xlsx</strong> ou clique para selecionar do seu computador.
        </p>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mt-4 w-full max-w-sm mx-auto space-y-1.5 pointer-events-none">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="truncate">{selectedFileName || 'Processando arquivo...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium animate-pulse">
              {uploadStatusText || 'Analisando abas e colunas...'}
            </p>
          </div>
        )}

        {/* Badges */}
        {!isUploading && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-md font-medium text-slate-700 text-[11px]">
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              Arquivos .xlsx e .xls (Até 500 MB)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-md font-medium text-slate-700 text-[11px]">
              Preservação total de fotos e integridade
            </span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold">Atenção</h4>
            <p className="text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
