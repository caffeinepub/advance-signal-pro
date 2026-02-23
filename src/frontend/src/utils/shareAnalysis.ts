export async function shareAnalysis(analysis: any) {
  const signal = analysis.direction === 'bullish' ? 'COMPRA' : analysis.direction === 'bearish' ? 'VENDA' : 'MANTER';
  const trend = analysis.direction === 'bullish' ? 'ALTA' : analysis.direction === 'bearish' ? 'BAIXA' : 'LATERAL';
  const text = `Análise Advance Signal Pro\n\nSinal: ${signal}\nConfiança: ${analysis.confidencePercentage}%\nTendência: ${trend}\nForça da Tendência: ${analysis.trendStrength}%\n\nGerado por Advance Signal Pro`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Análise de Gráfico',
        text,
      });
    } catch (error) {
      // User cancelled or error occurred
      fallbackCopy(text);
    }
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Análise copiada para a área de transferência!');
    });
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Análise copiada para a área de transferência!');
  }
}
