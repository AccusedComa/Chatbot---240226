# Histórico de Conversas

## 2026-02-24 - Correção Departamentos (Duplicatas)
**Pedido:** Corrigir duplicação massiva de departamentos.
**Ação:**
- Identificada causa: `INSERT OR IGNORE` no seed rodava a cada restart sem constraint UNIQUE no banco.
- Criado script de limpeza (`cleanup_duplicates.ts`) para remover duplicatas mantendo IDs originais.
- Adicionado `CREATE UNIQUE INDEX` em `src/server/db.ts` para prevenir recorrência.
**Status:** Banco de dados limpo e protegido contra novas duplicações.
