# Histórico de Conversas

## 2026-02-24 - Configurações e RAG Dinâmico
**Pedido:** Acessar configurações, configurar API Key e habilitar RAG com uploads.
**Ação:**
- Criada tabela `app_settings` no SQLite para armazenar configurações dinâmicas.
- Atualizado `Settings.tsx` com formulário para salvar API Key e área de upload de documentos.
- Refatorado backend (`rag.ts`, `chat.ts`) para ler a chave do banco se não estiver no `.env`.
- Adicionados endpoints `/api/admin/settings` para leitura e escrita de configurações.
**Status:** Usuário pode configurar a IA diretamente pelo painel admin sem reiniciar o servidor.
