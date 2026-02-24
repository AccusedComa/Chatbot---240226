# Histórico de Conversas

## 2026-02-24 - Melhoria Departamentos (Telefone)
**Pedido:** Adicionar opção de telefone quando o departamento for humano.
**Ação:**
- Adicionada coluna `phone` na tabela `departments` (`src/server/db.ts`).
- Atualizado endpoint `POST /departments` para receber o telefone.
- Atualizado frontend `Departments.tsx` para exibir input condicional e mostrar o telefone na lista.
**Status:** Cadastro de departamentos humanos agora suporta contato telefônico.
