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
        f"- {d['from']} → {d['to']}: R$ {d['price']:,.0f}".replace(',', '.')
        for d in deals
    )

    prompt = f"""Você é o copywriter do "Viajar sem Destino" (@viajarsemdestino.oficial).

Posicionamento da marca: responde a pergunta que ninguém mais responde — "Eu tenho R$X e uma semana. Pra onde eu vou?"
Inimigo declarado: a paralisia de escolha + a ideia de que viajar é caro demais.
Tom: pessoa falando com pessoa. Nunca corporativo. Nunca "pacote dos sonhos".

Deals de passagens encontrados hoje ({target_date}):
{deals_text}

Pilar: "Quanto custa?" — choque positivo. Revelar o preço REAL de um destino que parece caro.
Mecânica: gancho de surpresa → revela o preço → CTA (salva / manda pro amigo).

Gere DOIS posts em PT-BR:

POST 1 — INSTAGRAM (máx 150 palavras, 3-4 hashtags relevantes):
- Primeira linha é o gancho: algo que faça parar de rolar (ex: "Esse lugar parece caríssimo. Custa R$1.890 👇")
- Escolhe o deal com melhor relação impacto/preço (destino conhecido + preço surpreendente)
- Termina com CTA: "salva pra não perder" ou "manda pra quem você quer levar"
- Hashtags no final, não no meio do texto

POST 2 — X/TWITTER (máx 280 caracteres):
- Versão telegráfica do mesmo gancho. Emoji com moderação.

IMAGE PROMPT — em inglês, para gerador de imagem (Midjourney/DALL-E):
Foto inspiradora do destino escolhido no post. Estilo: travel photography, golden hour, cores vibrantes.
Deve transmitir "esse lugar é possível pra mim". Evitar imagens de luxo exagerado.
Inclua o nome da cidade/destino e referências visuais específicas do lugar.
Formato: 4:5 vertical (Instagram). Sem texto sobreposto na imagem.
Identidade visual da marca: terracota laranja (#C8662E), sensação de descoberta.

Responda APENAS com JSON válido neste formato:
{{"instagram": "<texto>", "x": "<texto>", "image_prompt": "<prompt em inglês>"}}"""

    msg = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=600,
        messages=[{'role': 'user', 'content': prompt}],
    )

    text = msg.content[0].text.strip()
    if text.startswith('```'):
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]
    return json.loads(text)


# ── Buffer ───────────────────────────────────────────────────────────────────

def buffer_create_draft(channel_id: str, text: str):
    mutation = """
    mutation CreateIdea($input: IdeaInput!) {
      createIdea(input: $input) {
        idea { id }
      }
    }
    """
    variables = {
        'input': {
            'content': {'text': text},
            'channelIds': [channel_id],
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
    insta_full = f"{posts['instagram']}\n\n---\n🎨 PROMPT DE IMAGEM:\n{posts['image_prompt']}"
    buffer_create_draft(BUFFER_CHANNEL_INSTA, insta_full)
    buffer_create_draft(BUFFER_CHANNEL_X,     posts['x'])

    print('[VsD] Concluído.')


if __name__ == '__main__':
    main()
