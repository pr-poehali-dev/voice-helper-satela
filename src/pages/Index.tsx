import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

type CharacterPose = 'standing' | 'sitting' | 'thinking' | 'waving';
type ConversationMessage = {
  role: 'user' | 'satela';
  text: string;
  timestamp: Date;
};

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentPose, setCurrentPose] = useState<CharacterPose>('standing');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activationWord, setActivationWord] = useState('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');

        if (transcript.toLowerCase().includes('сатела')) {
          setActivationWord(transcript);
          handleVoiceCommand(transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Ошибка',
        description: 'Распознавание речи не поддерживается браузером',
        variant: 'destructive',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast({
        title: 'Слушаю',
        description: 'Скажите "Сатела" для активации',
      });
    }
  };

  const handleVoiceCommand = async (command: string) => {
    setIsProcessing(true);
    setCurrentPose('thinking');

    const lowerCommand = command.toLowerCase();
    let response = '';
    let shouldUseAI = true;

    if (lowerCommand.includes('браузер')) {
      response = 'Открываю браузер для вас';
      setTimeout(() => window.open('https://google.com', '_blank'), 1000);
      shouldUseAI = false;
    } else if (lowerCommand.includes('время') || lowerCommand.includes('который час')) {
      const now = new Date();
      response = `Сейчас ${now.toLocaleTimeString('ru-RU')}`;
      shouldUseAI = false;
    } else if (lowerCommand.includes('дата')) {
      const now = new Date();
      response = `Сегодня ${now.toLocaleDateString('ru-RU')}`;
      shouldUseAI = false;
    }

    if (shouldUseAI) {
      try {
        const apiResponse = await fetch('https://functions.poehali.dev/560d1b60-4538-4a47-a1a9-41c9b31d7427', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: command,
            history: conversation
          })
        });

        const data = await apiResponse.json();
        
        if (data.response) {
          response = data.response;
          
          if (lowerCommand.includes('привет') || lowerCommand.includes('здравствуй')) {
            setCurrentPose('waving');
          } else if (lowerCommand.includes('спасибо')) {
            setCurrentPose('waving');
          }
        } else {
          response = data.error || 'Извините, произошла ошибка';
        }
      } catch (error) {
        console.error('AI Error:', error);
        response = 'Не могу подключиться к нейросети. Проверьте настройки.';
      }
    }

    setConversation(prev => [
      ...prev,
      { role: 'user', text: command, timestamp: new Date() },
      { role: 'satela', text: response, timestamp: new Date() }
    ]);

    speak(response);
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentPose('standing');
    }, 1000);
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    handleVoiceCommand(`Сатела ${inputText}`);
    setInputText('');
  };

  const getPoseDescription = () => {
    switch (currentPose) {
      case 'standing': return 'Стоит';
      case 'sitting': return 'Сидит';
      case 'thinking': return 'Думает';
      case 'waving': return 'Машет рукой';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl font-heading font-bold text-primary mb-2">Сатела</h1>
          <p className="text-muted-foreground text-lg">Ваш интеллектуальный голосовой помощник</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 relative overflow-hidden animate-scale-in">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/20 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-heading font-semibold">Персонаж</h2>
                <Badge variant="secondary" className="animate-pulse-glow">
                  {getPoseDescription()}
                </Badge>
              </div>

              <div className="relative h-[400px] flex items-center justify-center bg-gradient-to-b from-transparent via-primary/5 to-transparent rounded-lg">
                <div className={`transition-all duration-500 ${isSpeaking ? 'animate-breathe' : 'animate-float'}`}>
                  <img
                    src="https://cdn.poehali.dev/projects/a53d79dd-729d-429f-a6b7-3bee94ffdb20/files/f19e22fd-4e95-4d4d-b758-7e235ee979b4.jpg"
                    alt="Сатела"
                    className="w-64 h-auto object-contain drop-shadow-2xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4">
                <Button
                  variant={currentPose === 'standing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPose('standing')}
                >
                  <Icon name="User" size={16} />
                </Button>
                <Button
                  variant={currentPose === 'sitting' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPose('sitting')}
                >
                  <Icon name="Armchair" size={16} />
                </Button>
                <Button
                  variant={currentPose === 'thinking' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPose('thinking')}
                >
                  <Icon name="Brain" size={16} />
                </Button>
                <Button
                  variant={currentPose === 'waving' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPose('waving')}
                >
                  <Icon name="Hand" size={16} />
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-6 animate-fade-in">
            <Card className="p-6">
              <h2 className="text-2xl font-heading font-semibold mb-4">Управление</h2>
              
              <div className="flex gap-4 mb-6">
                <Button
                  onClick={toggleListening}
                  className={`flex-1 ${isListening ? 'animate-pulse-glow' : ''}`}
                  variant={isListening ? 'default' : 'outline'}
                  size="lg"
                >
                  <Icon name={isListening ? 'MicOff' : 'Mic'} size={20} className="mr-2" />
                  {isListening ? 'Остановить' : 'Начать слушать'}
                </Button>
              </div>

              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Или введите команду текстом..."
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Icon name="Send" size={20} />
                </Button>
              </form>

              {isProcessing && (
                <div className="mt-4 p-3 bg-muted rounded-lg flex items-center gap-2 animate-scale-in">
                  <Icon name="Loader2" size={20} className="animate-spin" />
                  <span className="text-sm">Обрабатываю запрос...</span>
                </div>
              )}
            </Card>

            <Card className="p-6 h-[400px] flex flex-col">
              <h2 className="text-2xl font-heading font-semibold mb-4">Диалог</h2>
              
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {conversation.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Icon name="MessageSquare" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Начните диалог с Сателой</p>
                    <p className="text-sm mt-1">Скажите "Сатела" и вашу команду</p>
                  </div>
                ) : (
                  conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg animate-scale-in ${
                        msg.role === 'user'
                          ? 'bg-primary/20 ml-8'
                          : 'bg-accent/50 mr-8'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon
                          name={msg.role === 'user' ? 'User' : 'Bot'}
                          size={16}
                        />
                        <span className="text-xs font-medium">
                          {msg.role === 'user' ? 'Вы' : 'Сатела'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString('ru-RU')}
                        </span>
                      </div>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        <Card className="mt-6 p-6 animate-fade-in">
          <h3 className="text-xl font-heading font-semibold mb-4">Примеры команд</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: 'Globe', text: 'Сатела, открой браузер' },
              { icon: 'Clock', text: 'Сатела, который час?' },
              { icon: 'Calendar', text: 'Сатела, какая сегодня дата?' },
              { icon: 'MessageCircle', text: 'Сатела, привет!' }
            ].map((cmd, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="h-auto p-4 flex-col items-start text-left"
                onClick={() => handleVoiceCommand(cmd.text)}
              >
                <Icon name={cmd.icon as any} size={24} className="mb-2 text-primary" />
                <span className="text-xs">{cmd.text}</span>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;