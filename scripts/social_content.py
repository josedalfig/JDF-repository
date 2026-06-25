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

SUPABASE_URL      = 'https://fdpgeacfeyzaocsqszyw.supabase.co/rest/v1'
SUPABASE_ANON_KEY = os.environ['VSD_SUPABASE_ANON_KEY']
ANTHROPIC_API_KEY = os.environ['ANTHROPIC_API_KEY']
BUFFER_ACCESS_TOKEN  = os.environ['BUFFER_ACCESS_TOKEN_VSD']
BUFFER_CHANNEL_INSTA = os.environ['BUFFER_PROFILE_ID_INSTAGRAM_VSD']
BUFFER_CHANNEL_X     = os.environ['BUFFER_PROFILE_ID_X_VSD']
BUFFER_ORG_ID        = os.environ['BUFFER_ORG_ID_VSD']
BUFFER_GRAPHQL       = 'https://api.buffer.com/graphql'

# IATA → nome legível (expande conforme necessário)
IATA_NAMES = {
    'POA': 'Porto Alegre', 'GRU': 'São Paulo', 'GIG': 'Rio de Janeiro',
    'BSB': 'Brasília',     'SSA': 'Salvador',   'FOR': 'Fortaleza',
    'REC': 'Recife',       'MAN': 'Manaus',     'BEL': 'Belém',
    'CWB': 'Curitiba',     'FLN': 'Florianópolis',
    'LIS': 'Lisboa',       'OPO': 'Porto',      'MAD': 'Madrid',
    'BCN': 'Barcelona',    'MIA': 'Miami',       'JFK': 'Nova York',
    'MCO': 'Orlando',      'CDG': 'Paris',       'LHR': 'Londres',
    'FCO': 'Roma',         'AMS': 'Amsterdã',    'DXB': 'Dubai',
    'AKL': 'Auckland',     'NRT': 'Tóquio',      'BKK': 'Bangkok',
    'AJU': 'Aracaju',      'CGB': 'Cuiabá',      'NAT': 'Natal',
    'MCZ': 'Maceió',       'VCP': 'Campinas',    'SDU': 'Rio (Santos Dumont)',
}


def iata_name(code: str) -> str:
    return IATA_NAMES.get(code, code)


# ── Data fetching ────────────────────────────────────────────────────────────

def fetch_best_deals(target_date: date) -> list[dict]:
    """Rotas com menor preço registradas hoje, excluindo origens domésticas óbvias."""
    since = f'{target_date}T00:00:00+00:00'
    params = {
        'select':    'origin_iata,dest_iata,price,fetched_at',
        'fetched_at': f'gte.{since}',
        'order':     'price.asc',
        'limit':     '5',
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
    return [
        {
            'from':  iata_name(r['origin_iata']),
            'to':    iata_name(r['dest_iata']),
            'price': r['price'],
        }
        for r in rows
    ]


# ── Post generation ──────────────────────────────────────────────────────────

def generate_posts(deals: list[dict], target_date: date) -> dict:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

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
            return block.input

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

    deals = fetch_best_deals(target_date)
    if not deals:
        # Tenta ontem se hoje ainda não tiver dados
        target_date = date.today() - timedelta(days=1)
        print(f'[VsD] Sem dados hoje. Tentando {target_date}...')
        deals = fetch_best_deals(target_date)

    if not deals:
        print('[VsD] Sem dados suficientes. Abortando.')
        sys.exit(0)

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

    print('[VsD] Concluído.')


if __name__ == '__main__':
    main()
