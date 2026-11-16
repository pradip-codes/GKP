import React, { Suspense, lazy } from 'react';

const ChatbotModule = lazy(() => import('../../modules/chatbot/Chatbot'));

export default function Chatbot(props) {
  return (
    <Suspense fallback={null}>
      <ChatbotModule {...props} />
    </Suspense>
  );
}
