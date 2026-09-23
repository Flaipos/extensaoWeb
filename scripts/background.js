//enventos globais

// 1. Configura para abrir o Side Panel DIRETAMENTE ao clicar no ícone
async function configurarPainelDireto() {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  console.log("Painel lateral configurado para acesso direto (Versão Gratuita).");
}

// 2. Executa essa configuração sempre que a extensão for instalada ou atualizada 
chrome.runtime.onInstalled.addListener(configurarPainelDireto);
//Executa essa configuração sempre que o Chrome abrir
chrome.runtime.onStartup.addListener(configurarPainelDireto);

