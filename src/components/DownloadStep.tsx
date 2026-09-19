import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Layers,
  RotateCcw,
  Loader2,
  AlertCircle,
  HardDrive,
  Filter,
  Route,
  ArrowLeft,
} from 'lucide-react';
import { ProcessResponse } from '../types';

interface DownloadStepProps {
  result: ProcessResponse;
  onReset: () => void;
  onBackToSelect: () => void;
}

export const DownloadStep: React.FC<DownloadStepProps> = ({
  result,
  onReset,
  onBackToSelect,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(result.downloadUrl);
      if (!response.ok) {
        throw new Error(`Servidor retornou código HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('O arquivo retornado possui 0 bytes. Tente gerar novamente.');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err: any) {
      console.error('Download error:', err);
      setDownloadError(
        err.message || 'Ocorreu um erro ao baixar a planilha. Por favor, tente novamente.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setDownloadError(null);

    try {
      const pdfUrl = result.pdfDownloadUrl || `/api/download-pdf/${result.downloadId}`;
      const response = await fetch(pdfUrl);
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok || contentType.includes('text/html')) {
        const errorText = await response.text();
        let serverMsg = '';
        if (errorText) {
          try {
            const parsedJson = JSON.parse(errorText);
            serverMsg = parsedJson.error || parsedJson.message || '';
          } catch {
            if (!errorText.includes('<!doctype') && !errorText.includes('<html')) {
              serverMsg = errorText.trim();
            }
          }
        }
        if (serverMsg) {
          throw new Error(serverMsg);
        }
        if (contentType.includes('text/html') || errorText.includes('<!doctype') || errorText.includes('<html')) {
          throw new Error(`Erro HTTP ${response.status}: O servidor retornou uma resposta inválida ao gerar o PDF.`);
        }
        throw new Error(errorText || `Erro HTTP ${response.status} ao gerar o arquivo PDF.`);
      }

      const blob = await response.blob();
      if (!blob || blob.size < 100) {
        throw new Error('O PDF gerado é inválido ou muito pequeno (menos de 100 bytes). Tente novamente.');
      }

      const pdfFileName = result.fileName.replace(/\.xlsx$/i, '') + '.pdf';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err: any) {
      console.error('PDF Download error:', err);
      setDownloadError(
        err.message || 'Ocorreu um erro ao gerar o relatório em PDF. Por favor, tente novamente.'
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-between max-w-4xl mx-auto gap-3 min-h-0">
      {/* 1. Success & Action Download Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 text-center shadow-2xs space-y-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-2xs">
          <CheckCircle className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Planilha Filtrada e Pronta para Download!
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Arquivo gerado com integridade total de fotos e colunas selecionadas.
          </p>
        </div>

        {downloadError && (
          <div className="max-w-md mx-auto p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Primary Download Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading || isDownloadingPdf}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 text-white font-bold text-xs transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Baixando Excel...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar Excel ({formatFileSize(result.fileSize)})</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading || isDownloadingPdf}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-70 text-white font-bold text-xs transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Gerar Relatório PDF (Paisagem)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Metrics & File Specs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        {/* Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-center">
            <div className="text-[10px] font-semibold text-slate-500">Colunas Originais</div>
            <div className="text-lg font-extrabold text-slate-900">{result.originalColumnsCount}</div>
          </div>

          <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-2 text-center">
            <div className="text-[10px] font-semibold text-rose-700">Colunas Removidas</div>
            <div className="text-lg font-extrabold text-rose-700">{result.removedColumnsCount}</div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-2 text-center">
            <div className="text-[10px] font-semibold text-emerald-700">Colunas Mantidas</div>
            <div className="text-lg font-extrabold text-emerald-700">{result.keptColumnsCount}</div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-center">
            <div className="text-[10px] font-semibold text-slate-500">Linhas Processadas</div>
            <div className="text-lg font-extrabold text-slate-900">{result.rowsCount.toLocaleString('pt-BR')}</div>
          </div>
        </div>

        {/* Row Filter Status */}
        {(result.appliedRodoviaFilter || result.appliedEstadoFilter) && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 flex items-center justify-between gap-2 text-xs text-indigo-950">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[11px] text-indigo-900">Filtro aplicado:</span>
              {result.appliedRodoviaFilter && (
                <span className="bg-sky-100 text-sky-950 border border-sky-300 font-bold px-1.5 py-0.2 rounded text-[10px] flex items-center gap-1">
                  <Route className="w-2.5 h-2.5 text-sky-700" />
                  {result.appliedRodoviaFilter}
                </span>
              )}
              {result.appliedEstadoFilter && (
                <span className="bg-amber-100 text-amber-950 border border-amber-300 font-bold px-1.5 py-0.2 rounded text-[10px] flex items-center gap-1">
                  <Filter className="w-2.5 h-2.5 text-amber-700" />
                  {result.appliedEstadoFilter}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-indigo-900">
              {result.keptRowsCount !== undefined ? `${result.keptRowsCount} linhas mantidas` : ''}
            </span>
          </div>
        )}

        {/* File Details Line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 truncate">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-mono font-bold text-slate-900 truncate">{result.fileName}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-400" />
              {formatFileSize(result.fileSize)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Navigation Actions */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onBackToSelect}
          className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer bg-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Ajustar Colunas</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Nova Planilha</span>
        </button>
      </div>
    </div>
  );
};
