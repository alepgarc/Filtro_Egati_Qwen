import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Search,
  CheckSquare,
  Square,
  ArrowLeftRight,
  Filter,
  Route,
  Loader2,
  AlertTriangle,
  Zap,
  Eye,
  Table as TableIcon,
} from 'lucide-react';
import {
  UploadResponse,
  SheetDetails,
  ProcessResponse,
  DrainageFeatureType,
} from '../types';
import {
  DRAINAGE_FEATURES,
  isDefaultPresetField,
  normalizeColKey,
  matchesEstadoFilterFrontend,
  normalizeRodoviaForFeature,
} from '../constants/presets';
import { TurboModeModal } from './TurboModeModal';

const ESTADO_CONSERVACAO_OPTIONS = [
  { value: '', label: 'Todos os Estados' },
  { value: 'BOM', label: 'BOM' },
  { value: 'REGULAR', label: 'REGULAR' },
  { value: 'PRECÁRIO', label: 'PRECÁRIO' },
];

const RESULTADO_GERAL_OPTIONS = [
  { value: '', label: 'Todos os Resultados' },
  { value: 'APROVADO', label: 'APROVADO' },
  { value: 'REPROVADO', label: 'REPROVADO' },
];

const SINALIZACAO_RETRORREFLETANCIA_OPTIONS = [
  { value: '', label: 'Todas as Situações' },
  { value: 'APROVADO', label: 'APROVADO' },
  { value: 'REPROVADO', label: 'REPROVADO' },
];

const APARENCIA_GERAL_OPTIONS = [
  { value: '', label: 'Todas as Aparências' },
  { value: 'BOM', label: 'BOM' },
  { value: 'REGULAR', label: 'REGULAR' },
  { value: 'PRECÁRIO', label: 'PRECÁRIO' },
];

interface ColumnSelectionStepProps {
  uploadData: UploadResponse;
  initialFeatureType?: DrainageFeatureType;
  onFeatureChange?: (feature: DrainageFeatureType) => void;
  parcialNumber?: string;
  onParcialChange?: (parcial: string) => void;
  onBackToUpload: () => void;
  onProcessComplete: (result: ProcessResponse) => void;
}

export const ColumnSelectionStep: React.FC<ColumnSelectionStepProps> = ({
  uploadData,
  initialFeatureType = 'drenagem_profunda',
  onFeatureChange,
  parcialNumber = '1',
  onParcialChange,
  onBackToUpload,
  onProcessComplete,
}) => {
  // Feature type (mode)
  const [featureType, setFeatureType] = useState<DrainageFeatureType>(
    uploadData.featureType || initialFeatureType
  );

  // Active sheet name
  const [activeSheet, setActiveSheet] = useState<string>(
    uploadData.defaultSheet || uploadData.sheetNames[0] || ''
  );

  // Sheet details
  const [sheetDetails, setSheetDetails] = useState<SheetDetails>(uploadData.sheetDetails);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);

  // Set of 0-based column indices that the user wants to KEEP in the final file
  const [selectedForKeeping, setSelectedForKeeping] = useState<Set<number>>(new Set());

  // Filter state for row filtering
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [rodoviaFilter, setRodoviaFilter] = useState<string>('');

  // Search filter for columns
  const [searchQuery, setSearchQuery] = useState('');

  // Turbo Mode Modal state
  const [isTurboModeOpen, setIsTurboModeOpen] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Tab switch between Columns and Table on mobile viewports
  const [mobileTab, setMobileTab] = useState<'columns' | 'preview'>('columns');

  useEffect(() => {
    const target = uploadData.featureType || initialFeatureType;
    if (target && target !== featureType) {
      setFeatureType(target);
    }
  }, [uploadData.featureType, initialFeatureType]);

  // Auto-apply default preset columns on initial mount if not yet selected
  useEffect(() => {
    if (sheetDetails?.columns && sheetDetails.columns.length > 0) {
      setSelectedForKeeping((prev) => {
        if (prev.size > 0) return prev;
        const matchingIdxs = sheetDetails.columns
          .filter((col) => isDefaultPresetField(col.name, featureType))
          .map((col) => col.index);
        return new Set(matchingIdxs);
      });
    }
  }, [sheetDetails, featureType]);

  const featureConfig = DRAINAGE_FEATURES[featureType];

  // Switch sheet
  const handleSheetChange = async (newSheetName: string) => {
    if (newSheetName === activeSheet || isLoadingSheet) return;
    setIsLoadingSheet(true);
    setProcessingError(null);
    try {
      const res = await fetch(
        `/api/sheet-details/${uploadData.fileId}/${encodeURIComponent(newSheetName)}?featureType=${featureType}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao carregar detalhes da aba.');
      }
      const newDetails: SheetDetails = await res.json();
      setActiveSheet(newSheetName);
      setSheetDetails(newDetails);
      const matchingIdxs = newDetails.columns
        .filter((col) => isDefaultPresetField(col.name, featureType))
        .map((col) => col.index);
      setSelectedForKeeping(new Set(matchingIdxs));
      setEstadoFilter('');
      setRodoviaFilter('');
      setSearchQuery('');
    } catch (err: any) {
      setProcessingError(err.message || 'Falha ao trocar de aba.');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const handleFeatureSwitch = (newFeature: DrainageFeatureType) => {
    setFeatureType(newFeature);
    if (uploadData) {
      uploadData.featureType = newFeature;
    }
    if (onFeatureChange) {
      onFeatureChange(newFeature);
    }

    const matchingIdxs = sheetDetails.columns
      .filter((col) => isDefaultPresetField(col.name, newFeature))
      .map((col) => col.index);
    setSelectedForKeeping(new Set(matchingIdxs));
  };

  // Toggle keeping a single column
  const handleToggleColumn = (colIndex: number) => {
    setSelectedForKeeping((prev) => {
      const next = new Set(prev);
      if (next.has(colIndex)) {
        next.delete(colIndex);
      } else {
        next.add(colIndex);
      }
      return next;
    });
  };

  // Select all visible columns
  const handleSelectAllVisible = () => {
    setSelectedForKeeping((prev) => {
      const next = new Set(prev);
      filteredColumns.forEach((col) => next.add(col.index));
      return next;
    });
  };

  // Deselect all visible columns
  const handleDeselectAllVisible = () => {
    setSelectedForKeeping((prev) => {
      const next = new Set(prev);
      filteredColumns.forEach((col) => next.delete(col.index));
      return next;
    });
  };

  // Invert selection on visible columns
  const handleInvertVisible = () => {
    setSelectedForKeeping((prev) => {
      const next = new Set(prev);
      filteredColumns.forEach((col) => {
        if (next.has(col.index)) {
          next.delete(col.index);
        } else {
          next.add(col.index);
        }
      });
      return next;
    });
  };

  const presetMatchingIndices = useMemo(() => {
    return sheetDetails.columns
      .filter((col) => isDefaultPresetField(col.name, featureType))
      .map((col) => col.index);
  }, [sheetDetails.columns, featureType]);

  const matchedPresetCount = presetMatchingIndices.length;

  const isPresetActive = useMemo(() => {
    if (presetMatchingIndices.length === 0) return false;
    if (selectedForKeeping.size !== presetMatchingIndices.length) return false;
    return presetMatchingIndices.every((idx) => selectedForKeeping.has(idx));
  }, [presetMatchingIndices, selectedForKeeping]);

  const handleToggleDefaultPreset = () => {
    if (isPresetActive) {
      setSelectedForKeeping(new Set());
    } else {
      setSelectedForKeeping(new Set(presetMatchingIndices));
    }
  };

  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return sheetDetails.columns;
    const q = searchQuery.toLowerCase().trim();
    return sheetDetails.columns.filter(
      (col) =>
        col.name.toLowerCase().includes(q) ||
        col.letter.toLowerCase().includes(q) ||
        String(col.index + 1).includes(q)
    );
  }, [sheetDetails.columns, searchQuery]);

  const estadoColInfo = useMemo(() => {
    return sheetDetails.columns.find((col) => {
      const norm = normalizeColKey(col.name);
      if (
        featureType === 'sinalizacao_horizontal_dispositivo' ||
        featureType === 'sinalizacao_horizontal_zebrado'
      ) {
        return norm === 'resultadogeral' || norm === 'resultado' || norm === 'status';
      }
      if (featureType === 'sinalizacao_horizontal_marca_viaria') {
        return norm === 'resultado' || norm === 'resultadogeral' || norm === 'status';
      }
      if (featureType === 'sinalizacao_vertical') {
        return (
          norm === 'situacaoretrorrefletancia' ||
          norm === 'situacaoderetrorrefletancia' ||
          norm === 'situacaoretrorefletancia' ||
          norm === 'situacaoderetrorefletancia' ||
          norm === 'retrorrefletancia'
        );
      }
      return norm === 'estadoconservacao' || norm === 'estadodeconservacao';
    });
  }, [sheetDetails.columns, featureType]);

  const rodoviaColInfo = useMemo(() => {
    return sheetDetails.columns.find((col) => {
      const norm = normalizeColKey(col.name);
      return norm === 'rodovia' || norm === 'rodovias';
    });
  }, [sheetDetails.columns]);

  const rodoviaColRelativeIdx = useMemo(() => {
    if (!rodoviaColInfo || sheetDetails.columns.length === 0) return -1;
    return rodoviaColInfo.index - sheetDetails.columns[0].index;
  }, [rodoviaColInfo, sheetDetails.columns]);

  const availableRodovias = useMemo(() => {
    const set = new Set<string>();
    if (sheetDetails.rodoviaOptions && sheetDetails.rodoviaOptions.length > 0) {
      sheetDetails.rodoviaOptions.forEach((r) => {
        if (r && r.trim()) set.add(normalizeRodoviaForFeature(r.trim(), featureType));
      });
    } else if (rodoviaColRelativeIdx >= 0) {
      sheetDetails.previewRows.forEach((row) => {
        const val = String(row[rodoviaColRelativeIdx] || '').trim();
        if (val) set.add(normalizeRodoviaForFeature(val, featureType));
      });
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' })
    );
  }, [sheetDetails.rodoviaOptions, sheetDetails.previewRows, rodoviaColRelativeIdx, featureType]);

  const matchingRealRowsCount = useMemo(() => {
    if (!sheetDetails.rowFiltersData || sheetDetails.rowFiltersData.length === 0) {
      return sheetDetails.totalRows;
    }
    if (!estadoFilter && !rodoviaFilter) {
      return sheetDetails.totalRows;
    }
    return sheetDetails.rowFiltersData.filter((item) => {
      let matchesEstado = true;
      let matchesRodovia = true;

      if (estadoFilter) {
        matchesEstado = matchesEstadoFilterFrontend(item.e, estadoFilter);
      }

      if (rodoviaFilter) {
        const normItemRod = normalizeRodoviaForFeature(item.r, featureType);
        const normFilterRod = normalizeRodoviaForFeature(rodoviaFilter, featureType);
        matchesRodovia =
          normalizeColKey(normItemRod) === normalizeColKey(normFilterRod) ||
          normItemRod === normFilterRod ||
          normalizeColKey(item.r) === normalizeColKey(rodoviaFilter);
      }

      return matchesEstado && matchesRodovia;
    }).length;
  }, [estadoFilter, rodoviaFilter, sheetDetails.rowFiltersData, sheetDetails.totalRows, featureType]);

  const isHorizontalFeature =
    featureType === 'sinalizacao_horizontal_dispositivo' ||
    featureType === 'sinalizacao_horizontal_marca_viaria' ||
    featureType === 'sinalizacao_horizontal_zebrado';

  const activeStatusOptions =
    featureType === 'eps_defensa'
      ? APARENCIA_GERAL_OPTIONS
      : isHorizontalFeature
      ? RESULTADO_GERAL_OPTIONS
      : featureType === 'sinalizacao_vertical'
      ? SINALIZACAO_RETRORREFLETANCIA_OPTIONS
      : ESTADO_CONSERVACAO_OPTIONS;

  const totalColumns = sheetDetails.columns.length;
  const keptCount = selectedForKeeping.size;
  const removedCount = totalColumns - keptCount;

  // Process & generate filtered spreadsheet
  const handleProcessSpreadsheet = async () => {
    setProcessingError(null);

    if (keptCount === 0) {
      setProcessingError(
        'Todas as colunas estão marcadas para remoção. Selecione pelo menos 1 coluna que deseja manter.'
      );
      return;
    }

    setIsProcessing(true);

    const columnIndicesToRemove = sheetDetails.columns
      .filter((col) => !selectedForKeeping.has(col.index))
      .map((col) => col.index);

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: uploadData.fileId,
          sheetName: activeSheet,
          columnIndicesToRemove,
          estadoFilter: estadoFilter || undefined,
          rodoviaFilter: rodoviaFilter || undefined,
          featureType,
          originalFileName: uploadData.originalName,
          parcialNumber: parcialNumber || '1',
        }),
      });

      if (!res.ok) {
        let errMessage = 'Erro no processamento da planilha.';
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch {
          errMessage = `Erro no servidor (código ${res.status}).`;
        }
        throw new Error(errMessage);
      }

      const result: ProcessResponse = await res.json();
      onProcessComplete(result);
    } catch (err: any) {
      console.error('Process error:', err);
      setProcessingError(err.message || 'Falha ao processar e gerar a planilha.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-2.5 min-h-0">
      {/* 1. Top Control Bar: Sheets & Mode */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:px-3.5 shadow-2xs shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
        {/* Sheet Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Abas:
          </span>
          {uploadData.sheetNames.map((sheetName) => {
            const isActive = sheetName === activeSheet;
            return (
              <button
                key={sheetName}
                type="button"
                onClick={() => handleSheetChange(sheetName)}
                disabled={isLoadingSheet}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{sheetName}</span>
                {isActive && (
                  <span className="bg-emerald-700/90 text-[10px] px-1 py-0.2 rounded font-mono">
                    {sheetDetails.totalCols} cols
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feature mode switch & Parcial & Back */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
            <span className="text-slate-500 font-semibold hidden sm:inline">Modo:</span>
            <select
              value={featureType}
              onChange={(e) => handleFeatureSwitch(e.target.value as DrainageFeatureType)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[150px] truncate"
            >
              <option value="drenagem_profunda">Drenagem Profunda</option>
              <option value="drenagem_superficial">Drenagem Superficial</option>
              <option value="sinalizacao_vertical">Sinalização Vertical</option>
              <option value="sinalizacao_horizontal_dispositivo">SH - Dispositivo</option>
              <option value="sinalizacao_horizontal_marca_viaria">SH - Marca Viária</option>
              <option value="sinalizacao_horizontal_zebrado">SH - Zebrado</option>
              <option value="eps_defensa">EPS - Defensa</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onBackToUpload}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors bg-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trocar Arquivo</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Filter & Preset Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:px-3.5 shadow-2xs shrink-0 flex flex-wrap items-center justify-between gap-2.5">
        {/* Preset Toggle Switch */}
        <div className="flex items-center gap-2 flex-wrap">
          <label
            htmlFor="checkbox-selecao-padrao"
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer select-none ${
              isPresetActive
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/20'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50/50'
            }`}
          >
            <input
              id="checkbox-selecao-padrao"
              type="checkbox"
              checked={isPresetActive}
              onChange={handleToggleDefaultPreset}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
            />
            <span>Seleção Padrão ({matchedPresetCount} cols)</span>
          </label>

          {/* Rodovia Filter Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
            <Route className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              id="select-rodovia"
              value={rodoviaFilter}
              onChange={(e) => setRodoviaFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="">Todas as Rodovias ({sheetDetails.totalRows})</option>
              {availableRodovias.map((rodovia) => {
                const count = sheetDetails.rodoviaCounts?.[rodovia];
                return (
                  <option key={rodovia} value={rodovia}>
                    {rodovia} {count !== undefined ? `(${count})` : ''}
                  </option>
                );
              })}
            </select>
            {rodoviaFilter && (
              <button
                type="button"
                onClick={() => setRodoviaFilter('')}
                className="text-[10px] text-slate-400 hover:text-slate-700 ml-1 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Estado / Status Filter Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              id="select-estado-conservacao"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              {activeStatusOptions.map((opt) => {
                let count: number | undefined;
                if (!opt.value) {
                  count = sheetDetails.totalRows;
                } else if (sheetDetails.estadoCounts) {
                  count = sheetDetails.estadoCounts[opt.value];
                }
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} {count !== undefined ? `(${count})` : ''}
                  </option>
                );
              })}
            </select>
            {estadoFilter && (
              <button
                type="button"
                onClick={() => setEstadoFilter('')}
                className="text-[10px] text-slate-400 hover:text-slate-700 ml-1 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Live Filter Counter Status */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
            Planilha final: <strong className="text-slate-900">{matchingRealRowsCount.toLocaleString('pt-BR')}</strong> de {sheetDetails.totalRows.toLocaleString('pt-BR')} linhas
          </span>
          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
            {keptCount} colunas a manter
          </span>
        </div>
      </div>

      {/* Mobile Tab Toggle */}
      <div className="flex md:hidden bg-slate-200 p-0.5 rounded-lg text-xs font-semibold shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('columns')}
          className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'columns' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Colunas ({keptCount}/{totalColumns})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Prévia (20 Linhas)</span>
        </button>
      </div>

      {/* 3. Main Work Area (Split View Columns vs Preview Table) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5 overflow-hidden">
        {/* Left Panel: Column Selection List */}
        <div
          className={`md:col-span-5 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col min-h-0 overflow-hidden ${
            mobileTab === 'preview' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & Quick Actions */}
          <div className="space-y-2 pb-2 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar coluna por nome ou letra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="px-2 py-0.5 rounded border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <CheckSquare className="w-3 h-3 text-emerald-600" />
                  <span>Todas</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllVisible}
                  className="px-2 py-0.5 rounded border border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <Square className="w-3 h-3 text-rose-500" />
                  <span>Nenhuma</span>
                </button>
                <button
                  type="button"
                  onClick={handleInvertVisible}
                  className="px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <ArrowLeftRight className="w-3 h-3 text-slate-500" />
                  <span>Inverter</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-mono">
                {filteredColumns.length} colunas
              </span>
            </div>
          </div>

          {/* Scrollable Columns List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 pt-2 scrollbar-thin">
            {filteredColumns.map((col) => {
              const isKept = selectedForKeeping.has(col.index);
              const isPreset = isDefaultPresetField(col.name, featureType);

              return (
                <div
                  key={col.index}
                  onClick={() => handleToggleColumn(col.index)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer select-none flex items-center justify-between gap-2 text-xs ${
                    isKept
                      ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-400 opacity-70 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] border ${
                        isKept
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isKept && <CheckCircle2 className="w-3 h-3" />}
                    </div>

                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                      {col.letter}
                    </span>

                    <span
                      className={`truncate text-xs ${
                        isKept ? 'text-slate-900 font-semibold' : 'text-slate-500 line-through'
                      }`}
                      title={col.name}
                    >
                      {col.name || <span className="italic text-slate-400">(Vazio)</span>}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isPreset && (
                      <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded">
                        Padrão
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        isKept
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}
                    >
                      {isKept ? 'Manter' : 'Remover'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredColumns.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs">
                Nenhuma coluna encontrada para "{searchQuery}".
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Interactive 20-Row Preview Table */}
        <div
          className={`md:col-span-7 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col min-h-0 overflow-hidden ${
            mobileTab === 'columns' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800">
                Prévia da Planilha (Primeiras 20 linhas)
              </h4>
            </div>
            <span className="text-[10px] text-slate-400">
              Clique no cabeçalho para alternar coluna
            </span>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-auto border border-slate-200 rounded-lg mt-2 scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
                  <th className="p-1.5 border-r border-slate-200 text-center w-8 bg-slate-100 text-[10px]">
                    #
                  </th>
                  {sheetDetails.columns.map((col) => {
                    const isKept = selectedForKeeping.has(col.index);
                    return (
                      <th
                        key={col.index}
                        onClick={() => handleToggleColumn(col.index)}
                        className={`p-1.5 border-r border-slate-200 transition-colors cursor-pointer select-none whitespace-nowrap min-w-[120px] max-w-[200px] text-[11px] ${
                          isKept
                            ? 'bg-emerald-100/90 text-emerald-950 border-b-2 border-b-emerald-600 font-bold'
                            : 'bg-rose-50/70 text-rose-700 opacity-60 border-b-2 border-b-rose-400'
                        }`}
                        title={`Clique para ${isKept ? 'Remover' : 'Manter'}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="truncate">
                            <span className="font-mono text-slate-500 mr-1 text-[10px]">
                              [{col.letter}]
                            </span>
                            <span>{col.name}</span>
                          </div>
                          <span
                            className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${
                              isKept ? 'bg-emerald-600 text-white' : 'bg-rose-200 text-rose-900'
                            }`}
                          >
                            {isKept ? 'SIM' : 'NÃO'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sheetDetails.previewRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={sheetDetails.columns.length + 1}
                      className="p-6 text-center text-slate-400"
                    >
                      Nenhum dado encontrado nas primeiras linhas.
                    </td>
                  </tr>
                ) : (
                  sheetDetails.previewRows.map((row, rIdx) => {
                    return (
                      <tr
                        key={rIdx}
                        className={`transition-colors text-[11px] ${
                          rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        } hover:bg-slate-100/60`}
                      >
                        <td className="p-1.5 border-r border-slate-200 text-slate-400 font-mono text-center text-[10px] bg-slate-50">
                          {rIdx + 1}
                        </td>
                        {sheetDetails.columns.map((col) => {
                          const isKept = selectedForKeeping.has(col.index);
                          const cellValue = row[col.index - sheetDetails.columns[0].index];
                          return (
                            <td
                              key={col.index}
                              className={`p-1.5 border-r border-slate-100 whitespace-nowrap max-w-[200px] truncate ${
                                !isKept
                                  ? 'bg-rose-50/40 text-rose-400 line-through'
                                  : 'text-slate-800 font-medium'
                              }`}
                            >
                              {cellValue !== undefined && cellValue !== null && cellValue !== '' ? (
                                String(cellValue)
                              ) : (
                                <span className="text-slate-300 italic font-mono text-[10px]">vazio</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Error alert if processing failed */}
      {processingError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs shrink-0">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="flex-1 font-medium">{processingError}</span>
        </div>
      )}

      {/* 4. Action Footer Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:px-4 shadow-2xs shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
          <span>
            Serão geradas <strong className="text-emerald-700 font-bold">{keptCount} colunas</strong> e{' '}
            <strong className="text-indigo-950 font-bold">{matchingRealRowsCount.toLocaleString('pt-BR')} linhas</strong> ({featureConfig.name}).
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={() => setIsTurboModeOpen(true)}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-bold text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Gera XLSX e PDF para todas as rodovias automaticamente"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-100" />
            <span>Modo Turbo (Por Rodovia)</span>
          </button>

          <button
            type="button"
            onClick={handleProcessSpreadsheet}
            disabled={isProcessing || keptCount === 0}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Gerar Planilha Desta Aba ({keptCount} colunas)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Turbo Mode Execution Modal */}
      <TurboModeModal
        isOpen={isTurboModeOpen}
        onClose={() => setIsTurboModeOpen(false)}
        fileId={uploadData.fileId}
        originalFileName={uploadData.originalName}
        sheetName={activeSheet}
        sheetNames={uploadData.sheetNames}
        featureType={featureType}
        allColumns={sheetDetails.columns}
        availableRodovias={availableRodovias}
        rowFiltersData={sheetDetails.rowFiltersData}
        totalRows={sheetDetails.totalRows}
        onBackToUpload={onBackToUpload}
        parcialNumber={parcialNumber}
        onParcialChange={onParcialChange}
      />
    </div>
  );
};
