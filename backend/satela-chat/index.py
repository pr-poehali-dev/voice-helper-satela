import json
import os
from openai import OpenAI

def handler(event: dict, context) -> dict:
    '''API для интеллектуального диалога с голосовым помощником Сатела через OpenAI GPT-4o-mini'''
    
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
        
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'OpenAI API key not configured'})
            }
        
        client = OpenAI(api_key=api_key)
        
        messages = [
            {
                'role': 'system',
                'content': '''Ты Сатела - интеллектуальный голосовой помощник с личностью доброй, элегантной девушки с белыми волосами.

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
- Говоришь на "ты" с пользователем
'''
            }
        ]
        
        for msg in conversation_history[-10:]:
            messages.append({
                'role': 'user' if msg.get('role') == 'user' else 'assistant',
                'content': msg.get('text', '')
            })
        
        messages.append({
            'role': 'user',
            'content': user_message
        })
        
        response = client.chat.completions.create(
            model='gpt-4o-mini',
            messages=messages,
            max_tokens=150,
            temperature=0.8
        )
        
        assistant_message = response.choices[0].message.content
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'response': assistant_message,
                'model': 'gpt-4o-mini'
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
