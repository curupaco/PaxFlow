import { describe, it, expect } from 'vitest';
import { StudioExtractionService } from '../../src/services/studioExtractionService';
import { parsePnrText } from '../../src/utils/pnrParser';

describe('VoucherMultiModeloExtraction - Testes Subcutâneos dos 4 Modelos', () => {
  // Setup: fixtures estáticas extraídas dos 4 PDFs oficiais (sem dependência de /tmp)
  const mscText = "FORMULÁRIO DE EMBARQUE\nESTE FORMULÁRIO DEVE SER APRESENTADO IMPRESSO NO EMBARQUE\nNÚMERO DA RESERVA 75942907\nNavio\n\nMSC Virtuosa\n\nData de embarque\n\n26/12/2026\n\nCabine\n\n11225\n\nPorto de embarque\n\nSantos, Brasil\n\nCategoria de cabine\n\nBalcony\n\nExperiência\n\nFANTASTICA\n\nPonto de encontro\n\nN\n\nHORÁRIO DO CHECK-IN\n\nCELINE ELAINE PUCINELLI RAMOS\nHóspede(s)\n\nSeu check-in abre às:15:30\n\n193567077\n\nMONIQUE ARAGAO DI LALLO\nCORDENUNZZI\n\nSeu check-in encerra 1\nhora após as:15:30\n\nATENÇÃO: Planeje a sua chegada no porto com\nantecedência, respeitando o seu horário de\ncheck-in informado. Leve em consideração que o\nembarque se encerra 2 horas antes da partida\ndo navio, e não será possível embarcar após\nesse horário limite. Ao planejar o seu retorno\npara casa, considere que o desembarque pode\nlevar de 2 a 4 horas devido a necessidades\noperacionais.\n\n193567078\n\nPrimeiro nome\n\nCELINE ELAINE\n\nPrimeiro nome\n\nMONIQUE\n\nÚltimo nome\n\nPUCINELLI RAMOS\n\nÚltimo nome\n\nARAGAO DI LALLO\nCORDENUNZZI\n\nNacionalidade\n\nBRAZIL\n\nNacionalidade\n\nBRAZIL\n\nData de nascimento\n\n16/11/1963\n\nData de nascimento\n\n20/03/1968\n\nGênero\n\nF\n\nGênero\n\nF\n\nNome do contato de emergência\nNome do contato\nDANIEL PEDRO RAMOS SANTOS\nDANIEL PEDRO RAMOS SANTOS\n\nTelefone\n5511989577074\n5511989577074\n\nPage 1\n\n\fSEU CRUZEIRO | ITINERÁRIO\n\nSERVIÇOS ADICIONADOS AO SEU CRUZEIRO\nEASY PACKAGE - 351PRN9N\n\nCELINE ELAINE PUCINELLI RAMOS\nHóspede(s)\n\nMONIQUE ARAGAO DI LALLO\nCORDENUNZZI\n\nHOTEL SERVICE CHARGE - SC2627SO\n\nCELINE ELAINE PUCINELLI RAMOS\nHóspede(s)\n\nMONIQUE ARAGAO DI LALLO\nCORDENUNZZI\n\nBrowse - 2 devices - B2N049\nHóspede(s)\n\nPORTO DE EMBARQUE\nSantos, Brasil\n\nCELINE ELAINE PUCINELLI RAMOS\n\nREDION PREMIUM - 29 MOTIVOS - BR/INS24\n\nCELINE ELAINE PUCINELLI RAMOS\nDia\n\nPorto\n\nChegada Partida\n\nSÁ 26/12/26\n\nSantos, Brasil\n\n--:--\n\n17:00\n\nDOM 27/12/26\n\nBúzios, Brasil (ancorado)\n\n09:00\n\n19:00\n\nSEG 28/12/26\n\nNavegando\n\n--:--\n\n--:--\n\nTER 29/12/26\n\nSalvador, Brasil\n\n08:00\n\n17:00\n\nQUA 30/12/26\n\nNavegando\n\n--:--\n\n--:--\n\nQUI 31/12/26\n\nCopacabana, Brasil (em\nnavegação)\n\n21:00\n\n--:--\n\nSEX 01/01/27\n\nCopacabana, Brasil (em\nnavegação)\n\n--:--\n\n02:00\n\nSEX 01/01/27\n\nIlhabela, Brasil (ancorado) 10:00\n\n18:00\n\nSÁ 02/01/27\n\nSantos, Brasil\n\n--:--\n\n06:00\n\nHóspede(s)\n\nMONIQUE ARAGAO DI LALLO\nCORDENUNZZI\n\nOs horários de chegada e partida do cruzeiro podem ser\ndiferente dos indicados. Para uma viagem sem\npreocupações, recomendamos reservar os seus transfers e\nexcursões diretamente com a MSC, para que os serviços\nsempre estejam alinhados com os horários do navio.\n\nBaixe o app\nMSC for Me\n\nBaixe o aplicativo\ngratuito MSC for Me\nantes de sair de casa\npara aproveitar ao\nmáximo\nsua\nexperiência\nde\ncruzeiro. Use o app\npara evitar filas,\nfazer reservas e\nmuito mais.\n\nAprimore o seu cruzeiro com serviços pré-pagos a\nbordo\nReserve os seus itens adicionais favoritos no nosso site\natravés da área Gerenciar Reserva até 2 dias antes do seu\ncruzeiro.\n\nEconomize dinheiro\nComprar antecipadamente oferece economia em\ncomparação aos preços a bordo.\n\nPage 2\n\n\fPARA FIXAR CORRETAMENTE A SUA ETIQUETA,\nUSE UM GRAMPEADOR, COLA OU FITA\nADESIVA.\n\nITENS PROIBIDOS\nDESCARTAR\n\n11225 11\n\nCabin\n\nETIQUETAS DE BAGAGENS\n\nDeck\n\nVocê é responsável por\ngarantir que essas etiquetas\nestejam corretamente\nafixadas em todas as\nbagagens durante o\ntransporte. Por favor,\nverifique novamente na\nchegada ao aeroporto, se\naplicável. Observe que pode\nhaver um atraso no\nrecebimento de sua\nbagagem na cabine se ela\nnão estiver etiquetada ou\nnão estiver claramente\netiquetada.\n\nMANTENHA COM VOCÊ\n\nVI\n\n1. Dobre na linha\n\n193567077\n\npontilhada\n\n2. Enrole a etiqueta em\n\nNÚMERO DA RESERVA\n\n75942907\n\nvolta da alça da\nbagagem e feche com\nfita adesiva ou\ngrampeamento (veja a\nfoto).\n\nCELINE ELAINE\nPUCINELLI RAMOS\n\nNOME\nMSC VIRTUOSA\n\n26/12/2026\nMSC VIRTUOSA\n\n26/12/2026\nCELINE ELAINE\nPUCINELLI RAMOS\n\nNome\nNÚMERO DA RESERVA\n\n75942907\n\nLIMITE DE\nBAGAGENS\n193567077\n\n11225 11\n\nAndar\n\nVI\n\nCabine\n\nCada hóspede poderá\nlevar:\naté duas malas por\npessoa (não excedendo\n90x75x43 cm de tamanho\ne 23 kg de peso por mala)\n+ até duas peças de\nbagagem de mão por\npessoa (não excedendo\n56x45x25 cm de tamanho\ne 23 kg de peso por\nmala).\nA quantidade máxima de\nbagagem em cada cabine\nnão deve exceder 100 kg\ne/ou 8 peças no total para\ntodos os hóspedes da\nmesma cabine.\n\nPARA FIXAR CORRETAMENTE A SUA\nETIQUETA, USE UM GRAMPEADOR, COLA\nOU FITA ADESIVA.\n\nIMPORTANTE: a segurança do\nporto tem o dever de revistar os\nhóspedes e suas bagagens para\nconfiscar qualquer item\ninternacionalmente conhecido\ncomo perigoso para garantir a\nsegurança dos hóspedes,\ntripulação e do navio. Tais itens\nserão confiscado e não serão\ndevolvidos. Além disso, se\nmateriais explosivos, armas ou\ndrogas ilegais forem\nencontradas, a polícia será\nimediatamente informada. A\nMSC Cruzeiros é forçada a negar\no acesso a qualquer hóspede que\nnão cumpra essas exigências.\nEm prol da saúde e da\nsegurança, alimentos e bebidas\n(incluindo os parcialmente\nconsumidos ou preparações\ncaseiras) também não podem ser\nlevados a bordo, com exceção de\nprodutos alimentícios secos,\ndevidamente lacrados e/ou\nembalados a vácuo. Objetos\nconsiderados frágeis, pessoais\ne/ou valiosos (joias, eletrônicos,\ndinheiro, documentos de\nviagem, carrinhos de bebê,\nmochilas, remédios, fraldas etc.)\ndevem ser transportados como\nbagagem de mão, sendo que a\nMSC Cruzeiros não se\nresponsabiliza por dano ou\nperda desses objetos. Certifiquese de manter seu\npassaporte/documento de\nidentificação e todos os\ndocumentos\npara fazer o check-in em mãos.\n\n\fPARA FIXAR CORRETAMENTE A SUA ETIQUETA,\nUSE UM GRAMPEADOR, COLA OU FITA\nADESIVA.\n\nITENS PROIBIDOS\nDESCARTAR\n\n11225 11\n\nCabin\n\nETIQUETAS DE BAGAGENS\n\nDeck\n\nVocê é responsável por\ngarantir que essas etiquetas\nestejam corretamente\nafixadas em todas as\nbagagens durante o\ntransporte. Por favor,\nverifique novamente na\nchegada ao aeroporto, se\naplicável. Observe que pode\nhaver um atraso no\nrecebimento de sua\nbagagem na cabine se ela\nnão estiver etiquetada ou\nnão estiver claramente\netiquetada.\n\nMANTENHA COM VOCÊ\n\nVI\n\n1. Dobre na linha\n\n193567078\n\npontilhada\n\n2. Enrole a etiqueta em\n\nNÚMERO DA RESERVA\n\n75942907\n\nvolta da alça da\nbagagem e feche com\nfita adesiva ou\ngrampeamento (veja a\nfoto).\n\nARAGAO DI LALLO CORDENUNZZI\n\nMONIQUE\n\nNOME\nMSC VIRTUOSA\n\n26/12/2026\nMSC VIRTUOSA\n\n26/12/2026\nMONIQUE\nARAGAO DI LALLO\nCORDENUNZZI\n\nNome\n\nNÚMERO DA RESERVA\n\n75942907\n\nLIMITE DE\nBAGAGENS\n193567078\n\n11225 11\n\nAndar\n\nVI\n\nCabine\n\nCada hóspede poderá\nlevar:\naté duas malas por\npessoa (não excedendo\n90x75x43 cm de tamanho\ne 23 kg de peso por mala)\n+ até duas peças de\nbagagem de mão por\npessoa (não excedendo\n56x45x25 cm de tamanho\ne 23 kg de peso por\nmala).\nA quantidade máxima de\nbagagem em cada cabine\nnão deve exceder 100 kg\ne/ou 8 peças no total para\ntodos os hóspedes da\nmesma cabine.\n\nPARA FIXAR CORRETAMENTE A SUA\nETIQUETA, USE UM GRAMPEADOR, COLA\nOU FITA ADESIVA.\n\nIMPORTANTE: a segurança do\nporto tem o dever de revistar os\nhóspedes e suas bagagens para\nconfiscar qualquer item\ninternacionalmente conhecido\ncomo perigoso para garantir a\nsegurança dos hóspedes,\ntripulação e do navio. Tais itens\nserão confiscado e não serão\ndevolvidos. Além disso, se\nmateriais explosivos, armas ou\ndrogas ilegais forem\nencontradas, a polícia será\nimediatamente informada. A\nMSC Cruzeiros é forçada a negar\no acesso a qualquer hóspede que\nnão cumpra essas exigências.\nEm prol da saúde e da\nsegurança, alimentos e bebidas\n(incluindo os parcialmente\nconsumidos ou preparações\ncaseiras) também não podem ser\nlevados a bordo, com exceção de\nprodutos alimentícios secos,\ndevidamente lacrados e/ou\nembalados a vácuo. Objetos\nconsiderados frágeis, pessoais\ne/ou valiosos (joias, eletrônicos,\ndinheiro, documentos de\nviagem, carrinhos de bebê,\nmochilas, remédios, fraldas etc.)\ndevem ser transportados como\nbagagem de mão, sendo que a\nMSC Cruzeiros não se\nresponsabiliza por dano ou\nperda desses objetos. Certifiquese de manter seu\npassaporte/documento de\nidentificação e todos os\ndocumentos\npara fazer o check-in em mãos.\n\n\f";
  const infoteraText = "Voucher: 607814\n\nReserva:\n\nAGAXTUR SHOPPING IBIRAPUERA\n\nHospedagem\n\nfcosta@agaxtur.com.br\nTelefone: (11)30907070\n\n Hospedagem\n\nLocalizador: 9111139149617\n\nPestana CR7 Lisboa    \nRua do Comércio 54\n\nCheck-in\n\nCheck-out\n\nNoites\n\nHóspedes\n\n04 fev 2027 15h\n\n06 fev 2027 meio-dia\n\n2 Noites\n\n2 Adultos\n\n Quarto superior, vista para a cidade - 1 cama de casal\nCafé da manhã continental, Buffet de café da manhã, Wi-Fi grátis\nDescrição: Quarto superior, vista para a cidade - 1 cama de casal\n\nHóspedes\n\nFaixa etária\n\nMaria D Assuncao Costa Yida\n\nAdulto\n\nJose Flauzino Da Silva\n\nAdulto\n\nPowered by infotera\n\nAGAXTUR SHOPPING IBIRAPUERA - Voucher: 607814\n\n1/6\n\n\fPoliticas:\nTermos e Condições da reserva: Para visualizar os Termos e Condições Clique aqui\nTermos e Condições da EPS: Para visualizar os Termos e Condições da EPS Clique aqui\nMandatory Fees:\n\nVocê deve pagar os seguintes encargos na propriedade. As tarifas podem incluir impostos:\nA cidade cobra um imposto de EUR 4.00 por pessoa, por diária até 7 diárias. Esse imposto não se aplica a crianças de até 13\nanos.\nListamos todas as cobranças que a propriedade nos forneceu.\nOptional Fees:\n\nTaxa de café da manhã continental: EUR 20 por pessoa\nEstacionamento pago nos arredores: EUR 28 por dia (1640 m de distância)\nA lista acima pode estar incompleta. As taxas e os depósitos podem não incluir impostos e estão sujeitos a mudanças.\nSpecial Instructions: A equipe da recepção vai receber os hóspedes no momento da chegada. A informação fornecida pela propriedade pode ser\ntraduzida com ferramentas automáticas de tradução.\nInformações do quarto:\n\n1 cama de casal\nQuarto com 16 metros quadrados e vista para a cidade\nConfiguração: quartos\nInternet: Wi-Fi grátis\nEntretenimento: TV 32 polegadas com canais a cabo\nAlimentação e bebida: serviço de quarto e minibar (podem ser aplicadas taxas)\nRepouso: cortinas blackout e roupas de cama\nBanheiro: banheiro privativo com banheira ou chuveiro (banheira de imersão disponível em alguns quartos)\nPraticidades: telefone e guarda-roupa ou closet\nConforto: ar-condicionado e serviço de arrumação diária\nSustentabilidade: lixeira de reciclagem\nPara não fumantes\nKnow before you go:\n\nA propriedade utiliza serviço de limpeza profissional.\nHá possibilidade de check-in sem contato e check-out sem contato.\nTelefones para contato com o hotel: COMERCIAL: 351-218-442001\nMandatory tax: Será cobrado EUR 16.0\nTaxas obrigatórias por quarto: Fees (Taxas obrigatórias por quarto): 16.00 EUR\n\nPowered by infotera\n\nAGAXTUR SHOPPING IBIRAPUERA - Voucher: 607814\n\n2/6\n\n\fVoucher: 607814\n\nReserva:\n\nAGAXTUR SHOPPING IBIRAPUERA\n\nHospedagem\n\nfcosta@agaxtur.com.br\nTelefone: (11)30907070\n\n Hospedagem\n\nLocalizador: 9111139149762\n\nHotel Acta Atrium Palace    \nGran Via Corts Catalanes 656\n\nCheck-in\n\nCheck-out\n\nNoites\n\nHóspedes\n\n20 fev 2027 15h\n\n23 fev 2027 meio-dia\n\n3 Noites\n\n2 Adultos\n\n Quarto casal - 2 camas de solteiro ou 1 cama Queen\nBuffet de café da manhã, Wi-Fi grátis\nDescrição: Quarto casal - 2 camas de solteiro ou 1 cama Queen\n\nHóspedes\n\nFaixa etária\n\nMaria D Assuncao Costa Yida\n\nAdulto\n\nJose Flauzino Da Silva\n\nAdulto\n\nPowered by infotera\n\nAGAXTUR SHOPPING IBIRAPUERA - Voucher: 607814\n\n3/6\n\n\fPoliticas:\nTermos e Condições da reserva: Para visualizar os Termos e Condições Clique aqui\nTermos e Condições da EPS: Para visualizar os Termos e Condições da EPS Clique aqui\nMandatory Fees:\n\nVocê deve pagar os seguintes encargos na propriedade. As tarifas podem incluir impostos:\nO imposto cobrado pela cidade deverá ser pago na propriedade. Observe que isenções ou reduções poderão ser aplicadas.\nPara mais detalhes, entre em contato com a propriedade usando as informações contidas no e-mail de confirmação da\nreserva.\nA cidade cobra um imposto de EUR 9.24 por pessoa, por diária até 7 diárias. Esse imposto não se aplica a crianças de até 17\nanos.\nListamos todas as cobranças que a propriedade nos forneceu.\nOptional Fees:\n\nTaxa de café da manhã com buffet: EUR 16 por pessoa\nA lista acima pode estar incompleta. As taxas e os depósitos podem não incluir impostos e estão sujeitos a mudanças.\nSpecial Instructions: Esta propriedade não realiza check-in após o horário comercial. A equipe da recepção vai receber os hóspedes no momento\nda chegada. Em caso de dúvidas, entre em contato com a propriedade usando os dados que estão na confirmação da reserva. A informação\nfornecida pela propriedade pode ser traduzida com ferramentas automáticas de tradução. Este estabelecimento não aceita hóspedes menores de\n18 anos de idade, a menos que acompanhados pelos pais ou responsáveis legais. este estabelecimento fica na zona de baixa emissão de\npoluentes da cidade, onde somente veículos de baixa emissão podem entrar. Os hóspedes com placas de fora da Espanha devem registrar o\nveículo na cidade com antecedência. O nome na reserva precisa ser igual ao nome no documento de identidade com foto apresentado no check-in.\nInformações do quarto:\n\n1 cama Queen OU 2 camas de solteiro\n23 metros quadrados\nConfiguração: quartos\nInternet: Wi-Fi grátis\nEntretenimento: TV de plasma com canais via satélite\nAlimentação e bebida: serviço de quarto 24 horas, minibar (podem ser aplicadas taxas) e garrafa de água de cortesia\nRepouso: roupa de cama premium, cortinas blackout e roupas de cama\nBanheiro: banheiro privativo com chuveiro/banheira combinados, roupões de banho e produtos de toalete de cortesia\nPraticidades: cofre, ferro/tábua de passar e espaço de trabalho para notebook, além de berços grátis disponíveis mediante\nsolicitação\nConforto: ar-condicionado com controle de temperatura, serviço de arrumação diária e aquecimento\nAcessibilidade: acessível para cadeira de rodas\nPara não fumantes\nKnow before you go:\n\nTransações em dinheiro nesta propriedade não podem exceder EUR 1000, devido a regulamentação nacional. Para mais\ndetalhes, entre em contato com a propriedade usando as informações na confirmação da reserva.\nHá possibilidade de check-in sem contato e check-out sem contato.\nTelefones para contato com o hotel: COMERCIAL: 34-933-42 80 00\nCOMERCIAL: 34-933-42 80 01\nMandatory tax: Será cobrado EUR 55.44\nTaxas obrigatórias por quarto: Fees (Taxas obrigatórias por quarto): 55.44 EUR\n\nPowered by infotera\n\nAGAXTUR SHOPPING IBIRAPUERA - Voucher: 607814\n\n4/6\n\n\f Informações gerais\nInformações Gerais\nPrezado passageiro,\nAntes da sua viagem, confira atentamente as orientações abaixo.\n\nCheck-in e Embarque\n- O Early Check-in e o Late Check-out estão sujeitos à disponibilidade do hotel e poderão gerar cobrança adicional.\n- Apresente-se para o embarque com a seguinte antecedência:\n- Voos nacionais: 2 horas;\n- Voos internacionais: 4 horas.\n- O não comparecimento ao embarque (no-show) poderá ocasionar o cancelamento dos trechos subsequentes, além de possíveis penalidades tarifárias ou até mesmo a\nperda total do bilhete.\nDocumentação\n- A documentação necessária para a viagem é de total responsabilidade do passageiro.\n- Para voos nacionais, é obrigatória a apresentação de documento original, válido ecom foto.\n- Para voos internacionais, é obrigatória a apresentação de passaporte válido, vistos edemais documentos exigidos pelo país de destino.\n- Recomendamos veriﬁcar previamente as exigências de passaporte, vacinas, vistos e eventuais formulários obrigatórios de imigração, saúde ou entrada exigidos pelo\npaís de destino e/ou países de conexão, junto às respectivas embaixadas e consulados.\n- Alguns países exigem passaporte com validade mínima de 6 meses e páginas embranco disponíveis.\nServiços Contratados\n- Os serviços reservados são válidos exclusivamente para as datas e horários confirmados neste voucher.\n- Alterações voluntárias estão sujeitas às regras da companhia aérea, dos fornecedores e às condições tarifárias aplicáveis.\n- Algumas tarifas e serviços não permitem alteração ou reembolso após a confirmação da compra.\n- Franquia de bagagem, marcação antecipada de assentos, pré-seleção gratuita deassentos e demais serviços adicionais poderão não estar incluídos na tarifaadquirida,\nestando sujeitos às regras e cobranças da companhia aérea e/ou fornecedor contratado.\nLocação de Veículos\n- Quaisquer seguros, serviços ou produtos contratados diretamente junto à locadora no momento da retirada do veículo serão de inteira responsabilidade do cliente,\nincluindo seus respectivos custos.\n- Motoristas adicionais que não estiverem expressamente informados como cortesia neste voucher poderão gerar cobrança adicional pela locadora.\n- Atenção às coberturas incluídas em sua reserva. No momento da retirada do veículo, é comum que a locadora ofereça seguros e serviços adicionais.\n- Recomendamos confirmar previamente com seu consultor quais coberturas já estão incluídas em sua reserva e contratar apenas os serviços adicionais que considerar\nnecessários.\nPasseios e Traslados\n- Os passeios terão datas e horários definidos pelo operador local, salvo quando previamente informados no momento da reserva.\n- Nos serviços de traslado com recepção no aeroporto, o representante estará identificado e orientará o passageiro até o transporte contratado.\n- Os pontos de encontro podem variar conforme o aeroporto, hotel ou local de embarque.\n- Siga rigorosamente as informações contidas em seu voucher de confirmação, respeitando sempre as datas, horários e locais indicados.\nTraslados com Recepção no Aeroporto\nAo desembarcar, observe as seguintes orientações:\n- O representante do receptivo local estará na área de desembarque e poderá estar identificado por meio de placa contendo:\n- o nome da Agaxtur;\n- o nome do passageiro;\n- o nome do receptivo local; ou\n- o nome da agência de viagens.\n- Os motoristas e representantes aguardam no desembarque por até 1 hora após o horário de pouso do voo.\nPolítica de Bagagem nos Traslados\n- É permitida 1 mala de até 23 kg por passageiro.\n- Caso necessite transportar bagagens adicionais ou com peso excedente, consulteseu agente de viagens com antecedência para veriﬁcação de disponibilidade\ne eventual orçamento.\n- Recomendamos revisar seu voucher antes do desembarque para confirmar o localexato do encontro e evitar contratempos relacionados ao transporte ou à bagagem.\nTaxas e Cobranças Locais\n- Taxas locais, como resort fees, taxas municipais ou outras cobranças obrigatórias do destino, poderão ser cobradas diretamente pelo estabelecimento.\nAssistência Durante a Viagem\n- Em caso de dúvidas, alterações ou imprevistos relacionados aos serviços contratados, entre em contato inicialmente com o fornecedor indicado no voucher.\n- Caso algum serviço não seja prestado ou seja interrompido, solicite ao fornecedor uma declaração formal informando o motivo da ocorrência.\n- Se houver seguro viagem contratado, em caso de sinistro, entre em contato diretamente com a seguradora por meio dos canais informados na apólice.\n\nSuporte Agaxtur\nCaso não consiga contato com nossos parceiros locais durante a viagem, nosso suporteemergencial estará disponível pelos seguintes canais:\nTelefone / WhatsApp: +55 11 3067-0879\n\nPowered by infotera\n\nAGAXTUR SHOPPING IBIRAPUERA - Voucher: 607814\n\n5/6\n\n\f Contato\nAtenciosamente\nmarinna\nmarinna.cardoso@agaxtur.com.br\n\nTelefone: (11) 3090-7070\n\nPowered by infotera\n\nAGAXTUR SHOPPING IBIRAPUERA - Voucher: 607814\n\n6/6\n\n\f";
  const kroozeText = "Agência:\n\nAgaxtur Shopping Ibirapuera\n\nAvenida Ibirapuera 3103\n\nConsultor:\n\nMarinna Cardoso\n\nLojas 509 510 Piso Jurupis\n\nE-mail:\n\natendimento5.ibirapuera1@agaxtur.com.br\n\nSão Paulo - SP\n\nTelefone:\n\n55 11 30907070\n\n04029-200\n\nIdentificador\n\nStatus\n\nTarifas\n\nTaxas\n\nTotal\n\nCR-0E92F2A329\n\nEmitido\n\nBRL 33408,10\n\nBRL 3024,00\n\nBRL 36432,10\n\nServiço\nInício - 03/01/2027\n\nFim - 19/10/2026\n\nFornecedor\n\nStatus - Emissão\nDetalhes\nUndefined)\nMSC Cruzeiros\n\nPassageiros\nSONIA CRESPO VILAR\n(ADT)\nSALIM HADDAD NETTO\n(ADT)\n\nCategoria\n\nInfo\n\nValor\n\nMarítimo - Opcional\n\n-\n\nBRL 0,00\n\nServiço Descrição\n- Marítimo - Opcional\n\nInício - 03/01/2027\n\nFim - 19/10/2026\n\nFornecedor\n\nStatus - Emissão\nDetalhes\n\nTaxa de Serviço de Hotel –\nMSC Yacht Club\nMSC Cruzeiros\n\nPassageiros\nSONIA CRESPO VILAR\n(ADT)\nSALIM HADDAD NETTO\n(ADT)\n\nCategoria\n\nInfo\n\nValor\n\nMarítimo - Opcional\n\n-\n\nBRL 1694,00\n\nServiço Descrição\n- Marítimo - Opcional\n\nSeguro\nDestino -\n\nInício - 03/01/2027\n\nFim - 10/01/2027\n\nSeguradora\n\nDescrição\n\nPlano: Europ Assistance\nPremium - 29 Motivos\n\nStatus - Emissão\nSegurados\n\nApólice\n\nValor\n\nPlano: Apólice não\ndisponível\n\nBRL 480,00\n\nTarifa\n\nNavio\n\nValor\n\nPREMIUM EXTRA\nINCLUSO\n\nMSC SEAVIEW\n\nBRL\n34258,10\n\nSONIA CRESPO VILAR\n(65 anos)\nSALIM HADDAD NETTO\n(85 anos)\n\nMarítimo\nSANTOS, BRASIL - SANTOS, BRASIL\nFornecedor\n\nPartida - 03/01/2027 00:00\nItinerário\n\nChegada - 10/01/2027 00:00\nPassageiros\nSUÍTE DELUXE - YACHT\nCLUB(YC1)\nCabine: 16003)\n\nMSC CRUZEIROS\n\nabout:blank\n\nSONIA CRESPO VILAR\n(ADT)\nSALIM HADDAD NETTO\n(ADT)\n\n1/2\n\n\fCabine\n\nPassageiros\n\nSUÍTE DELUXE - YACHT\nCLUB(YC1)\nCabine: 16003\n\nSONIA CRESPO VILAR (ADT)\nSALIM HADDAD NETTO (ADT)\n\nObservações Importantes\nVoucher Serviços\nInformações Importantes/Important Informations\n- Leia com atenção todas as informações contidas no voucher. Caso haja algum imprevisto em qualquer um dos serviços contratados, favor entrar em\ncontato primeiramente com o fornecedor do serviço através do telefone especificado no voucher. No caso de serviços interrompidos ou incompletos, exija\nsempre uma declaração escrita do prestador informando o motivo da não prestação. Se você comprou passeios, as datas e horários serão marcados pelo\noperador local exceto quando confirmados no ato da reserva.\nSeguro e Assistência de viagem:\n- Se contratado seguro viagem, é um item necessário para uma viagem tranquila. Em caso sinistro deve ser contatado de imediato a seguradora através\ndo telefone informado no cartão de assistência do seguro.\nTraslados:\n- Se contratado traslado, ao desembarcar você será recepcionado por um representante que estará com uma placa de identificação com seu nome ou\noperadora, caso contrario você deve se dirigir-se ao ponto de encontro indicado no seu voucher.\nInformações ao Fornecedor/Information to Supplier\n- ESTE DOCUMENTO NÃO É TRANSFERÍVEL, NEGOCIÁVEL OU REEMBOLSÁVEL. Solicitamos cobrar diretamente dos clientes quaisquer despesas\nadicionais ou extras. A agência não se responsabiliza pelas despesas extras deixadas pelos hóspedes. THIS COUPON IS NOT TRANSFERABLE, NOT\nNEGOTIABLE, NOT REFUNDABLE. Please collect directly from clients the cost of all miscellaneous expenses and extra charges. Should clients checkout\nwithout paying their extras. Agência will not be held responsible.\nImprevistos:\n- Caso haja algum imprevisto em sua viagem, favor entrar em contato primeiramente com os nossos fornecedores através dos telefones informados\nacima, especificando sempre os números de reserva. Se por alguma razão não for possível o contato inicialmente com nossos parceiros em seu destino,\nentre em contato com o nosso suporte de emergências: +55 11 95735-4657 (WhatsApp ou Ligação).\n\nObrigado pela preferência!\nA Agaxtur Deseja Uma Excelente Experiência!\n- Caso haja algum imprevisto em sua viagem, favor entrar em contato primeiramente com os nossos fornecedores através dos telefones informados\nacima, especificando sempre os números de reserva. Se por alguma razão não for possível o contato inicialmente com nossos parceiros em seu destino,\nentre em contato com o nosso suporte de emergências: +55 11 95735-4657 (WhatsApp ou Ligação).\n\nabout:blank\n\n2/2\n\n\f";
  const travellinkText = "Reserva Aérea - Plano de Viagem\nUsuário: Marinna Cardoso\nE-mail: atendimento5.ibirapuera1@agaxtur.com.br\nTelefone: 55 11 30907070\n\nReserva\nLocalizador Prazo Status\n\nOABIUA\n\n---\n\nSistema\n\nCriação\n\nSET\nEmit ido Tr av ellink_CNT 07\n15: 32\n\nContatos\nAgência\n+55 11 30907070\n+55 11 306709001\n+55 11 30670900 A gax t ur Shopping Ibir apuer a\n+55 11 999907104\n+55 11 999907104\n\nPassageiros\nTipo\nA dult o\n\nSobrenome\nCOELHO\n\nNome\nROSA NA\n\nSexo\nFeminino\n\nNascimento\n17/ 11/ 75\n\nFidelidade\n\nStatus\nEmit ido\n\nVoos\nCia\n\nOrigem / Destino\n\nVoo\n\nCGH - SAO PAULO\n\nSSA - SALVADOR\n\n19 Dez 2026 16:00\n\n19 Dez 2026 18:20\n\nSSA - SALVADOR\n\nCGH - SAO PAULO\n\n01 Jan 2027 18:50\n\n01 Jan 2027 21:30\n\nMochila ou bolsa\n\nBagagem de mão\n\nG3 1634\n\nG3 1639\n\nBagagem despachada\n\nEsc. Cl.\n0\n\n0\n\nInfo\n\nLoc Cia\n\nU\n\nFamília: LIGHT\nAvião: 738\nBase\nUNAIAG2JCN\nTar:\n\nOABIUA\n\nU\n\nFamília: LIGHT\nAvião: 7M8\nBase\nUNAIAG2JCN\nTar:\n\nOABIUA\n\nContém\n\nNão contém\n\nInfo. Indisponível\n\nAssentos\nPassageiro\nCOELHO/ ROSA NA\n\nG31634 CGH SSA 19Dez\n---\n\nG31639 SSA CGH 01Jan\n---\n\nServiços Auxiliares\nPassageiro\nCOELHO/ ROSA NA\n\nG31634 CGH SSA 19Dez\n---\n\nG31639 SSA CGH 01Jan\n---\n\nBilhetes\nNúmero\n127- 2311356591\n\nLocalizador\nOA BIUA\n\nPassageiro\nCOELHO/ ROSA NA\n\nData Emissão\n07/ 09/ 2026\n\nConjugados\n-\n\n- Confirme sempre nomes, datas, trechos e voos antes da emissão. Após a emissão pode não ser possível alterá-los ou ter algum custo.\n- Tarifas e disponibilidades sujeitas a alterações sem prévio aviso.\n- Somente a emissão do bilhete garante a tarifa.\n- Algumas tarifas não permitem alterações e/ou reembolso após a compra. Caso julgue necessário ter esta informação, consulte-nos.\n- Algumas tarifas não permitem marcação e/ou escolha de assentos. Caso julgue necessário ter esta informação, consulte-nos.\n- Apresente-se no Check-in com 2 horas de antecedência em voos nacionais, portando o documento de identidade Original, ou com 3 horas\nem voos internacionais, portando o passaporte e os vistos necessários para entrada no país de destino.\n- O não comparecimento para o embarque (no-show) em qualquer voo cancela os voos subsequentes. Em alguns casos, perde-se o bilhete,\nimpossibilitando alteração e/ou reembolso.\n- Para viagens de/para os EUA, ou que incluam voos que sobrevoem o território americano, é mandatório informar o nome completo\n(conforme o passaporte), a data de nascimento e o sexo no momento da emissão.\n- Informações sobre validade de passaporte, vacinas e vistos que possam ser necessários para sua viagem e devem ser consultados com\nas respectivas embaixadas ou despachantes de vistos. Verifique essa necessidade para todos os países envolvidos na viagem, mesmo\naqueles onde há apenas uma escala. Lembre-se de que alguns países exigem que o passaporte tenha uma validade mínima de 6 meses para\no embarque.\n\n\f";

  it('Modelo 1: MSC Cruzeiros - deve extrair reserva, navio, cabine, passageiros e itinerário dia a dia de 8 dias', () => {
    // Action

    const extraidos = StudioExtractionService.analisarTextoDocumento(mscText, 'Thiago2.pdf');
    const loc = StudioExtractionService.extrairLocalizador(mscText);
    const itinerarioDias = StudioExtractionService.gerarItinerarioDias(extraidos);
    const parsed = parsePnrText(mscText);

    // Assert
    expect(loc).toBe('75942907');
    expect(extraidos.cruzeiros).toBeDefined();
    expect(extraidos.cruzeiros!.length).toBeGreaterThan(0);

    const crz = extraidos.cruzeiros![0];
    expect(crz.navio).toContain('MSC Virtuosa');
    expect(crz.cabine).toBe('11225');
    expect(crz.deck).toBe('11');
    expect(crz.categoria).toBe('Balcony');
    expect(crz.experiencia).toBe('FANTASTICA');
    expect(crz.portoEmbarque).toContain('Santos');
    expect(crz.dataEmbarque).toBe('2026-12-26');

    // Passageiros
    expect(extraidos.passageiros).toBeDefined();
    const nomesPax = extraidos.passageiros!.map(p => p.nome.toUpperCase());
    expect(nomesPax.some(n => n.includes('CELINE ELAINE'))).toBe(true);
    expect(nomesPax.some(n => n.includes('MONIQUE'))).toBe(true);

    // Itinerário dia a dia (Opção A: Desmembrar escalas dia a dia)
    expect(itinerarioDias.length).toBeGreaterThanOrEqual(7);
    const portos = crz.itinerarioEscalas!.map(e => e.porto);
    expect(portos.some(p => p.includes('Santos'))).toBe(true);
    expect(portos.some(p => p.includes('Búzios') || p.includes('Buzios'))).toBe(true);
    expect(portos.some(p => p.includes('Salvador'))).toBe(true);
    expect(portos.some(p => p.includes('Copacabana'))).toBe(true);
    expect(portos.some(p => p.includes('Ilhabela'))).toBe(true);

    // Serviços adicionais
    expect(crz.servicosAdicionais).toBeDefined();
    expect(crz.servicosAdicionais!.some(s => s.includes('EASY PACKAGE'))).toBe(true);
    expect(crz.servicosAdicionais!.some(s => s.includes('HOTEL SERVICE CHARGE'))).toBe(true);

    // Parsed PNR produtos
    expect(parsed.produtos).toBeDefined();
    expect(parsed.produtos!.some(p => p.tipo === 'MARÍTIMO')).toBe(true);
  });

  it('Modelo 2: Agaxtur Infotera - deve desmembrar múltiplos hotéis (Pestana e Acta) com seus respectivos localizadores e datas', () => {
    // Action

    const extraidos = StudioExtractionService.analisarTextoDocumento(infoteraText, 'thiago1.pdf');
    const locGeral = StudioExtractionService.extrairLocalizador(infoteraText);
    const parsed = parsePnrText(infoteraText);

    // Assert
    expect(locGeral).toBe('607814');
    expect(extraidos.hospedagens).toBeDefined();
    expect(extraidos.hospedagens!.length).toBe(2);

    // Hotel 1: Pestana CR7 Lisboa
    const h1 = extraidos.hospedagens![0];
    expect(h1.hotel).toContain('Pestana CR7 Lisboa');
    expect(h1.voucher).toBe('9111139149617');
    expect(h1.checkIn).toBe('2027-02-04');
    expect(h1.checkOut).toBe('2027-02-06');
    expect(h1.quarto).toContain('Quarto superior');
    expect(h1.taxas).toContain('16.00');

    // Hotel 2: Hotel Acta Atrium Palace
    const h2 = extraidos.hospedagens![1];
    expect(h2.hotel).toContain('Hotel Acta Atrium Palace');
    expect(h2.voucher).toBe('9111139149762');
    expect(h2.checkIn).toBe('2027-02-20');
    expect(h2.checkOut).toBe('2027-02-23');
    expect(h2.quarto).toContain('Quarto casal');
    expect(h2.taxas).toContain('55.44');

    // Hóspedes
    expect(extraidos.passageiros).toBeDefined();
    const nomes = extraidos.passageiros!.map(p => p.nome.toUpperCase());
    expect(nomes.some(n => n.includes('MARIA D ASSUNCAO') || n.includes('COSTA YIDA'))).toBe(true);
    expect(nomes.some(n => n.includes('JOSE FLAUZINO') || n.includes('DA SILVA'))).toBe(true);

    // Parsed PNR produtos
    expect(parsed.produtos!.length).toBe(2);
    expect(parsed.produtos![0].tipo).toBe('HOTEL');
    expect(parsed.produtos![1].tipo).toBe('HOTEL');
    expect(parsed.produtos![0].codigoReserva).toBe('9111139149617');
    expect(parsed.produtos![1].codigoReserva).toBe('9111139149762');
  });

  it('Modelo 3: Agaxtur Krooze - deve desmembrar multisserviço (Marítimo R$ 34.258,10, Taxa Serviço R$ 1.694,00 e Seguro R$ 480,00)', () => {
    // Action

    const extraidos = StudioExtractionService.analisarTextoDocumento(kroozeText, 'Sonia_+_Salim_03jan27_MSC_Seaview.pdf');
    const loc = StudioExtractionService.extrairLocalizador(kroozeText);
    const parsed = parsePnrText(kroozeText);

    // Assert
    expect(loc).toBe('CR-0E92F2A329');
    expect(extraidos.valores?.total).toBe(36432.10);

    // Passageiros
    expect(extraidos.passageiros).toBeDefined();
    const nomes = extraidos.passageiros!.map(p => p.nome.toUpperCase());
    expect(nomes.some(n => n.includes('SONIA CRESPO VILAR'))).toBe(true);
    expect(nomes.some(n => n.includes('SALIM HADDAD NETTO'))).toBe(true);

    // Serviços Krooze
    expect(extraidos.servicos).toBeDefined();
    const taxaServ = extraidos.servicos!.find(s => s.tipo === 'Taxa de Serviço');
    expect(taxaServ).toBeDefined();
    expect(taxaServ!.valor).toBe(1694.00);

    const seguro = extraidos.servicos!.find(s => s.tipo === 'Seguro Viagem');
    expect(seguro).toBeDefined();
    expect(seguro!.fornecedor).toBe('Europ Assistance');
    expect(seguro!.valor).toBe(480.00);

    // Parsed PNR produtos
    expect(parsed.produtos).toBeDefined();
    expect(parsed.produtos!.some(p => p.tipo === 'MARÍTIMO')).toBe(true);
    expect(parsed.produtos!.some(p => p.tipo === 'TAXAS')).toBe(true);
    expect(parsed.produtos!.some(p => p.tipo === 'SEGURO')).toBe(true);
  });

  it('Modelo 4: Agaxtur Travellink GOL - deve extrair localizador OABIUA, e-ticket 127 e os 2 trechos de voo G3 1634 e G3 1639', () => {
    // Action

    const extraidos = StudioExtractionService.analisarTextoDocumento(travellinkText, 'Rosana_Aereo_GOL.pdf');
    const loc = StudioExtractionService.extrairLocalizador(travellinkText);
    const parsed = parsePnrText(travellinkText);

    // Assert
    expect(loc).toBe('OABIUA');

    // Passageira
    expect(extraidos.passageiros).toBeDefined();
    const nomePax = extraidos.passageiros![0].nome.toUpperCase();
    expect(nomePax).toContain('ROSA NA COELHO');

    // E-ticket
    expect(extraidos.bilhetes).toBeDefined();
    expect(extraidos.bilhetes!.some(b => b.numero.includes('127-2311356591'))).toBe(true);

    // Voos
    expect(extraidos.voos).toBeDefined();
    expect(extraidos.voos!.length).toBe(2);

    // Voo Ida: G3 1634 CGH -> SSA em 2026-12-19
    const ida = extraidos.voos![0];
    expect(ida.voo).toContain('G3 1634');
    expect(ida.origem).toBe('CGH');
    expect(ida.destino).toBe('SSA');
    expect(ida.dataIda).toBe('2026-12-19');
    expect(ida.horaIda).toBe('16:00');

    // Voo Volta: G3 1639 SSA -> CGH em 2027-01-01
    const volta = extraidos.voos![1];
    expect(volta.voo).toContain('G3 1639');
    expect(volta.origem).toBe('SSA');
    expect(volta.destino).toBe('CGH');
    expect(volta.dataIda).toBe('2027-01-01');
    expect(volta.horaIda).toBe('18:50');

    // Parsed PNR
    expect(parsed.voos.length).toBe(2);
    expect(parsed.produtos!.length).toBe(2);
    expect(parsed.produtos![0].tipo).toBe('AÉREO OPERADORA');
  });
});
