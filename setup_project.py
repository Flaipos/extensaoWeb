import os

# Estrutura de pastas e arquivos
project_structure = {
    "manifest.json": """{
  "manifest_version": 3,
  "name": "InstaFilter Pro",
  "version": "1.0",
  "description": "Filtre comentários do Instagram com integração Google Login.",
  "permissions": ["identity", "activeTab", "scripting", "storage"],
  "action": {
    "default_popup": "popup/popup.html"
  },
  "background": {
    "service_worker": "scripts/background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.instagram.com/*"],
      "js": ["scripts/content.js"]
    }
  ],
  "host_permissions": ["https://www.instagram.com/*"]
}""",
    "popup/popup.html": """<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h2>InstaFilter Pro</h2>
    <div id="auth-section">
      <button id="btn-login">Login com Google</button>
    </div>
    
    <div id="filter-section" style="display:none;">
      <p>Filtros (até 5 palavras):</p>
      <div id="inputs-container">
        <input type="text" class="filter-input" placeholder="Palavra 1">
      </div>
      <button id="btn-add-input">+ Filtro</button>
      <button id="btn-filter" class="primary">Filtrar Comentários</button>
      
      <div id="results">
        <ul id="comments-list"></ul>
      </div>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>""",
    "popup/popup.css": """body { width: 350px; font-family: sans-serif; padding: 15px; }
.container { display: flex; flex-direction: column; gap: 10px; }
input { margin-bottom: 5px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
button { padding: 10px; cursor: pointer; border-radius: 4px; border: none; background: #dbdbdb; }
.primary { background: #0095f6; color: white; margin-top: 10px; }
#comments-list { list-style: none; padding: 0; max-height: 300px; overflow-y: auto; }
.comment-item { border-bottom: 1px solid #eee; padding: 10px 0; font-size: 12px; }
.actions { margin-top: 5px; display: flex; gap: 10px; color: #00376b; cursor: pointer; }""",
    "scripts/content.js": """// Script para interagir com o DOM do Instagram
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_comments") {
    const keywords = request.keywords.filter(k => k !== "").map(k => k.toLowerCase());
    
    // Seletores aproximados (o Instagram muda sempre)
    const commentNodes = document.querySelectorAll('div[role="menuitem"], ul li'); 
    let filtered = [];

    commentNodes.forEach(node => {
      const textNode = node.querySelector('span');
      const userNode = node.querySelector('h3, a');
      
      if(textNode && userNode) {
        const text = textNode.innerText;
        const user = userNode.innerText;
        const match = keywords.some(k => text.toLowerCase().includes(k));
        
        if (match || keywords.length === 0) {
            filtered.push({ user, text });
        }
      }
    });
    sendResponse({ comments: filtered });
  }
  return true;
});""",
    "scripts/background.js": """// Lógica de background
chrome.runtime.onInstalled.addListener(() => {
  console.log("InstaFilter Instalado com sucesso.");
});""",
    "popup/popup.js": """let inputCount = 1;

document.getElementById('btn-add-input').addEventListener('click', () => {
  if (inputCount < 5) {
    inputCount++;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'filter-input';
    input.placeholder = `Palavra ${inputCount}`;
    document.getElementById('inputs-container').appendChild(input);
  }
});

document.getElementById('btn-login').addEventListener('click', () => {
  // Simulação de Login
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('filter-section').style.display = 'block';
});

document.getElementById('btn-filter').addEventListener('click', async () => {
  const inputs = document.querySelectorAll('.filter-input');
  const keywords = Array.from(inputs).map(i => i.value);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url.includes("instagram.com")) {
    alert("Por favor, esteja em uma página do Instagram!");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "extract_comments", keywords }, (response) => {
    const list = document.getElementById('comments-list');
    list.innerHTML = "";
    
    if (response && response.comments) {
      response.comments.forEach(c => {
        const li = document.createElement('li');
        li.className = 'comment-item';
        li.innerHTML = `<strong>${c.user}:</strong> ${c.text}
                        <div class="actions">
                          <span>Curtir</span> | <span>Responder</span>
                        </div>`;
        list.appendChild(li);
      });
    } else {
        list.innerHTML = "Nenhum comentário encontrado ou carregado.";
    }
  });
});"""
}

# Criar pastas e arquivos
for path, content in project_structure.items():
    folder = os.path.dirname(path)
    if folder and not os.path.exists(folder):
        os.makedirs(folder)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("✅ Tudo pronto! As pastas e arquivos foram criados.")