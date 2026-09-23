//script responsável por interagir com a página do Instagram, extrair os comentários e enviar de volta para o sidepanel.js. Ele é injetado diretamente na página do Instagram quando o usuário clica no botão de filtrar comentários. O content.js é o "olheiro" que vai lá na página, pega os dados e traz para o sidepanel mostrar para o usuário.


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // --- BLOCO 1: EXTRAÇÃO 
  if (request.action === "extract_comments") {
    const keywords = request.keywords.map(k => k.toLowerCase().trim()).filter(k => k !== "");
    let extracted = [];

    // Seletores para encontrar os blocos de comentários no Instagram
    const commentBlocks = document.querySelectorAll('ul li div[role="menuitem"], li > div > div > div:nth-child(2), ul li');

    commentBlocks.forEach(node => {
      try {
        const userAnchor = node.querySelector('a[href*="/"]');
        if (!userAnchor) return;

        const user = userAnchor.innerText.trim();
        const userHref = userAnchor.getAttribute('href');
        
        // Texto bruto para garantir que a filtragem não perca ninguém
        let rawText = node.innerText || "";

        // --- LÓGICA DE FILTRAGEM (MANTIDA INTACTA) ---
        const textForFiltering = rawText.replace(user, "").toLowerCase();
        const matches = keywords.length === 0 || keywords.some(k => textForFiltering.includes(k));

        if (matches && user) {
          // --- NOVA EXTRAÇÃO DE META (MAIS FLEXÍVEL) ---
          let metaData = "";
          
          // Captura padrões de data: "3 d", "3d", "56 min", "1 sem"
          const dateMatch = rawText.match(/(\d+\s*[smhdwmin]+)/);
          
          // Captura curtidas: "7 curtidas", "1 curtida", "32 curtidas"
          const likeMatch = rawText.match(/(\d+\s*curtidas?)/);
          
          let parts = [];
          if (dateMatch) parts.push(dateMatch[0].trim());
          if (likeMatch) parts.push(likeMatch[0].trim());
          
          // Une com " - " apenas se ambos existirem, ou exibe o que encontrou
          metaData = parts.join(" - "); 

          // --- LIMPEZA VISUAL DO CORPO DO TEXTO ---
          let displayBody = rawText
            .replace(user, "")
            .replace(/Responder/g, "")
            .replace(/Ver tradução/g, "")
            // Remove as datas e curtidas do corpo do texto para não repetir embaixo
            .replace(/(\d+\s*[smhdwmin]+)/g, "") 
            .replace(/(\d+\s*curtidas?)/g, "")   
            .trim();

          if (displayBody.length < 1) displayBody = rawText.replace(user, "").trim();

          extracted.push({ 
            user: user, 
            text: displayBody, 
            link: userHref,
            meta: metaData 
          });
        }
      } catch (e) {
        console.error("Erro no bloco:", e);
      }
    });

    // Remove duplicados
    const finalData = extracted.filter((v, i, a) => 
      a.findIndex(t => (t.user === v.user && t.text.substring(0,20) === v.text.substring(0,20))) === i
    );

    sendResponse({ comments: finalData });
  }

  // --- BLOCO 2: LOCALIZAR E DESTACAR (NOVA FUNCIONALIDADE) ---
  if (request.action === "highlight_comment") {
    // Busca todos os itens de lista (comentários) na tela
    const allComments = document.querySelectorAll('ul li');
    let found = false;

    allComments.forEach(el => {
      const elText = el.innerText || "";
      
      // Verifica se o elemento contém o nome do usuário e o início do texto do comentário
      if (elText.includes(request.user) && elText.includes(request.text.substring(0, 25))) {
        found = true;

        // 1. Rolagem suave para o centro da tela
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // 2. Aplicar o fundo amarelo (Destaque visual)
        const originalBg = el.style.backgroundColor;
        el.style.transition = "background-color 0.4s ease";
        el.style.backgroundColor = "#fff382"; // Amarelo vibrante
        el.style.borderRadius = "8px";

        // 3. Remover o destaque após 5 segundos
        setTimeout(() => {
          el.style.backgroundColor = originalBg;
        }, 5000);
      }
    });

    sendResponse({ success: found });
  }

  return true; 
});