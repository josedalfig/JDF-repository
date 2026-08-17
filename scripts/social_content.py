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

import random as _random

ROUTES_HISTORY_FILE = os.path.expanduser('~/.vsd_recent_routes.json')

CMO_LOG_DIR   = os.path.expanduser('~/Documents/Pessoal/Claude Cowork/empresa-solo/CMO')
CMO_PROJECT   = 'vsd'
CADENCIA_FILE = os.path.expanduser('~/.social_cadencia.json')

# ── Image moods (embutido; CI não acessa ~/Documents) ────────────────────────
# Fonte: CMO/imagem-moods-vsd-zeebra.md § VsD (Cameron→Donna 08/07)
_MOODS = [
    ('costa_praia',
     'pessoa real olhando o mar numa orla ao amanhecer azul, areia clara, tons frios, foto documental, sem filtro quente'),
    ('noite_cidade',
     'rua movimentada à noite, luzes de letreiro, reflexos no chão molhado, pessoa real caminhando, atmosfera urbana'),
    ('mercado_comida',
     'banca de mercado local cheia de cor, especiarias e frutas, luz difusa, mãos escolhendo produto, close documental'),
    ('estrada_paisagem',
     'estrada vazia cortando paisagem verde, céu amplo, pessoa pequena no enquadramento, luz de dia, sensação de distância'),
    ('chuva_clima',
     'cidade na chuva, reflexos coloridos no asfalto, guarda-chuva, tom cinza-azulado, foto real melancólica'),
    ('interior_arquitetura',
     'interior de café aconchegante, luz de janela, texturas de madeira e tijolo, pessoa lendo, foto real intimista'),
]
_MOOD_NAMES = [m[0] for m in _MOODS]

# terracota: ~metade na cena, ~metade só no overlay
_TERRACOTA_SCENE  = 'Include a real terracotta-orange (#C8662E) element in the scene (wall, door, awning, tile, or clothing) — terracotta ≤15% of frame area.'
_TERRACOTA_OVERLAY = 'No terracotta in the scene itself; terracotta (#C8662E) lives only in the UI overlay (headline, tag, logo).'


def _pick_mood() -> tuple[str, str, bool]:
    """Returns (mood_name, seed, terracota_in_scene).
    Avoids repeating the last mood used (read from CADENCIA_FILE)."""
    try:
        with open(CADENCIA_FILE) as f:
            data = json.load(f)
        last = data.get(f'{CMO_PROJECT}_last_mood', '')
    except (OSError, json.JSONDecodeError):
        last = ''
    candidates = [m for m in _MOODS if m[0] != last] or _MOODS
    name, seed = _random.choice(candidates)
    terracota_scene = _random.random() < 0.5
    return name, seed, terracota_scene


def _save_mood(mood_name: str):
    try:
        with open(CADENCIA_FILE) as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        data = {}
    data[f'{CMO_PROJECT}_last_mood'] = mood_name
    with open(CADENCIA_FILE, 'w') as f:
        json.dump(data, f)
BUFFER_DELIM  = '\n\n---- PROMPT IMAGEM · apagar antes de publicar ----\n'


def get_days_since_last_post() -> int:
    try:
        with open(CADENCIA_FILE) as f:
            data = json.load(f)
        last = date.fromisoformat(data.get(CMO_PROJECT, '2000-01-01'))
        return (date.today() - last).days
    except (OSError, json.JSONDecodeError, ValueError):
        return 999


def update_last_post_date():
    try:
        with open(CADENCIA_FILE) as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        data = {}
    data[CMO_PROJECT] = str(date.today())
    with open(CADENCIA_FILE, 'w') as f:
        json.dump(data, f)


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
    try:
        os.makedirs(CMO_LOG_DIR, exist_ok=True)
        log_path = os.path.join(CMO_LOG_DIR, f'{CMO_PROJECT}-log.md')
        if not os.path.exists(log_path):
            with open(log_path, 'w') as f:
                f.write(f'# LOG — Social {CMO_PROJECT.upper()}\n\nFormato: `[DATA] [REDE] tema — abertura`\n\n---\n\n')
        with open(log_path, 'a') as f:
            f.write(f'[{date.today()}] [{rede}] {tema} — {primeira_linha[:120]}\n')
    except Exception as e:
        print(f'[warn] append_cmo_log falhou (não-fatal): {e}')

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
        timeout=45,
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
    mood_name, mood_seed, terra_scene = _pick_mood()
    terra_rule = _TERRACOTA_SCENE if terra_scene else _TERRACOTA_OVERLAY
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

IMAGE PROMPT INSTAGRAM (4:5 vertical) — em inglês, para Midjourney/DALL-E:
Mood: {mood_name}. Scene seed: "{mood_seed}". Real travel photo, real people, real places. No stock, no luxury. Leave room for Fraunces overlay (price tag, logo). Format: 4:5 vertical. No text overlay. {terra_rule}

IMAGE PROMPT X (16:9 horizontal): same mood and scene adapted to wide landscape. Cinematic, dramatic sky or foreground. {terra_rule}

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
            _save_mood(mood_name)
            return result
    raise RuntimeError('Claude não retornou tool_use esperado')


def generate_posts(deals: list[dict], target_date: date) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    donna_voice = read_donna_voice()
    recent_log  = read_cmo_log()

    _DOMESTIC_IATAS = {
        'GRU','CGH','SDU','GIG','BSB','SSA','FOR','REC','CWB','POA',
        'FLN','NAT','BEL','MAN','MCZ','THE','JPA','AJU','VIX','PMW',
    }
    def _is_domestic(d):
        return d.get('from_iata', d['from'][:3].upper()) in _DOMESTIC_IATAS and \
               d.get('to_iata',   d['to'][:3].upper())   in _DOMESTIC_IATAS

    deals_text = '\n'.join(
        f"- [{('NAC' if _is_domestic(d) else 'INTL')}] {d['from']} → {d['to']}: a partir de R$ {d['price']:,.0f}".replace(',', '.')
        for d in deals
    )

    import random
    post_format = random.choices(
        ['quanto_custa', 'me_da_um_budget', 'ninguem_te_conta', 'foi_real'],
        weights=[4, 3, 2, 1],
        k=1
    )[0]
    mood_name, mood_seed, terra_scene = _pick_mood()
    terra_rule = _TERRACOTA_SCENE if terra_scene else _TERRACOTA_OVERLAY

    prompt = f"""Você é o copywriter do "Viajar sem Destino" (@viajarsemdestino.oficial).

Posicionamento: responde a pergunta que ninguém responde — "Eu tenho R$X e uma semana. Pra onde eu vou?"
Inimigo: paralisia de escolha + "viajar é caro demais".
Tom: PROVOCATIVO. Pessoa com pessoa. Irônico quando necessário. Nunca corporativo.
Diferencial: o app tem a IAtlas — uma IA que faz uma entrevista rápida e encontra o destino ideal pro seu perfil e budget.

Deals de passagens encontrados hoje ({target_date}):
{deals_text}

REGRAS DE COPY (aplicar obrigatoriamente):

Tom:
- Seco e provocativo, com ponto de vista — não bot de alerta de promoção.
- Uma ideia por post. Frases curtas.
- Varie o gancho de abertura. Rotacione entre:
  • contraste temporal: "Semana passada, R$ 900. Hoje, R$ 319."
  • cena/sensação: "A cordilheira aparece na janela antes de você perceber o quanto gastou."
  • pergunta: "R$ 600 e três dias. Pra onde você vai primeiro?"
  • insight seco: "Voo de terça sai mais barato. Só isso."
- Proibido fechar com comparação de gasto ("menos que um jantar") — máx. 1 a cada 4 posts.
- Sem exclamação em rajada. Sem "imperdível/corre/última chance".

Anti-repetição:
- "Você tem R$__ e uma semana" → máx. 1 a cada 5 posts.
- "R$ X. [Origem] pra [Destino]." como abertura → máx. 2 posts seguidos.
- "Não é engano. Não é..." → aposentado, não usar.
- Varie o conector: "pra", "→", "rumo a" — não fixe um só.

Nacional × Internacional (para pilares quanto_custa e me_da_um_budget):
- Alvo: ~60% nacional / 40% internacional por bloco de 5 ofertas.
- Nunca mais de 2 nacionais seguidas.
- Ao menos 1 internacional a cada 3 ofertas.
- LATAM próximo (Buenos Aires, Santiago, Montevidéu, Assunção) conta como internacional.
- Os deals acima estão marcados [NAC] ou [INTL] — use essa informação para escolher qual destacar.

FORMATO DO POST DE HOJE: {post_format}

Se "quanto_custa":
  Pilar 1 — choque positivo com o preço real. Gancho provocativo → revela preço → CTA.
  Ex de gancho: "Você acha que Lisboa é caro? Espera ver isso." / "R$2.300. Esse é o preço de ir pra fora do Brasil."
  Use "a partir de R$ X" nos preços. Mostre 1 ou 2 rotas dos deals acima.
  CTA opcional: "salva pra não esquecer" ou "manda pra quem você quer levar".

Se "me_da_um_budget":
  Pilar 2 — "tenho R$X e X dias, pra onde eu vou?" Simula a pergunta real do usuário.
  Usa os deals disponíveis como resposta concreta: com esse budget, dá pra ir pra X ou Y.
  Inclui menção ao perfil da viagem (frio, cultura, praia, aventura, etc.) de forma natural.
  Mencione que no app a IAtlas faz exatamente isso — cruza budget + perfil e aponta o destino.
  CTA opcional: "comenta qual é o seu budget" ou "testa aí no app".

Se "ninguem_te_conta":
  Pilar 3 — dado, verdade ou comportamento que o viajante médio não sabe (mas deveria).
  Ex: "Os preços de passagem caem nas quartas. A maioria compra no sábado e paga 40% a mais."
  Ex: "GRU pra Lisboa em outubro custa R$2.200. Em julho, R$5.800. Mesmo assento, mesmo avião."
  Use os dados dos deals como evidência, não como protagonista do post.
  Tom: revelador, sem sensacionalismo. Fato seco + implicação prática.
  CTA opcional: "salva isso" ou "passa pra frente".

Se "foi_real":
  Pilar 4 — relato/experiência real de viajante usando os deals disponíveis.
  Tom: narrativo, primeira pessoa implícita, como se um amigo contasse.
  Mostre o destino da rota mais barata como vivência concreta: o que se faz lá, como é chegar, o que surpreende.
  Ex: "Fui pra Lisboa com R$2.800 tudo incluso. Isso não é viagem de rico. É questão de saber quando comprar."
  Preço como dado de contexto, não como argumento principal — o argumento é a experiência.
  CTA opcional: "comenta se já foi" ou "manda pra quem ainda acha que é caro demais".

Qualquer que seja o formato, o CTA é OPCIONAL e deve ser natural — não force se o post já fecha bem sem ele.
A IAtlas pode ser mencionada como reforço em qualquer formato, mas nunca como tema principal (exceto me_da_um_budget).

Sempre PT-BR. 3-4 hashtags no final do Instagram, nunca no meio.

POST X/TWITTER (máx 280 caracteres): versão telegráfica, mais ácida/direta. Use "a partir de R$X" para preços.

IMAGE PROMPT INSTAGRAM (4:5 vertical) — em inglês, para Midjourney/DALL-E:
Mood: {mood_name}. Scene seed: "{mood_seed}". Real travel photo set in or near the destination above. Real people, real places. No stock, no luxury. Include city name and 1-2 specific visual references (landmark, street, food, nature). Leave room for Fraunces overlay. Format: 4:5 vertical. No text overlay. {terra_rule}

IMAGE PROMPT X/TWITTER (16:9 horizontal): same mood and destination, wide establishing shot. Cinematic, dramatic sky or foreground. No text overlay. {terra_rule}

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
            _save_mood(mood_name)
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
        timeout=45,
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
        days_silent = get_days_since_last_post()
        if days_silent < 2:
            print(f'[VsD] Sem dados frescos. {days_silent}d sem post — pulando dia.')
            sys.exit(0)
        print(f'[VsD] {days_silent}d sem post. Forçando institucional.')
        posts = generate_institutional_post()
        buffer_create_draft(f"[INSTAGRAM]\n{posts['instagram']}{BUFFER_DELIM}{posts['image_prompt_instagram']}")
        buffer_create_draft(f"[X/TWITTER]\n{posts['x']}{BUFFER_DELIM}{posts['image_prompt_x']}")
        update_last_post_date()
        print('[VsD] Concluído (institucional).')
        sys.exit(0)

    print(f'[VsD] {len(deals)} deals encontrados.')
    for d in deals:
        print(f"  {d['from']} → {d['to']}: R$ {d['price']:,}")
    print('[VsD] Gerando posts via Claude...')
    posts = generate_posts(deals, target_date)

    print(f'[VsD] Instagram: {posts["instagram"][:80]}...')
    print(f'[VsD] X: {posts["x"]}')

    print('[VsD] Enviando rascunhos ao Buffer...')
    buffer_create_draft(f"[INSTAGRAM]\n{posts['instagram']}{BUFFER_DELIM}{posts['image_prompt_instagram']}")
    buffer_create_draft(f"[X/TWITTER]\n{posts['x']}{BUFFER_DELIM}{posts['image_prompt_x']}")
    update_last_post_date()

    # Registra rotas usadas hoje para evitar repetição amanhã
    if deals:
        save_used_routes([d['route_key'] for d in deals])

    print('[VsD] Concluído.')


if __name__ == '__main__':
    main()
