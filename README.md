# DocMind IA — Arquitetura Serverless para Gestão de Documentos

Projeto de conclusão de curso (TCC) da **Escola da Nuvem**, com uma arquitetura serverless na AWS para ingestão, autenticação e retenção de longo prazo de documentos usados como matéria-prima de treinamento de modelos de IA.

**🔗 Site publicado (GitHub Pages):** https://felipemaya14.github.io/docmind-ia-tcc/

| Página | Descrição | Link |
|---|---|---|
| `index.html` | Apresentação de defesa do projeto (slides interativos) | [Abrir apresentação](https://felipemaya14.github.io/docmind-ia-tcc/) |
| `demo.html` | Demonstração funcional do fluxo de upload/download | [Abrir demo](https://felipemaya14.github.io/docmind-ia-tcc/demo.html) |

---

## O problema

A DocMind IA opera um agente de IA que extrai dados de documentos (PDFs, imagens, contratos). Cada documento enviado não é apenas um arquivo do cliente — é matéria-prima usada para treinar os próximos modelos da empresa, o que significa que **nada pode ser descartado**.

Isso cria uma tensão de três pontas a resolver:

- **~50.000 arquivos novos por mês**, crescendo junto com a base de clientes;
- **acesso rápido** esperado pelo cliente durante o primeiro ano;
- **retenção eterna**, sem que o custo de armazenamento cresça na mesma proporção do volume ao longo do tempo.

## Visão geral da arquitetura

A solução é 100% serverless, dividida em três papéis:

1. **Entrada** — recebe e autentica a requisição (Amazon Cognito + API Gateway).
2. **Mediação** — decide o que cada usuário pode ver e gera o acesso (AWS Lambda).
3. **Retenção** — guarda os arquivos e rebaixa o custo de armazenamento automaticamente com o tempo (Amazon S3 + Lifecycle).

### Fluxo

```
Cliente → Cognito (login, uma vez por sessão)
Cliente → API Gateway (autenticado via token JWT, a cada requisição)
API Gateway → Lambda (gera URL assinada de curta duração)
Cliente → S3 (upload/download direto via URL assinada)
S3 → Lifecycle (após 365 dias) → Glacier Deep Archive (automático)
```

### Serviços utilizados

| Serviço | Papel |
|---|---|
| **Amazon Cognito** | Cadastro, login e emissão de token JWT |
| **API Gateway** | Porta de entrada única, com usage plans e API keys por cliente |
| **AWS Lambda** | Autorização granular e geração de URLs assinadas (sem servidor 24/7) |
| **Amazon S3** | Armazenamento com Lifecycle automático para Glacier Deep Archive |

## Segurança — cinco camadas independentes

1. **Autenticação** via Cognito — toda requisição exige um token JWT válido.
2. **Block Public Access** no bucket S3 — sem porta de entrada pública, apenas via URL assinada.
3. **IAM de menor privilégio** — cada permissão faz exatamente uma coisa.
4. **Isolamento por prefixo** — cada usuário só acessa a própria pasta (`usuario-{sub}/`), usando o `sub` do token Cognito como chave, impossível de forjar pelo lado do cliente.
5. **URLs assinadas de curta duração** — o link de acesso expira em minutos e aponta para um único arquivo.

## Escalabilidade e resiliência

Infraestrutura 100% serverless: o Lambda escala instâncias automaticamente sob demanda, e o S3 replica cada objeto entre múltiplas zonas de disponibilidade por padrão — sem configuração adicional.

## Custos (calculadora ao vivo, preços AWS de julho/2026)

Para 50.000 arquivos/mês, 2 MB em média, ao longo de 3 anos:

- Armazenamento no S3 é praticamente 100% da conta — Lambda e API Gateway ficam dentro da cota gratuita nessa escala.
- Cognito cobra por usuário ativo mensal (MAU), não por volume de arquivo, então não pesa no cálculo.

### Cenários

| Cenário | Custo/mês | Características |
|---|---|---|
| **Enxuto (MVP)** | ~$30 | HTTP API + Lambda em ARM |
| **Proposta (deste projeto)** | ~$31 | Arquitetura descrita acima |
| **Escala (enterprise)** | ~$3.050 | 10x volume + WAF, CloudFront, réplica cross-region, Provisioned Concurrency |

> O salto de custo do cenário Escala não vem do volume de arquivos — vem de decisões de redundância. A réplica em outra região, sozinha, praticamente dobra o custo de armazenamento. É o preço real de ter uma cópia completa e pronta em outra parte do mundo, não uma ineficiência da arquitetura.

## Replicabilidade

O projeto é documentado para ser reproduzido como referência de arquitetura serverless para retenção de documentos em escala, com justificativas técnicas para cada escolha de serviço.

## Estrutura do repositório

```
.
├── index.html   # Apresentação de defesa (slides interativos, navegação por teclado)
└── demo.html    # Demonstração funcional do fluxo de upload/download
```

A apresentação (`index.html`) é navegável por teclado:

| Tecla | Ação |
|---|---|
| `←` / `→` | Navegar entre slides |
| `N` | Abrir notas do apresentador |
| `G` | Abrir glossário de termos técnicos |
| clique no relógio (topo) | Iniciar/pausar cronômetro regressivo de 15 min |

## Publicação

Este site é hospedado via **GitHub Pages**, servindo os arquivos estáticos diretamente da branch `main`.

## Equipe

Projeto desenvolvido como parte do currículo da **Escola da Nuvem** pela equipe:

- Ricardo Silva
- Felipe Maya
- Igor
