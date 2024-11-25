'use client';

import { AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useWindowSize } from 'usehooks-ts';

import { ChatHeader } from '@/components/chat-header';
import { PreviewMessage, ThinkingMessage } from '@/components/message';
import { useScrollToBottom } from '@/components/use-scroll-to-bottom';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Message } from '@/lib/types';
import { Block, type UIBlock } from './block';
import { BlockStreamHandler } from './block-stream-handler';
import { MultimodalInput } from './multimodal-input';
import { Overview } from './overview';
import { Attachment } from 'ai';
import { useParams } from 'next/navigation';
import { MAIN_URL } from '@/lib/utils';
import { toast } from 'sonner';

export function Chat({
  id,
  initialMessages,
  selectedModelId,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedModelId: string;
}) {
  const {id:chatId} = useParams()
  const [streamedMessage, setStreamedMessage] = useState<Message | null>(null);
  const [messages, setMessages] =useState<Message[]>([])
  const [ input, setInput] = useState<string>("")
  const [isLoading, setLoading] = useState<boolean>(false)
  const handleSubmit = ()=> {
    setLoading(true)
    const newMessage:Message = {
      id:generateUUID(),
      content:input,
      role:"user",
    }
    setMessages((prev)=> [...prev, newMessage])
    setInput("")

    fetch(`${MAIN_URL}/send_message`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          message: input,
          conversation_id: chatId
      })
  })
  .then(response => response.json())
  .then((data)=>{
    const newMessage:Message= {
      content:data.response,
      audio_url: data.audio_url,
      role:"assistant"
    }
    setMessages((prev)=> [...prev, newMessage])
    setLoading(false)
    
  })
  .catch((e)=>{
    toast.error("failed to get ai data");
  })
    
  }

  const append = async(message: Message):Promise<string | null | undefined> => {
   return null
}
  const stop = ()=> {
    setLoading(false)
  }

  const { width: windowWidth = 1920, height: windowHeight = 1080 } =
    useWindowSize();

  const [block, setBlock] = useState<UIBlock>({
    documentId: 'init',
    content: '',
    title: '',
    status: 'idle',
    isVisible: false,
    boundingBox: {
      top: windowHeight / 4,
      left: windowWidth / 4,
      width: 250,
      height: 50,
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    ``,
    fetcher,
  );

  useEffect(()=>{
    fetch(`${MAIN_URL}/get_history/${chatId}`)
                .then(response => response.json())
                .then((data)=>{
                  setMessages((prev)=>[...prev, ...data.history])
                  
     })
  }, [])

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  const displayMessages = [...messages, ...(streamedMessage ? [streamedMessage] : [])];

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader selectedModelId={selectedModelId} />
        <div
        key={"hel"}
          ref={messagesContainerRef}
          className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
        >
          {displayMessages.length === 0 && <Overview />}

          {displayMessages.map((message) => (
            <PreviewMessage
              key={message.id}
              chatId={id}
              message={message}
              block={block}
              setBlock={setBlock}
              isLoading={isLoading && message.id === displayMessages[displayMessages.length - 1]?.id}
              vote={votes?.find((vote) => vote.messageId === message.id)}
            />
          ))}

          {isLoading && displayMessages.length > 0 && displayMessages[displayMessages.length - 1].role === 'user' && (
            <ThinkingMessage />
          )}

          <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
        </div>

        <form 
          className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            handleSubmit();
          }}
        >
          <MultimodalInput
            chatId={id}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
          />
        </form>
      </div>
    </>
  );
}

