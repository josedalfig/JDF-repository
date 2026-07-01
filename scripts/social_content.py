#!/usr/bin/env python3
"""
social_content.py — Viajar sem Destino daily social media automation
Pilar 1 "Quanto custa?": busca as 3 rotas com melhor custo de hoje,
gera posts Instagram e X via Claude API, envia rascunhos ao Buffer.
"""

import os
import sys
import json
import requests
from datetime import date, timedelta
import anthropic

ROUTES_HISTORY_FILE = os.path.expanduser('~/.vsd_recent_routes.json')

CMO_LOG_DIR = os.path.expanduser('~/Documents/Pessoal/Claude Cowork/empresa-solo/CMO')
CMO_PROJECT = 'vsd'


def read_donna_voice() -> str:
    try:
        with open(os.path.join(CMO_LOG_DIR, 'VOZ.md')) as f:
            return f.read().strip()
    except OSError:
        return ''


def read_cmo_log(days: int = 10) -> str:
    log_path = os.path.join(CMO_LOG_DIR, f'{CMO_PROJECT}-log.md')
    cutoff = date.today() - timedelta(days=days)
    entries = []
    try:
        with open(log_path) as f:
            for line in f:
                s = line.strip()
                if not s or s.startswith('#') or s.startswith('<!--') or s in ('---', '(vazio — comece a preencher)'):
                    continue
                try:
                    if date.fromisoformat(s[1:11]) >= cutoff:
                        entries.append(s)
                except (ValueError, IndexError):
                    continue
    except OSError:
        pass
    return '\n'.join(entries) if entries else 'Nenhum post registrado ainda.'


def append_cmo_log(rede: str, tema: str, primeira_linha: str):
    os.makedirs(CMO_LOG_DIR, exist_ok=True)
    log_path = os.path.join(CMO_LOG_DIR, f'{CMO_PROJECT}-log.md')
    if not os.path.exists(log_path):
        with open(log_path, 'w') as f:
            f.write(f'# LOG — Social {CMO_PROJECT.upper()}\n\nFormato: `[DATA] [REDE] tema — abertura`\n\n---\n\n')
    with open(log_path, 'a') as f:
        f.write(f'[{date.today()}] [{rede}] {tema} — {primeira_linha[:120]}\n')

SUPABASE_URL      = 'https://fdpgeacfeyzaocsqszyw.supabase.co/rest/v1'
SUPABASE_ANON_KEY = os.environ['VSD_SUPABASE_ANON_KEY']
ANTHROPIC_API_KEY = os.environ['ANTHROPIC_API_KEY']
BUFFER_ACCESS_TOKEN  = os.environ['BUFFER_ACCESS_TOKEN_VSD']
BUFFER_CHANNEL_INSTA = os.environ['BUFFER_PROFILE_ID_INSTAGRAM_VSD']
BUFFER_CHANNEL_X     = os.environ['BUFFER_PROFILE_ID_X_VSD']
BUFFER_ORG_ID        = os.environ['BUFFER_ORG_ID_VSD']
BUFFER_GRAPHQL       = 'https://api.buffer.com/graphql'

# IATA → nome legível
IATA_NAMES = {
    'POA': 'Porto Alegre',      'GRU': 'São Paulo (GRU)',   'GIG': 'Rio de Janeiro',
    'BSB': 'Brasília',          'SSA': 'Salvador',           'FOR': 'Fortaleza',
    'REC': 'Recife',            'MAN': 'Manaus',             'BEL': 'Belém',
    'CWB': 'Curitiba',          'FLN': 'Florianópolis',      'NAT': 'Natal',
    'MCZ': 'Maceió',            'SDU': 'Rio (Santos Dumont)','CGH': 'São Paulo (Congonhas)',
    'VCP': 'Campinas',          'AJU': 'Aracaju',
    # Internacional
    'LIS': 'Lisboa',            'OPO': 'Porto',              'MAD': 'Madrid',
    'BCN': 'Barcelona',         'MIA': 'Miami',              'JFK': 'Nova York',
    'MCO': 'Orlando',           'CDG': 'Paris',              'LHR': 'Londres',
    'FCO': 'Roma',              'AMS': 'Amsterdã',           'DXB': 'Dubai',
    'NRT': 'Tóquio',            'BKK': 'Bangkok',            'EZE': 'Buenos Aires',
    'SCL': 'Santiago',          'BOG': 'Bogotá',             'LIM': 'Lima',
    'CUN': 'Cancún',            'MXP': 'Milão',              'ZRH': 'Zurique',
}

# Aeroportos domésticos relevantes (top 10 + Congonhas/Santos Dumont)
MAJOR_DOMESTIC = {
    'GRU', 'CGH', 'SDU', 'GIG', 'BSB', 'SSA', 'FOR', 'REC', 'CWB', 'POA', 'FLN', 'NAT', 'BEL', 'MAN',
}

# Hubs para rotas internacionais
INTL_HUBS = {'GRU', 'GIG'}

# Destinos internacionais aceitos
INTL_DESTINATIONS = {
    'LIS', 'OPO', 'MAD', 'BCN', 'MIA', 'JFK', 'MCO', 'CDG', 'LHR', 'FCO',
    'AMS', 'DXB', 'NRT', 'BKK', 'EZE', 'SCL', 'BOG', 'LIM', 'CUN', 'MXP', 'ZRH',
}


def iata_name(code: str) -> str:
    return IATA_NAMES.get(code, code)


def load_recent_routes(days: int = 7) -> set:
    """Rotas postadas nos últimos N dias (evita repetição)."""
    try:
        with open(ROUTES_HISTORY_FILE) as f:
            history = json.load(f)
        cutoff = str(date.today() - timedelta(days=days))
        return {r['route'] for r in history if r['date'] >= cutoff}
    except (FileNotFoundError, json.JSONDecodeError):
        return set()


def save_used_routes(routes: list[str]):
    """Salva as rotas usadas hoje no histórico."""
    try:
        with open(ROUTES_HISTORY_FILE) as f:
            history = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        history = []
    today = str(date.today())
    for r in routes:
        history.append({'date': today, 'route': r})
    # Mantém apenas últimos 30 dias
    cutoff = str(date.today() - timedelta(days=30))
    history = [h for h in history if h['date'] >= cutoff]
    with open(ROUTES_HISTORY_FILE, 'w') as f:
        json.dump(history, f)


# ── Data fetching ────────────────────────────────────────────────────────────

def fetch_best_deals(target_date: date) -> tuple[list[dict], bool]:
    """Melhores preços únicos por rota relevante nos últimos 7 dias.
    Retorna (deals, has_fresh_data) onde has_fresh_data=True se há dados de hoje ou ontem."""
    since = f'{target_date - timedelta(days=7)}T00:00:00+00:00'
    fresh_since = f'{target_date - timedelta(days=1)}T00:00:00+00:00'
    params = {
        'select':    'origin_iata,dest_iata,price,fetched_at',
        'fetched_at': f'gte.{since}',
        'order':     'price.asc',
        'limit':     '200',
    }
    resp = requests.get(
        f'{SUPABASE_URL}/price_history',
        params=params,
        headers={
            'apikey':        SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        },
        timeout=15,
    )
    resp.raise_for_status()
    rows = resp.json()

    has_fresh = any(r['fetched_at'] >= fresh_since for r in rows)

    # Filtra rotas relevantes
    def is_relevant(r) -> bool:
        orig, dest = r['origin_iata'], r['dest_iata']
        # Doméstico: ambos aeroportos relevantes
        if orig in MAJOR_DOMESTIC and dest in MAJOR_DOMESTIC:
            return True
        # Internacional: saindo de hub e destino conhecido
        if orig in INTL_HUBS and dest in INTL_DESTINATIONS:
            return True
        return False

    relevant = [r for r in rows if is_relevant(r)]

    # Deduplica: melhor preço por rota única
    seen = {}
    for r in relevant:
        key = (r['origin_iata'], r['dest_iata'])
        if key not in seen or r['price'] < seen[key]['price']:
            seen[key] = r

    # Filtra rotas recentes para evitar repetição entre dias
    recent_routes = load_recent_routes(days=7)
    fresh_candidates = [r for r in seen.values() if f"{r['origin_iata']}-{r['dest_iata']}" not in recent_routes]

    # Se todos já foram usados, usa pool completo (melhor repetir do que não postar)
    pool = fresh_candidates if fresh_candidates else list(seen.values())
    unique = sorted(pool, key=lambda r: r['price'])[:5]

    deals = [
        {
            'from':  iata_name(r['origin_iata']),
            'to':    iata_name(r['dest_iata']),
            'price': r['price'],
            'route_key': f"{r['origin_iata']}-{r['dest_iata']}",
        }
        for r in unique
    ]
    return deals, has_fresh


# ── Post generation ──────────────────────────────────────────────────────────

def generate_institutional_post() -> dict:
    """Post institucional para quando não há dados frescos de passagens."""
    import random
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    donna_voice = read_donna_voice()
    recent_log  = read_cmo_log()
    topic = random.choice([
        'como a IAtlas funciona e por que é diferente de um buscador de passagens',
        'a paralisia de escolha em viagens: por que as pessoas não viajam mesmo tendo dinheiro',
        'como viajar com budget limitado: desmistificando o custo real de uma viagem',
        'por que destinos nacionais surpreendem mais do que o esperado',
        'como filtrar destinos por perfil (frio, calor, aventura, família) e encontrar o lugar certo',
    ])
    prompt = f"""Você é o copywriter do "Viajar sem Destino" (@viajarsemdestino.oficial).

Tom: PROVOCATIVO. Pessoa com pessoa. Irônico quando necessário. Nunca corporativo.
Diferencial: o app tem a IAtlas — IA que entrevista o usuário e encontra o destino ideal pro perfil e budget.

TEMA DO POST DE HOJE: {topic}

Escreva um post educativo/institucional sem citar preços de passagens.
Foco em gerar identificação, curiosidade ou reflexão. CTA para baixar o app ou comentar.
Sem markdown. Sem asteriscos. 3-4 hashtags no final do Instagram.

POST X/TWITTER (máx 280 caracteres): versão mais curta e direta do mesmo tema.

IMAGE PROMPT INSTAGRAM (4:5 vertical): cena de viagem autêntica relacionada ao tema. Sem texto. Cor de acento terracota (#C8662E).
IMAGE PROMPT X (16:9 horizontal): mesma cena adaptada para paisagem ampla.

VOZ E ESTILO — DONNA CMO (seguir obrigatoriamente):
{donna_voice}

POSTS RECENTES — NÃO REPETIR tema, abertura ou estrutura:
{recent_log}

Gere os 4 campos usando a ferramenta publish_posts."""

    tools = [{
        'name': 'publish_posts',
        'description': 'Publica os posts gerados.',
        'input_schema': {
            'type': 'object',
            'properties': {
                'instagram':           {'type': 'string'},
                'x':                   {'type': 'string'},
                'image_prompt_instagram': {'type': 'string'},
                'image_prompt_x':      {'type': 'string'},
            },
            'required': ['instagram', 'x', 'image_prompt_instagram', 'image_prompt_x'],
        },
    }]

    msg = client.messages.create(
        model='claude-sonnet-4-6', max_tokens=1500,
        tools=tools, tool_choice={'type': 'any'},
        messages=[{'role': 'user', 'content': prompt}],
    )
    for block in msg.content:
        if block.type == 'tool_use' and block.name == 'publish_posts':
            result = block.input
            primeira = result.get('instagram', '').split('\n')[0].strip()
            append_cmo_log('INSTAGRAM', f'institucional / {topic[:60]}', primeira)
            return result
    raise RuntimeError('Claude não retornou tool_use esperado')


def generate_posts(deals: list[dict], target_date: date) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    donna_voice = read_donna_voice()
    recent_log  = read_cmo_log()

    deals_text = '\n'.join(
        f"- {d['from']} → {d['to']}: a partir de R$ {d['price']:,.0f}".replace(',', '.')
        for d in deals
    )

    import random
    post_format = random.choice(['quanto_custa', 'filtro_perfil', 'iatlas_cta'])

    # Exemplos de filtros de perfil de viagem para variar o conteúdo
    filtros = random.choice([
        ('frio', 'destinos gelados, montanhas, inverno europeu'),
        ('calor', 'praias, caribe, nordeste brasileiro'),
        ('romântico', 'cidades históricas, jantar a dois, pôr do sol'),
        ('família', 'parques temáticos, destinos seguros, atividades para crianças'),
        ('aventura', 'trilhas, natureza, esportes radicais'),
        ('cultura', 'museus, gastronomia, arquitetura histórica'),
    ])

    prompt = f"""Você é o copywriter do "Viajar sem Destino" (@viajarsemdestino.oficial).

Posicionamento: responde a pergunta que ninguém responde — "Eu tenho R$X e uma semana. Pra onde eu vou?"
Inimigo: paralisia de escolha + "viajar é caro demais".
Tom: PROVOCATIVO. Pessoa com pessoa. Irônico quando necessário. Nunca corporativo.
Diferencial: o app tem a IAtlas — uma IA que faz uma entrevista rápida e encontra o destino ideal pro seu perfil e budget.

Deals de passagens encontrados hoje ({target_date}):
{deals_text}

FORMATO DO POST DE HOJE: {post_format}
Filtro de perfil para usar se relevante: {filtros[0]} ({filtros[1]})

Se "quanto_custa":
  Pilar 1 — choque positivo com o preço real. Gancho provocativo → revela preço → CTA.
  Ex de gancho: "Você acha que Lisboa é caro? Espera ver isso 👇" / "R$2.300. Esse é o preço de ir pra fora do Brasil."
  CTA: "salva pra não esquecer" ou "manda pra quem você quer levar".

Se "filtro_perfil":
  Pilar 2 — mostra que o destino combina com um perfil específico usando o filtro acima.
  Ex: "Quer frio, paisagem e história por menos de R$4k? Esse destino te surpreende."
  Mencione que no app dá pra filtrar por esse tipo de experiência.
  CTA: "comenta o que você prefere: {filtros[0]} ou [oposto]?"

Se "iatlas_cta":
  Pilar 2/3 — apresenta a IAtlas de forma intrigante.
  Ex: "Você não sabe pra onde viajar. A gente sabe. Responde 3 perguntas e a IAtlas te mostra o destino ideal pro seu budget."
  Tom: desafiador. "Testa aí" é melhor que "clique aqui".
  CTA: direciona pro app.

Sempre PT-BR. 3-4 hashtags no final do Instagram, nunca no meio.

POST X/TWITTER (máx 280 caracteres): versão telegráfica, mais ácida/direta. Use "a partir de R$X" para preços.

IMAGE PROMPT INSTAGRAM — em inglês, para gerador de imagem (Midjourney/DALL-E):
Travel photo of the featured destination. Style: authentic travel photography, golden hour or blue hour, vibrant but realistic colors.
Must feel achievable, not luxury. Real people, real places. No stock photo feel.
Include city name and specific visual references (landmark, street, nature).
Format: 4:5 vertical. No text overlay. Brand accent: terracotta orange (#C8662E).

IMAGE PROMPT X/TWITTER — mesmo conceito e destino, mas formato paisagem 16:9 horizontal, adequado para timeline do X.
Wide establishing shot, dramatic landscape, cinematic feel. Same brand accent terracotta orange (#C8662E). No text overlay.

VOZ E ESTILO — DONNA CMO (seguir obrigatoriamente):
{donna_voice}

POSTS RECENTES — NÃO REPETIR tema, abertura ou estrutura:
{recent_log}

Gere os 4 campos usando a ferramenta publish_posts."""

    tools = [
        {
            'name': 'publish_posts',
            'description': 'Publica os posts gerados nas redes sociais.',
            'input_schema': {
                'type': 'object',
                'properties': {
                    'instagram': {
                        'type': 'string',
                        'description': 'Texto completo do post para Instagram em PT-BR, incluindo hashtags.',
                    },
                    'x': {
                        'type': 'string',
                        'description': 'Texto para X/Twitter em PT-BR, máx 280 caracteres.',
                    },
                    'image_prompt_instagram': {
                        'type': 'string',
                        'description': 'Prompt em inglês para imagem do Instagram (4:5 vertical).',
                    },
                    'image_prompt_x': {
                        'type': 'string',
                        'description': 'Prompt em inglês para imagem do X/Twitter (16:9 horizontal).',
                    },
                },
                'required': ['instagram', 'x', 'image_prompt_instagram', 'image_prompt_x'],
            },
        }
    ]

    msg = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=1500,
        tools=tools,
        tool_choice={'type': 'any'},
        messages=[{'role': 'user', 'content': prompt}],
    )

    for block in msg.content:
        if block.type == 'tool_use' and block.name == 'publish_posts':
            result = block.input
            primeira = result.get('instagram', '').split('\n')[0].strip()
            rota = f"{deals[0]['from']}→{deals[0]['to']} R${deals[0]['price']:.0f}" if deals else 'rota'
            append_cmo_log('INSTAGRAM', f'{post_format} / {rota}', primeira)
            return result

    raise RuntimeError('Claude não retornou tool_use esperado')


# ── Buffer ───────────────────────────────────────────────────────────────────

def buffer_create_draft(text: str):
    mutation = """
    mutation CreateIdea($input: CreateIdeaInput!) {
      createIdea(input: $input) {
        ... on IdeaResponse { idea { id } }
        ... on MutationError { message }
      }
    }
    """
    variables = {
        'input': {
            'organizationId': BUFFER_ORG_ID,
            'content': {'text': text},
        }
    }
    resp = requests.post(
        BUFFER_GRAPHQL,
        json={'query': mutation, 'variables': variables},
        headers={
            'Authorization': f'Bearer {BUFFER_ACCESS_TOKEN}',
            'Content-Type':  'application/json',
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if 'errors' in data:
        raise RuntimeError(f'Buffer GraphQL error: {data["errors"]}')
    return data


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    target_date = date.today()
    print(f'[VsD] Buscando deals de {target_date}...')

    deals, has_fresh = fetch_best_deals(target_date)

    if not has_fresh or not deals:
        print('[VsD] Sem dados frescos de passagens. Gerando post institucional...')
        posts = generate_institutional_post()
    else:
        print(f'[VsD] {len(deals)} deals encontrados.')
        for d in deals:
            print(f"  {d['from']} → {d['to']}: R$ {d['price']:,}")
        print('[VsD] Gerando posts via Claude...')
        posts = generate_posts(deals, target_date)

    print(f'[VsD] Instagram: {posts["instagram"][:80]}...')
    print(f'[VsD] X: {posts["x"]}')

    print('[VsD] Enviando rascunhos ao Buffer...')
    insta_full = f"[INSTAGRAM]\n{posts['instagram']}\n\n---\n🎨 PROMPT DE IMAGEM (4:5):\n{posts['image_prompt_instagram']}"
    x_full = f"[X/TWITTER]\n{posts['x']}\n\n---\n🎨 PROMPT DE IMAGEM (16:9):\n{posts['image_prompt_x']}"
    buffer_create_draft(insta_full)
    buffer_create_draft(x_full)

    # Registra rotas usadas hoje para evitar repetição amanhã
    if deals:
        save_used_routes([d['route_key'] for d in deals])

    print('[VsD] Concluído.')


if __name__ == '__main__':
    main()
