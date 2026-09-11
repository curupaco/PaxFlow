# 🛑 REGRA FUNDAMENTAL ABSOLUTA DO PAXFLOW

## Autoridade de Decisão do Produto

- **O USUÁRIO É O ÚNICO DONO DO PRODUTO E UNILATERALMENTE O ÚNICO TOMADOR DE DECISÕES.**
- 💡 **SUGESTÕES E RECOMENDAÇÕES**: São **sempre muito bem-vindas**. O assistente de IA pode e deve propor ideias, alternativas visuais, melhorias técnicas, alertas e opções para avaliação do usuário.
- 🛑 **DECISÕES UNILATERAIS DE EXECUÇÃO**: Estritamente **PROIBIDAS**. O assistente **NUNCA** deve tomar decisões autônomas ou implementar alterações de design, estilos (cores, tipografia, efeitos visuais, gradientes, animações), regras de negócio, fluxos de usuário ou estrutura de telas sem solicitação ou aprovação prévia e explícita do usuário.
- **PAPEL DO ASSISTENTE**: Propor sugestões e opções quando pertinente, mas executar estritamente o que foi aprovado pelo usuário.

## Idioma Obrigatório de Comunicação

- **IDIOMA EXCLUSIVO (PT-BR)**: O assistente DEVE responder **ESTRITAMENTE EM PORTUGUÊS DO BRASIL** em 100% das suas mensagens.
- **PROIBIÇÃO DE INGLÊS**: NUNCA usar inglês, nem misturar nomes de variáveis em inglês no texto explicativo. Toda a comunicação deve ser em português claro, natural e direto.

## Premissa Arquitetural: Banco de Dados é a Única Fonte da Verdade

- **PROIBIÇÃO TOTAL DE LOCALSTORAGE PARA DADOS DE NEGÓCIO**: NUNCA utilizar `localStorage` para persistir, mascarar ou cachear estados de entidades, mensagens, alertas, status de lido/não lido, status de arquivado ou regras de negócio.
- **CONEXÃO ESTÁVEL OBRIGATÓRIA**: Conexão estável com a internet é premissa mandatória da implantação do PaxFlow. Ninguém usa o sistema em deslocamento ou offline.
- **SUPABASE É O ÚNICO RESPONSÁVEL PELA PERSISTÊNCIA**: Toda alteração de estado (arquivar, desarquivar, marcar lido, excluir, criar, editar) DEVE ser gravada, consultada e persistida diretamente nas tabelas do Supabase. Se não houver tabela ou coluna no banco, a tabela/coluna deve ser criada ou utilizada adequadamente, jamais simulada via localStorage.

## 🧪 REGRA PARA GERAÇÃO E EXECUÇÃO DE TESTES (ECONOMIA DE TOKENS E QUALIDADE)

Sempre que eu pedir para testar um fluxo, atue como um Engenheiro de Testes Sênior focado em testes Subcutâneos.
1. Use APENAS Vitest, MSW e chamadas diretas às funções/banco (Supabase).
2. ZERO testes de interface (DOM).
3. Não escreva explicações, introduções ou textos de markdown quando solicitado código de teste. Saída apenas em código.
4. Estruture o teste em 3 blocos comentados: // Setup, // Action, // Assert.
5. Mocke dependências externas (Google Drive, APIs) sempre retornando 200 OK.

### ⚡ EXECUÇÃO AUTOMÁTICA OBRIGATÓRIA (NÃO PRECISA PEDIR)
- **RODOU ALTERAÇÃO, RODOU TESTE**: Sempre que qualquer arquivo de serviço, regra ou componente de um módulo for alterado, o assistente DEVE executar proativamente os testes correspondentes (`npx vitest run tests/...`) antes de considerar a tarefa entregue.
- **ATUALIZAÇÃO DE COBERTURA**: Se a alteração introduzir novo fluxo ou modificar comportamento de negócio, a suíte de testes subcutâneos do respectivo módulo DEVE ser atualizada ou expandida no mesmo ciclo.
- **ENTREGA CONDICIONAL**: Uma tarefa só é dada por concluída se todos os testes passarem (100% verde) e o `npm run build` não apresentar erros impeditivos.

---

## 🚨 PROTOCOLO MANDATÓRIO DE BANCO DE DADOS (DDL, MIGRAÇÕES E SCHEMA DRIFT)

1. **ALERTA DE DDL OBRIGATÓRIO NO TOPO DA RESPOSTA**:
   - Se qualquer desenvolvimento demandar criação ou alteração de coluna, tabela, índice, enum ou trigger no Supabase, é **ESTRITAMENTE PROIBIDO** declarar a tarefa como entregue ou pronta para produção sem exibir no início da resposta o bloco SQL completo e mastigado para ser executado no SQL Editor do Supabase.
   - O assistente DEVE alertar explicitamente o usuário sobre a necessidade de rodar o script no banco antes de considerar o fluxo liberado para a agência.

2. **RESILIÊNCIA OBRIGATÓRIA A SCHEMA DRIFT (PADRÃO ZERO-BREAK)**:
   - Todo serviço que gravar em colunas novas DEVE implementar tratamento nativo de fallback para erro `42703` (coluna inexistente).
   - A agência não pode parar: se a aplicação for atualizada antes da migração ser rodada no Supabase, o sistema DEVE persistir os dados de forma segura (ex: em campo estruturado existente como `observacoes`) e continuar operando normalmente, sem toasts vermelhos nem travamentos.

3. **COBERTURA DE TESTES PARA ERROS DE SCHEMA**:
   - Os testes subcutâneos de serviços que introduzem colunas novas DEVEM incluir obrigatoriamente um teste simulando o erro `42703`, comprovando que o fallback de banco funciona e a aplicação não quebra em produção.



