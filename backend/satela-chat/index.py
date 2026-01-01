import json
import os
import requests

def handler(event: dict, context) -> dict:
    '''API для интеллектуального диалога с голосовым помощником Сатела через Hugging Face'''
    
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
        
        api_key = os.environ.get('HUGGINGFACE_API_KEY')
        if not api_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Hugging Face API key not configured'})
            }
        
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
        
        conversation_text = system_prompt + "\n\n"
        
        for msg in conversation_history[-6:]:
            role = "Пользователь" if msg.get('role') == 'user' else "Сатела"
            conversation_text += f"{role}: {msg.get('text', '')}\n"
        
        conversation_text += f"Пользователь: {user_message}\nСатела:"
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'inputs': conversation_text,
            'parameters': {
                'max_new_tokens': 150,
                'temperature': 0.7,
                'top_p': 0.9,
                'return_full_text': False
            }
        }
        
        response = requests.post(
            'https://api-inference.huggingface.co/models/google/gemma-2-2b-it',
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code != 200:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': f'Hugging Face error: {response.text}'})
            }
        
        result = response.json()
        
        if isinstance(result, list) and len(result) > 0:
            assistant_message = result[0].get('generated_text', '').strip()
        elif isinstance(result, dict):
            assistant_message = result.get('generated_text', '').strip()
        else:
            assistant_message = 'Извините, не могу обработать ответ'
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'response': assistant_message,
                'model': 'google/gemma-2-2b-it'
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
