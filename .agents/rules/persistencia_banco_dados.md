# Proibição Absoluta de LocalStorage para Dados de Negócio & Governança de Banco

- **BANCO DE DADOS É A ÚNICA FONTE DA VERDADE**: O Supabase é a fonte da verdade de todas as entidades e operações de negócio.
- **PROIBIÇÃO DE LOCALSTORAGE PARA DADOS**: É estritamente proibido salvar, simular, filtrar ou persistir no `localStorage` dados que pertencem ao banco de dados (tais como: status de mensagens lidas/não lidas, status de arquivamento, lembretes, comentários, orçamentos, viagens, etc.).
- **CONEXÃO ESTÁVEL É PREMISSA MANDATÓRIA**: O sistema é operado em computadores de agência com conexão de internet de alta confiabilidade. Não há suporte nem justificativa para fallbacks offline ou armengues de cache local.
- **PERSISTÊNCIA REAL NO SUPABASE**: Qualquer ação do usuário (arquivar, desarquivar, marcar como lido, excluir, criar) DEVE executar a chamada de atualização correspondente diretamente nas tabelas físicas do Supabase (`lembretes`, `notificacoes`, `mensagens_diretas`, etc.).
- **PROIBIÇÃO TOTAL DE ZERO-DRIFT E MASCARAMENTO DE DADOS**: É estritamente proibido criar fallbacks que capturem erros de schema (`42703`, `42P01`) para esconder a ausência de colunas em campos improvisados (como `observacoes` ou metadados JSON). Migrações e DDLs são executados manualmente pelo usuário antes de deploys, e a aplicação adota Fail-Fast transparente.
