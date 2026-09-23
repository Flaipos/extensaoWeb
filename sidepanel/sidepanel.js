//aqui é o script do visual, ou seja, o que o usuário vê e interage. Ele é responsável por lidar com os eventos de clique, exibir os resultados e se comunicar com o content.js para obter os dados dos comentários do Instagram.



const inputsContainer = document.getElementById('inputs-container'); //campo onde os imputs de filtro são adicionados
const btnAddInput = document.getElementById('btn-add-input'); //botão para adicionar mais imputs de filtro
const btnFilter = document.getElementById('btn-filter'); //botão para iniciar a filtragem dos comentários com base nos imputs fornecidos pelo usuário. Ele coleta os valores dos imputs, verifica se o usuário está no Instagram e em uma publicação válida, e então envia uma mensagem para o content.js para extrair os comentários que correspondem aos filtros.
const resultsList = document.getElementById('results-list'); //campo onde os resultados dos comentários filtrados serão exibidos. Ele recebe os dados do content.js e renderiza cada comentário que corresponde aos filtros fornecidos pelo usuário, permitindo também que o usuário clique para localizar o comentário na página do Instagram ou visitar o perfil do autor do comentário.

// Garante que o script de extração/filtragem seja injetado na página se ele não estiver lá, ou seja, estamos falando do arquivo content.js. O mesmo é chamado pela primeira vez através do arquivo mamifest.json, porém caso ocorra algum problema para injeta-lo, existe esta função para tentar injetar o script novamente quando o usuário clicar no botão de filtro.
async function garantirScriptInjetado(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["scripts/content.js"]
    });
  } catch (e) {
    console.log("Script já ativo ou erro na injeção:", e);
  }
}

//função para adicionar novos campos de filtro, com um limite aumentado para 10 filtros. Se o usuário tentar adicionar mais do que isso, ele receberá um alerta informando que o limite foi atingido.
let inputCount = 1;
btnAddInput.addEventListener('click', () => {
  // permitindo até 10 inputs
  if (inputCount < 10) { 
    inputCount++;
    //criando um elemento do tipo input e defindo suas propriedades, como tipo, classe e placeholder, e depois adicionando esse novo input ao container de inputs na interface do usuário.
    const newInput = document.createElement('input'); 
    newInput.type = 'text'; 
    newInput.className = 'filter-input';
    newInput.placeholder = `Filtro ${inputCount}`;
    inputsContainer.appendChild(newInput);
  } else {
    // Mensagem de alerta atualizada para 10
    alert("Limite de 10 filtros atingido."); 
  }
});

// --- ONDE A MUDANÇA PRINCIPAL ACONTECE ---
//função para lidar com o clique no botão de filtro. Ele coleta os valores dos imputs de filtro, verifica se o usuário está no Instagram e em uma publicação válida, e então envia uma mensagem para o content.js para extrair os comentários que correspondem aos filtros fornecidos pelo usuário. Se o usuário não estiver no Instagram ou não tiver uma publicação aberta, ele exibe mensagens de erro apropriadas.
btnFilter.addEventListener('click', async () => {
  const inputs = document.querySelectorAll('.filter-input');
  const keywords = Array.from(inputs).map(i => i.value.trim()).filter(k => k !== "");

  if (keywords.length === 0) return alert("Digite ao menos um filtro!");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 1. VERIFICAÇÃO DE SITE (Se está no Instagram)
  if (!tab || !tab.url || !tab.url.includes("instagram.com")) {
    resultsList.innerHTML = `<div style="color: #ed4956; padding: 10px; text-align: center; border: 1px solid #ed4956; border-radius: 8px; background: #fff1f2;">
                                <strong>⚠️ Erro de Site</strong><br>Acesse o Instagram para filtrar.
                             </div>`;
    return;
  }

  // 2. NOVA VERIFICAÇÃO DE PUBLICAÇÃO
  // URLs de posts contêm "/p/", "/reels/" ou "/tv/"
  const ehPublicacao = tab.url.includes("/p/") || tab.url.includes("/reels/") || tab.url.includes("/tv/");
  
  if (!ehPublicacao) {
    resultsList.innerHTML = `<div style="color: #ed4956; padding: 10px; text-align: center; border: 1px solid #ed4956; border-radius: 8px; background: #fff1f2; font-size: 13px;">
                                <strong>⚠️ Publicação não encontrada</strong><br>
                                Por favor, abra uma foto ou um Reels para começar a filtrar os comentários.
                                Após abrir a postagem, certifique que carregou todos os comentários da publicação (clicando no sinal de '+' até que não apareça mais).
                             </div>`;
    return;
  }

  resultsList.innerHTML = "<li>Buscando...</li>";

  // Fução para enviar a mensagem de extração de comentários para o content.js, ou seja, é aqui que a filtragem acontece. Este arquivo chama o content.js para a filtragem pro conta do comando "action: "extract_comments"" que está no arquivo content.js. Porém o script inteiro do aqquivo content.js já foi injetado na página do Instagram, então ele já está lá, só esperando essa mensagem para começar a trabalhar. O content.js vai lá na página do Instagram, pega os comentários, filtra com base nos filtros fornecidos pelo usuário, e depois envia de volta os comentários filtrados para o sidepanel.js exibir para o usuário. Se por algum motivo a comunicação falhar (como o content.js não estar injetado), ele tenta injetar o script (através da função garantirScriptInjetado) e repetir a solicitação após um breve atraso. Se a resposta for bem-sucedida, ele chama a função renderizarComentarios para exibir os resultados na interface do usuário.
  chrome.tabs.sendMessage(tab.id, { action: "extract_comments", keywords }, async (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Conexão perdida. Tentando injetar script e repetir...");
      await garantirScriptInjetado(tab.id);
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: "extract_comments", keywords }, (secondResponse) => {
          renderizarComentarios(secondResponse);
        });
      }, 500);
    } else {
      renderizarComentarios(response);
    }
  });
});

// --- FUNÇÃO PARA RENDERIZAR OS COMENTÁRIOS FILTRADOS NA INTERFACE DO USUÁRIO ---
function renderizarComentarios(response) {
  resultsList.innerHTML = "";
  
  if (response && response.comments) {
    let commentsToDisplay = response.comments;

    if (commentsToDisplay.length === 0) {
      resultsList.innerHTML = "<li>Nenhum comentário corresponde aos filtros.</li>";
      return;
    }

    //laço para criar um elemento de lista para cada comentário filtrado, exibindo o nome do usuário, o texto do comentário, e um botão para localizar o comentário na página do Instagram. Ele também adiciona um evento de clique ao nome do usuário para abrir o perfil do autor do comentário em uma nova aba, e um evento de clique ao botão de localização para enviar uma mensagem ao content.js para destacar o comentário correspondente na página do Instagram.
    commentsToDisplay.forEach(c => {
      const li = document.createElement('li');
      li.className = 'comment-item';
      li.style = "border-bottom: 1px solid #eee; padding: 12px; list-style: none; background: white; margin-bottom: 8px; border-radius: 8px;";
      
      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <strong style="color:#00376b; cursor:pointer;" class="btn-profile">@${c.user}</strong>
        </div>
        <p style="margin:5px 0; font-size: 13px; color: #262626; word-break: break-word; white-space: pre-wrap;">${c.text}</p>
        ${c.meta ? `<div style="color: #8e8e8e; font-size: 11px; margin-bottom: 8px; font-weight: 600;">${c.meta}</div>` : ''}
        <button class="btn-locate" style="width: 100%; cursor:pointer; background:#0095f6; color:white; border:none; border-radius:4px; padding:8px; font-size:11px; font-weight:bold;">
          📍 LOCALIZAR COMENTÁRIO
        </button>
      `;

      li.querySelector('.btn-profile').addEventListener('click', () => {
          const cleanUser = c.user.replace('@', '').trim();
          window.open(`https://www.instagram.com/${cleanUser}/`, '_blank');
      });

      li.querySelector('.btn-locate').addEventListener('click', async () => {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(activeTab.id, { 
          action: "highlight_comment", 
          user: c.user, 
          text: c.text 
        });
      });

      resultsList.appendChild(li);
    });
  } else {
    resultsList.innerHTML = "<li>Nenhum comentário encontrado. Tente recarregar a página do Instagram.</li>";
  }
}

document.getElementById('btn-logout').addEventListener('click', () => {
    resultsList.innerHTML = "";
    alert("Filtros limpos!");
});