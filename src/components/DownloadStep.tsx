import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Layers,
  Trash2,
  ListFilter,
  RotateCcw,
  ShieldCheck,
  Loader2,
  AlertCircle,
  HardDrive,
  Filter,
  Route,
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

      // Create a local blob object URL to bypass iframe link navigation restrictions
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
    <div className="w-full max-w-5xl mx-auto space-y-3">
      {/* Success Banner */}
      <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-4 sm:p-5 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
          <CheckCircle className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          Planilha filtrada com sucesso!
        </h3>
        <p className="text-xs text-slate-600 mt-1 max-w-2xl mx-auto">
          As colunas selecionadas foram mantidas com integridade total. Baixe a planilha tratada em Excel (.xlsx) ou gere o Relatório em PDF diagramado em formato Paisagem.
        </p>

        {downloadError && (
          <div className="mt-3 max-w-md mx-auto p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[10px] flex items-center gap-2 text-left">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Primary Download Buttons: Excel + PDF (Landscape) */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading || isDownloadingPdf}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-70 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Gerar PDF (Paisagem)</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[9px] text-slate-500 mt-2 flex items-center justify-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-emerald-600" />
          PDF em formato Paisagem (A4) com fotos ampliadas e dados cadastrais.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="border-b border-slate-100 pb-3">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Resumo do Processamento</span>
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Métricas detalhadas da geração do novo arquivo XLSX e PDF
          </p>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-center">
            <div className="text-[9px] font-semibold text-slate-500 mb-0.5">
              Colunas originais
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              {result.originalColumnsCount}
            </div>
          </div>

          <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-2.5 text-center">
            <div className="text-[9px] font-semibold text-rose-700 mb-0.5 flex items-center justify-center gap-1">
              <Trash2 className="w-3 h-3" />
              Colunas removidas
            </div>
            <div className="text-xl font-extrabold text-rose-700">
              {result.removedColumnsCount}
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5 text-center">
            <div className="text-[9px] font-semibold text-emerald-700 mb-0.5 flex items-center justify-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Colunas mantidas
            </div>
            <div className="text-xl font-extrabold text-emerald-700">
              {result.keptColumnsCount}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-center">
            <div className="text-[9px] font-semibold text-slate-500 mb-0.5 flex items-center justify-center gap-1">
              <Layers className="w-3 h-3" />
              Linhas processadas
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              {result.rowsCount.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Row Filter Status Card */}
        {result.appliedRodoviaFilter || result.appliedEstadoFilter ? (
          <div className="bg-indigo-50/90 border border-indigo-200/90 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-indigo-950 shadow-2xs">
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-1 text-indigo-900">
                <Filter className="w-3.5 h-3.5 text-indigo-700" />
                <span>Filtro de linhas aplicado:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {result.appliedRodoviaFilter && (
                  <span className="bg-sky-100 text-sky-950 border border-sky-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Route className="w-3 h-3 text-sky-700" />
                    Rodovia: {result.appliedRodoviaFilter}
                  </span>
                )}
                {result.appliedRodoviaFilter && result.appliedEstadoFilter && (
                  <span className="text-indigo-400 font-bold">+</span>
                )}
                {result.appliedEstadoFilter && (
                  <span className="bg-amber-100 text-amber-950 border border-amber-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Filter className="w-3 h-3 text-amber-700" />
                    Estado: {result.appliedEstadoFilter}
                  </span>
                )}
              </div>
            </div>
            <div className="text-[10px] font-semibold text-indigo-900 shrink-0 bg-white/70 px-2 py-1 rounded border border-indigo-200/60">
              {result.keptRowsCount !== undefined && result.originalRowsCount !== undefined ? (
                <span>
                  <strong>{result.keptRowsCount}</strong> de {result.originalRowsCount} ({result.removedRowsCount} descartadas)
                </span>
              ) : (
                <span>{result.rowsCount} linhas selecionadas</span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-[10px] text-slate-600 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Nenhum filtro de linha aplicado: <strong>todas as {result.rowsCount.toLocaleString('pt-BR')} linhas</strong> foram mantidas.
            </span>
          </div>
        )}

        {/* File Details Line */}
        <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px]">
            <span className="text-slate-500">Nome do arquivo:</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-full">
              {result.fileName}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px]">
            <span className="text-slate-500 flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-400" />
              Tamanho:
            </span>
            <span className="font-semibold text-slate-800">
              {formatFileSize(result.fileSize)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px]">
            <span className="text-slate-500">Origem:</span>
            <span className="text-slate-700 font-medium truncate max-w-full">
              {result.originalFileName}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation and Next Steps */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={onBackToSelect}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Ajustar colunas</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Nova planilha</span>
        </button>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 pt-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>
          Arquivo temporário removido após a sessão.
        </span>
      </div>
    </div>
  );
};
