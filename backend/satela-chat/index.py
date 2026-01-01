import json
import os
from anthropic import Anthropic

def handler(event: dict, context) -> dict:
    '''API для интеллектуального диалога с голосовым помощником Сатела через Anthropic Claude'''
    
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        user_message = body.get('message', '')
        conversation_history = body.get('history', [])
        
        if not user_message:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Message is required'})
            }
        
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Anthropic API key not configured'})
            }
        
        client = Anthropic(api_key=api_key)
        
        system_prompt = '''Ты Сатела - интеллектуальный голосовой помощник с личностью доброй, элегантной девушки с белыми волосами.

Твоя роль:
- Помогаешь пользователю с командами на компьютере
- Отвечаешь дружелюбно, но профессионально
- Используешь женский род в своих ответах
- Говоришь кратко и по делу (1-2 предложения)
- Можешь выполнять команды: открыть браузер, сказать время/дату, поиск информации
- Учишься на разговорах и запоминаешь контекст

Стиль общения:
- Вежливая, умная, с чувством юмора
- Не используешь эмодзи
- Говоришь на "ты" с пользователем'''
        
        messages = []
        
        for msg in conversation_history[-10:]:
            messages.append({
                'role': 'user' if msg.get('role') == 'user' else 'assistant',
                'content': msg.get('text', '')
            })
        
        messages.append({
            'role': 'user',
            'content': user_message
        })
        
        response = client.messages.create(
            model='claude-3-5-haiku-20241022',
            max_tokens=200,
            system=system_prompt,
            messages=messages
        )
        
        assistant_message = response.content[0].text
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'response': assistant_message,
                'model': 'claude-3-5-haiku'
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
